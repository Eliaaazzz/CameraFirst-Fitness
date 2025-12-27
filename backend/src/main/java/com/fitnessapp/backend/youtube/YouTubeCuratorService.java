package com.fitnessapp.backend.youtube;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import com.fitnessapp.backend.config.YouTubeProperties;
import com.fitnessapp.backend.workout.entity.WorkoutVideo;
import com.fitnessapp.backend.workout.repository.WorkoutVideoRepository;
import com.fitnessapp.backend.youtube.dto.ChannelMetadata;
import com.fitnessapp.backend.youtube.dto.CuratedCoverageReport;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.PlaylistItem;
import com.google.api.services.youtube.model.PlaylistItemListResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@Deprecated
public class YouTubeCuratorService {

    private static final int MAX_RESULTS_PER_PAGE = 50;
    private static final int MIN_DURATION_SECONDS = 60;

    private static final List<CuratedPlaylistSpec> CURATED_PLAYLISTS = List.of(
            new CuratedPlaylistSpec(
                    "MadFit_QuickCore5min",
                    "PLhu1QCKrfgPWlhRHrJW7n16dxcam-oYfE",
                    "bodyweight",
                    "beginner",
                    List.of("core", "abs"),
                    10),
            new CuratedPlaylistSpec(
                    "MadFit_StandingAbs5min",
                    "PLhu1QCKrfgPVrfPHWpVQDqQdyZ5YhDg4W",
                    "bodyweight",
                    "beginner",
                    List.of("core", "abs"),
                    10),
            new CuratedPlaylistSpec(
                    "MadFit_ArmsShoulders5min",
                    "PLhu1QCKrfgPVGpOqR89sX2oY47l2KVYhO",
                    "dumbbells",
                    "intermediate",
                    List.of("upper_body", "arms", "shoulders"),
                    10),
            new CuratedPlaylistSpec(
                    "MadFit_CardioBursts5min",
                    "PLhu1QCKrfgPUWL3FAVjy2Pzs5v9d_7cKJ",
                    "bodyweight",
                    "intermediate",
                    List.of("cardio", "full_body"),
                    10),
            new CuratedPlaylistSpec(
                    "MadFit_LowerBody5min",
                    "PLhu1QCKrfgPX_ygZ9sQYH-K8S8RkYQNMr",
                    "bodyweight",
                    "beginner",
                    List.of("lower_body", "legs", "glutes"),
                    10),
            new CuratedPlaylistSpec(
                    "Blogilates_PilatesCore5min",
                    "PL6F8AF6B2F2E56F47",
                    "mat",
                    "beginner",
                    List.of("core", "abs"),
                    10)
    );

    private static final List<CuratedSearchSpec> CURATED_SEARCHES = List.of(
            new CuratedSearchSpec(
                    "5 minute chest workout",
                    List.of("upper_body", "chest"),
                    "bodyweight",
                    "intermediate",
                    8,
                    20_000L,
                    50_000L),
            new CuratedSearchSpec(
                    "5 minute shoulder workout",
                    List.of("upper_body", "shoulders"),
                    "dumbbells",
                    "intermediate",
                    8,
                    15_000L,
                    40_000L),
            new CuratedSearchSpec(
                    "5 minute arm workout",
                    List.of("upper_body", "arms", "biceps", "triceps"),
                    "dumbbells",
                    "beginner",
                    8,
                    15_000L,
                    40_000L),
            new CuratedSearchSpec(
                    "5 minute leg workout",
                    List.of("lower_body", "legs"),
                    "bodyweight",
                    "beginner",
                    8,
                    15_000L,
                    40_000L),
            new CuratedSearchSpec(
                    "5 minute glute workout",
                    List.of("lower_body", "glutes"),
                    "bodyweight",
                    "intermediate",
                    8,
                    15_000L,
                    40_000L),
            new CuratedSearchSpec(
                    "5 minute abs workout",
                    List.of("core", "abs"),
                    "bodyweight",
                    "beginner",
                    8,
                    20_000L,
                    50_000L),
            new CuratedSearchSpec(
                    "5 minute back workout",
                    List.of("upper_body", "back"),
                    "bodyweight",
                    "intermediate",
                    6,
                    15_000L,
                    40_000L),
            new CuratedSearchSpec(
                    "5 minute full body stretch",
                    List.of("mobility", "stretch"),
                    "mat",
                    "beginner",
                    6,
                    10_000L,
                    25_000L)
    );

    private final YouTube youtube;
    private final YouTubeService youTubeService;
    private final YouTubeProperties properties;
    private final WorkoutVideoRepository workoutVideoRepository;

    public PlaylistImportResult importPlaylist(PlaylistImportRequest request) {
        // TODO: route future YouTube ingestion into exercise_videos once the new pipeline is ready.
        throw new UnsupportedOperationException("YouTube import into workout_video is disabled; migrate ingestion to exercise_videos.");
    }

    public Map<String, PlaylistImportResult> importCuratedPlaylists() {
        throw new UnsupportedOperationException("YouTube curated playlist import is disabled; migrate ingestion to exercise_videos.");
    }

    public Map<String, Object> importCuratedVideos() {
        throw new UnsupportedOperationException("YouTube curated video import is disabled; migrate ingestion to exercise_videos.");
    }

    public CuratedCoverageReport evaluateCuratedCoverage(int hoursBack) {
        throw new UnsupportedOperationException("YouTube curated coverage is disabled; migrate ingestion to exercise_videos.");
    }

