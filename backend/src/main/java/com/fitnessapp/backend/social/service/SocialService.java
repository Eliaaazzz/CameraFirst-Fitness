package com.fitnessapp.backend.social.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.fitnessapp.backend.social.dto.SocialDtos.FeedItemDto;
import com.fitnessapp.backend.social.dto.SocialDtos.FeedPage;
import com.fitnessapp.backend.social.dto.SocialDtos.FollowResponse;
import com.fitnessapp.backend.social.dto.SocialDtos.NotificationDto;
import com.fitnessapp.backend.social.dto.SocialDtos.NotificationsResponse;
import com.fitnessapp.backend.social.dto.SocialDtos.UserRef;
import com.fitnessapp.backend.social.entity.FeedItem;
import com.fitnessapp.backend.social.entity.Follow;
import com.fitnessapp.backend.social.entity.Notification;
import com.fitnessapp.backend.social.repository.FeedItemRepository;
import com.fitnessapp.backend.social.repository.FollowRepository;
import com.fitnessapp.backend.social.repository.NotificationRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

/**
 * The social graph: follow/unfollow, follower/following lists, a fan-out-on-write activity feed with
 * keyset pagination, and notifications. Activity fan-out respects each actor's privacy flag and emits
 * a Redis event for realtime delivery via the Go gateway.
 */
@Slf4j
@Service
public class SocialService {

    public static final String VERB_LOGGED_MEAL = "LOGGED_MEAL";

    private static final int DEFAULT_FEED_LIMIT = 20;
    private static final int MAX_FEED_LIMIT = 50;
    private static final int MAX_LIST_LIMIT = 100;

    private final FollowRepository followRepository;
    private final FeedItemRepository feedItemRepository;
    private final NotificationRepository notificationRepository;
    private final UserProfileRepository userProfileRepository;
    private final SocialEventPublisher eventPublisher;
    private final MeterRegistry meterRegistry;

