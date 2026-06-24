package com.fitnessapp.backend.social.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Response DTOs for the social API. */
public final class SocialDtos {

    private SocialDtos() {
    }

    public record FollowResponse(boolean following, long followerCount, long followingCount) {
    }

    public record UserRef(UUID userId, OffsetDateTime since) {
    }

    public record FeedItemDto(UUID id, UUID actorId, String verb, String objectType,
                              String objectId, String summary, OffsetDateTime createdAt) {
    }

    /** A keyset page of feed items; {@code nextCursor} is the ISO timestamp to pass as {@code before}. */
    public record FeedPage(List<FeedItemDto> items, String nextCursor) {
    }

    public record NotificationDto(UUID id, String type, UUID actorId, String message,
                                  boolean read, OffsetDateTime createdAt) {
    }

    public record NotificationsResponse(List<NotificationDto> items, long unread) {
    }
}