    private WorkoutVideo persistVideo(VideoMetadata metadata,
                                      ChannelMetadata channel,
                                      PlaylistImportRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        List<String> equipment = resolveEquipment(request);
        List<String> bodyParts = resolveBodyParts(request);

        WorkoutVideo entity = workoutVideoRepository.findByYoutubeId(metadata.getYoutubeId())
                .orElseGet(WorkoutVideo::new);
        entity.setYoutubeId(metadata.getYoutubeId());
        entity.setTitle(metadata.getTitle());
        entity.setDurationMinutes(metadata.getDurationMinutes());
        entity.setLevel(request.level());
        entity.setEquipment(equipment);
        entity.setBodyPart(bodyParts);
        entity.setThumbnailUrl(metadata.getThumbnailUrl());
        entity.setChannelId(metadata.getChannelId());
        entity.setChannelTitle(channel.title());
        entity.setChannelSubscriberCount(channel.subscriberCount());
        entity.setViewCount(metadata.getViewCount());
        entity.setLastValidatedAt(now);
        return workoutVideoRepository.save(entity);
    }

    private static List<String> resolveEquipment(PlaylistImportRequest request) {
        if (CollectionUtils.isEmpty(request.equipmentList())) {
            if (StringUtils.hasText(request.equipment())) {
                return List.of(request.equipment().trim());
            }
            return List.of("bodyweight");
        }
        return request.equipmentList().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.toList());
    }

    private static List<String> resolveBodyParts(PlaylistImportRequest request) {
        if (CollectionUtils.isEmpty(request.bodyParts())) {
            return List.of();
        }
        return request.bodyParts().stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .collect(Collectors.toList());
    }

    private Optional<ChannelMetadata> resolveChannelMetadata(String channelId,
                                                             Map<String, ChannelMetadata> cache) {
        if (!StringUtils.hasText(channelId)) {
            return Optional.empty();
        }
        return Optional.ofNullable(cache.computeIfAbsent(channelId, this::fetchChannelMetadata));
    }

    private ChannelMetadata fetchChannelMetadata(String channelId) {
        try {
            ChannelListResponse response = youtube.channels()
                    .list(List.of("snippet", "statistics"))
                    .setId(Collections.singletonList(channelId))
                    .setMaxResults(1L)
                    .setKey(properties.getApiKey())
                    .execute();
            List<Channel> items = Optional.ofNullable(response.getItems()).orElse(Collections.emptyList());
            if (items.isEmpty()) {
                return null;
            }
            Channel channel = items.get(0);
            long subscriberCount = channel.getStatistics() != null && channel.getStatistics().getSubscriberCount() != null
                    ? channel.getStatistics().getSubscriberCount().longValue()
                    : 0L;
            String title = channel.getSnippet() != null ? channel.getSnippet().getTitle() : null;
            return ChannelMetadata.builder()
                    .channelId(channelId)
                    .title(title)
                    .subscriberCount(subscriberCount)
                    .build();
        } catch (IOException e) {
            log.warn("Failed to load channel {} metadata: {}", channelId, e.getMessage());
            return null;
        }
    }

    private Optional<String> qualityIssue(VideoMetadata metadata,
                                          ChannelMetadata channel,
                                          PlaylistImportRequest request) {
        int durationSeconds = metadata.getDurationSeconds();
        if (durationSeconds <= 0) {
            return Optional.of("duration_unavailable");
        }
        if (durationSeconds < MIN_DURATION_SECONDS) {
            return Optional.of("duration_too_short");
        }
        if (durationSeconds > request.maxDurationSecondsOrDefault()) {
            return Optional.of("duration_too_long");
        }
        if (metadata.getViewCount() < request.minViewCountOrDefault()) {
            return Optional.of("views_too_low");
        }
        if (channel.subscriberCount() < request.minSubscriberCountOrDefault()) {
            return Optional.of("channel_subscribers_low");
        }
        if (!titleLooksValid(metadata.getTitle())) {
            return Optional.of("title_not_workout");
        }
        return Optional.empty();
    }

    private boolean titleLooksValid(String title) {
        if (!StringUtils.hasText(title)) {
            return false;
        }
        String normalized = title.toLowerCase(Locale.ROOT);
        return normalized.contains("workout")
                || normalized.contains("exercise")
                || normalized.contains("training")
                || normalized.contains("hiit")
                || normalized.contains("cardio");
    }

    private PlaylistItemListResponse executePlaylistFetch(String playlistId, String nextPageToken) {
        try {
            YouTube.PlaylistItems.List listRequest = youtube.playlistItems()
                    .list(List.of("snippet", "contentDetails"))
                    .setPlaylistId(playlistId)
                    .setMaxResults((long) MAX_RESULTS_PER_PAGE)
                    .setKey(properties.getApiKey());
            if (StringUtils.hasText(nextPageToken)) {
                listRequest.setPageToken(nextPageToken);
            }
            return listRequest.execute();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to fetch playlist " + playlistId, e);
        }
    }

    private static String extractVideoId(PlaylistItem item) {
        if (item == null || item.getContentDetails() == null) {
            return null;
        }
        return item.getContentDetails().getVideoId();
    }

    private void validateRequest(PlaylistImportRequest request) {
        Objects.requireNonNull(request, "request is required");
        if (!StringUtils.hasText(request.playlistId())) {
            throw new IllegalArgumentException("playlistId is required");
        }
        if (!StringUtils.hasText(request.level())) {
            throw new IllegalArgumentException("level is required");
        }
    }

    private record CuratedPlaylistSpec(String alias,
                                       String playlistId,
                                       String equipment,
                                       String level,
                                       List<String> bodyParts,
                                       int targetCount) {
    }
    
    private record CuratedVideoSpec(String videoId,
                                    String bodyPart,
                                    String equipment,
                                    String level) {
    }

    private record CuratedSearchSpec(String query,
                                     List<String> bodyParts,
                                     String equipment,
                                     String level,
                                     int targetCount,
                                     long minViewCount,
                                     long minSubscriberCount) {
    }
}