    public SocialService(FollowRepository followRepository, FeedItemRepository feedItemRepository,
                         NotificationRepository notificationRepository, UserProfileRepository userProfileRepository,
                         SocialEventPublisher eventPublisher, MeterRegistry meterRegistry) {
        this.followRepository = followRepository;
        this.feedItemRepository = feedItemRepository;
        this.notificationRepository = notificationRepository;
        this.userProfileRepository = userProfileRepository;
        this.eventPublisher = eventPublisher;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public FollowResponse follow(UUID followerId, UUID followeeId) {
        if (followerId.equals(followeeId)) {
            throw new IllegalArgumentException("You cannot follow yourself");
        }
        boolean created = followRepository.insertIgnoreConflict(UUID.randomUUID(), followerId, followeeId) > 0;
        if (created) {
            notificationRepository.save(Notification.builder()
                    .id(UUID.randomUUID()).userId(followeeId).type(Notification.TYPE_NEW_FOLLOWER)
                    .actorId(followerId).message("started following you").read(false).createdAt(now()).build());
            publishAfterCommit(Map.of(
                    "type", "notification", "notificationType", Notification.TYPE_NEW_FOLLOWER,
                    "userId", followeeId.toString(), "actorId", followerId.toString()));
            meterRegistry.counter("aura.social.follow").increment();
        }
        return followStatus(followerId, followeeId, true);
    }

    @Transactional
    public FollowResponse unfollow(UUID followerId, UUID followeeId) {
        followRepository.deleteByFollowerIdAndFolloweeId(followerId, followeeId);
        meterRegistry.counter("aura.social.unfollow").increment();
        return followStatus(followerId, followeeId, false);
    }

    @Transactional(readOnly = true)
    public List<UserRef> listFollowing(UUID userId) {
        return followRepository.findByFollowerIdOrderByCreatedAtDesc(userId).stream()
                .limit(MAX_LIST_LIMIT)
                .map(f -> new UserRef(f.getFolloweeId(), f.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserRef> listFollowers(UUID userId) {
        return followRepository.findByFolloweeIdOrderByCreatedAtDesc(userId).stream()
                .limit(MAX_LIST_LIMIT)
                .map(f -> new UserRef(f.getFollowerId(), f.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public FeedPage getFeed(UUID ownerId, String beforeCursor, Integer limit) {
        int n = clamp(limit == null ? DEFAULT_FEED_LIMIT : limit, 1, MAX_FEED_LIMIT);
        List<FeedItem> items;
        if (beforeCursor == null || beforeCursor.isBlank()) {
            items = feedItemRepository.findByOwnerIdOrderByCreatedAtDescIdDesc(ownerId, Limit.of(n));
        } else {
            Cursor cursor = decodeCursor(beforeCursor);
            items = feedItemRepository.findOwnerFeedBefore(ownerId, cursor.ts(), cursor.id(), PageRequest.of(0, n));
        }
        List<FeedItemDto> dtos = items.stream()
                .map(i -> new FeedItemDto(i.getId(), i.getActorId(), i.getVerb(), i.getObjectType(),
                        i.getObjectId(), i.getSummary(), i.getCreatedAt()))
                .toList();
        String nextCursor = null;
        if (items.size() == n) {
            FeedItem last = items.get(items.size() - 1);
            nextCursor = encodeCursor(last.getCreatedAt(), last.getId());
        }
        return new FeedPage(dtos, nextCursor);
    }

    /**
     * Fan-out-on-write: append an activity to every follower's feed (subject to the actor's privacy
     * flag) and emit a realtime event. Best-effort and isolated — never throws into the caller's path.
     */
    @Transactional
    public void publishActivity(UUID actorId, String verb, String objectType, String objectId, String summary) {
        boolean share = userProfileRepository.findByUserId(actorId)
                .map(p -> p.isShareActivity()).orElse(true);
        if (!share) {
            return;
        }
        List<UUID> followers = followRepository.findFollowerIds(actorId);
        if (followers.isEmpty()) {
            return;
        }
        OffsetDateTime now = now();
        List<FeedItem> rows = followers.stream()
                .map(followerId -> FeedItem.builder()
                        .id(UUID.randomUUID()).ownerId(followerId).actorId(actorId)
                        .verb(verb).objectType(objectType).objectId(objectId).summary(summary)
                        .createdAt(now).build())
                .toList();
        feedItemRepository.saveAll(rows);
        publishAfterCommit(Map.of(
                "type", "feed", "actorId", actorId.toString(), "verb", verb,
                "summary", summary == null ? "" : summary,
                "recipients", followers.stream().map(UUID::toString).toList()));
        meterRegistry.counter("aura.social.feed.fanout").increment(rows.size());
    }

    @Transactional(readOnly = true)
    public NotificationsResponse getNotifications(UUID userId, Integer limit) {
        int n = clamp(limit == null ? DEFAULT_FEED_LIMIT : limit, 1, MAX_FEED_LIMIT);
        List<NotificationDto> items = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, Limit.of(n)).stream()
                .map(no -> new NotificationDto(no.getId(), no.getType(), no.getActorId(),
                        no.getMessage(), no.isRead(), no.getCreatedAt()))
                .toList();
        return new NotificationsResponse(items, notificationRepository.countByUserIdAndReadFalse(userId));
    }

    @Transactional
    public int markAllNotificationsRead(UUID userId) {
        return notificationRepository.markAllRead(userId);
    }

    private FollowResponse followStatus(UUID actorId, UUID targetId, boolean following) {
        return new FollowResponse(following,
                followRepository.countByFolloweeId(actorId),   // people who follow the actor
                followRepository.countByFollowerId(actorId));  // people the actor follows
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    /** Emit a realtime event only after the surrounding transaction commits (avoids phantom events). */
    private void publishAfterCommit(Object event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    eventPublisher.publish(event);
                }
            });
        } else {
            eventPublisher.publish(event);
        }
    }

    private static String encodeCursor(OffsetDateTime ts, UUID id) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                (ts.toString() + "|" + id).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private static Cursor decodeCursor(String cursor) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(cursor),
                    java.nio.charset.StandardCharsets.UTF_8);
            int sep = decoded.lastIndexOf('|');
            return new Cursor(OffsetDateTime.parse(decoded.substring(0, sep)),
                    UUID.fromString(decoded.substring(sep + 1)));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid feed cursor");
        }
    }

    private record Cursor(OffsetDateTime ts, UUID id) {
    }
}
