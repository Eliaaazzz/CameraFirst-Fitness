package com.fitnessapp.backend.youtube;

import com.fitnessapp.backend.config.YouTubeProperties;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import com.fitnessapp.backend.youtube.dto.ChannelMetadata;
import com.fitnessapp.backend.youtube.dto.PlaylistImportRequest;
import com.fitnessapp.backend.youtube.dto.PlaylistImportResult;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.PlaylistItem;
import com.google.api.services.youtube.model.PlaylistItemListResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Feature-flagged ingestion pipeline targeting exercise_videos (replaces legacy workout_video).
 *
 * <p>When {@code app.youtube.ingestion-enabled=true}, this service fetches videos from
 * YouTube playlists and persists them to the exercise_videos table with full metadata.
 *
 * <p>Applies quality filters:
 * <ul>
 *   <li>Duration: 60s - 300s (configurable via request)</li>
 *   <li>Minimum view count: 50k (configurable)</li>
 *   <li>Minimum channel subscribers: 100k (configurable)</li>
 *   <li>Title validation: must contain workout-related keywords</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExerciseVideoIngestionService {

    private static final int MAX_RESULTS_PER_PAGE = 50;
    private static final int MIN_DURATION_SECONDS = 60;

    private final YouTubeProperties properties;
    private final YouTubeService youTubeService;
    private final YouTube youtube;
    private final ExerciseVideoRepository exerciseVideoRepository;

    /**
     * Curated playlists for initial content seeding.
     */
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

    private void assertIngestionEnabled() {
        if (!properties.isIngestionEnabled()) {
            throw new IllegalStateException(
                    "YouTube ingestion is disabled. Set app.youtube.ingestion-enabled=true to proceed.");
        }
    }

    /**
     * Import a single playlist into exercise_videos.
     *
     * @param request Playlist import configuration
     * @return Import result with counts and review notes
     */
    @Transactional
    public PlaylistImportResult importPlaylist(PlaylistImportRequest request) {
        assertIngestionEnabled();
        validateRequest(request);

        log.info("[INGEST] Starting playlist import: {} (alias={})",
                request.playlistId(), request.alias());

        List<String> reviewNotes = new ArrayList<>();
        Map<String, ChannelMetadata> channelCache = new HashMap<>();

        int importedCount = 0;
        int updatedCount = 0;
        int rejectedCount = 0;
        int inspectedCount = 0;

        String nextPageToken = null;
        int targetCount = request.targetCountOrDefault();

        do {
            PlaylistItemListResponse response = fetchPlaylistPage(request.playlistId(), nextPageToken);
            List<PlaylistItem> items = response.getItems() != null ? response.getItems() : List.of();

            for (PlaylistItem item : items) {
                if (importedCount + updatedCount >= targetCount) {
                    log.info("[INGEST] Reached target count {} for playlist {}",
                            targetCount, request.playlistId());
                    break;
                }

                String videoId = extractVideoId(item);
                if (videoId == null) {
                    continue;
                }

                inspectedCount++;

                Optional<VideoMetadata> metadataOpt = youTubeService.fetchVideoMetadata(videoId);
                if (metadataOpt.isEmpty()) {
                    reviewNotes.add("video_unavailable:" + videoId);
                    rejectedCount++;
                    continue;
                }

                VideoMetadata metadata = metadataOpt.get();
                ChannelMetadata channel = resolveChannelMetadata(metadata.getChannelId(), channelCache)
                        .orElse(new ChannelMetadata(metadata.getChannelId(), metadata.getChannelTitle(), 0L));

                Optional<String> qualityIssue = qualityIssue(metadata, channel, request);
                if (qualityIssue.isPresent()) {
                    reviewNotes.add(qualityIssue.get() + ":" + videoId);
                    rejectedCount++;
                    continue;
                }

                boolean isNew = persistVideo(metadata, channel, request);
                if (isNew) {
                    importedCount++;
                } else {
                    updatedCount++;
                }
            }

            nextPageToken = response.getNextPageToken();

        } while (StringUtils.hasText(nextPageToken) && (importedCount + updatedCount) < targetCount);

        log.info("[INGEST] Playlist {} complete: imported={}, updated={}, rejected={}, inspected={}",
                request.playlistId(), importedCount, updatedCount, rejectedCount, inspectedCount);

        return PlaylistImportResult.builder()
                .playlistId(request.playlistId())
                .playlistAlias(request.alias())
                .requestedCount(targetCount)
                .importedCount(importedCount)
                .updatedCount(updatedCount)
                .rejectedCount(rejectedCount)
                .inspectedCount(inspectedCount)
                .reviewNotes(reviewNotes.isEmpty() ? null : reviewNotes)
                .build();
    }

    /**
     * Import all curated playlists into exercise_videos.
     *
     * @return Map of playlist alias to import result
     */
    @Transactional
    public Map<String, PlaylistImportResult> importCuratedPlaylists() {
        assertIngestionEnabled();

        log.info("[INGEST] Starting curated playlists import ({} playlists)", CURATED_PLAYLISTS.size());

        Map<String, PlaylistImportResult> results = new HashMap<>();

        for (CuratedPlaylistSpec spec : CURATED_PLAYLISTS) {
            PlaylistImportRequest request = PlaylistImportRequest.builder()
                    .playlistId(spec.playlistId())
                    .alias(spec.alias())
                    .equipment(spec.equipment())
                    .level(spec.level())
                    .bodyParts(spec.bodyParts())
                    .targetCount(spec.targetCount())
                    .build();

            try {
                PlaylistImportResult result = importPlaylist(request);
                results.put(spec.alias(), result);
            } catch (Exception e) {
                log.error("[INGEST] Failed to import playlist {}: {}", spec.alias(), e.getMessage(), e);
                results.put(spec.alias(), PlaylistImportResult.builder()
                        .playlistId(spec.playlistId())
                        .playlistAlias(spec.alias())
                        .requestedCount(spec.targetCount())
                        .importedCount(0)
                        .reviewNotes(List.of("error:" + e.getMessage()))
                        .build());
            }
        }

        int totalImported = results.values().stream().mapToInt(PlaylistImportResult::getImportedCount).sum();
        int totalUpdated = results.values().stream().mapToInt(PlaylistImportResult::getUpdatedCount).sum();
        log.info("[INGEST] Curated playlists complete: totalImported={}, totalUpdated={}", totalImported, totalUpdated);

        return results;
    }

    /**
     * Persist or update a video in exercise_videos.
     *
     * @return true if newly inserted, false if updated
     */
    private boolean persistVideo(VideoMetadata metadata,
                                 ChannelMetadata channel,
                                 PlaylistImportRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        String primaryCategory = resolvePrimaryCategory(request.bodyParts());

        Optional<ExerciseVideo> existingOpt = exerciseVideoRepository.findByYoutubeId(metadata.getYoutubeId());
        boolean isNew = existingOpt.isEmpty();

        ExerciseVideo entity = existingOpt.orElseGet(ExerciseVideo::new);

        if (isNew) {
            entity.setId(UUID.randomUUID());
            entity.setCreatedAt(now);
        }

        // Core fields
        entity.setYoutubeId(metadata.getYoutubeId());
        entity.setVideoUrl("https://www.youtube.com/watch?v=" + metadata.getYoutubeId());
        entity.setExerciseName(metadata.getTitle());
        entity.setExerciseSlug(slugify(metadata.getTitle()));
        entity.setThumbnailUrl(metadata.getThumbnailUrl());
        entity.setPlatform("youtube");
        entity.setIsShort(metadata.getDurationSeconds() <= 60);

        // R2 key placeholder (thumbnail sync handled separately)
        if (!StringUtils.hasText(entity.getR2Key())) {
            entity.setR2Key("youtube/" + metadata.getYoutubeId());
        }

        // Categories
        entity.setPrimaryCategory(primaryCategory);
        entity.setSecondaryCategory(resolveSecondaryCategory(request.bodyParts()));

        // Target goals based on category/body parts
        entity.setTargetGoal(resolveTargetGoals(primaryCategory, request.level()));

        // Search text for embedding generation
        entity.setSearchText(buildSearchText(metadata, request));

        entity.setUpdatedAt(now);

        exerciseVideoRepository.save(entity);

        log.debug("[INGEST] {} video: {} ({})",
                isNew ? "Inserted" : "Updated",
                metadata.getTitle(),
                metadata.getYoutubeId());

        return isNew;
    }

    private String resolvePrimaryCategory(List<String> bodyParts) {
        if (CollectionUtils.isEmpty(bodyParts)) {
            return "full_body";
        }
        // First body part is primary
        return bodyParts.get(0).toLowerCase(Locale.ROOT).replace(" ", "_");
    }

    private String resolveSecondaryCategory(List<String> bodyParts) {
        if (bodyParts == null || bodyParts.size() < 2) {
            return null;
        }
        return bodyParts.get(1).toLowerCase(Locale.ROOT).replace(" ", "_");
    }

    private List<String> resolveTargetGoals(String category, String level) {
        List<String> goals = new ArrayList<>();

        // Map categories to fitness goals
        if (category != null) {
            String cat = category.toLowerCase(Locale.ROOT);
            if (cat.contains("cardio") || cat.contains("hiit")) {
                goals.add("FAT_LOSS");
                goals.add("GENERAL_FITNESS");
            } else if (cat.contains("upper") || cat.contains("arms") || cat.contains("chest") || cat.contains("back")) {
                goals.add("BUILD_MUSCLE");
                goals.add("GENERAL_FITNESS");
            } else if (cat.contains("lower") || cat.contains("legs") || cat.contains("glutes")) {
                goals.add("BUILD_MUSCLE");
                goals.add("FAT_LOSS");
            } else if (cat.contains("core") || cat.contains("abs")) {
                goals.add("BUILD_MUSCLE");
                goals.add("GENERAL_FITNESS");
            } else if (cat.contains("stretch") || cat.contains("mobility") || cat.contains("yoga")) {
                goals.add("GENERAL_FITNESS");
            } else {
                goals.add("GENERAL_FITNESS");
            }
        }

        // Add based on level
        if ("beginner".equalsIgnoreCase(level)) {
            if (!goals.contains("GENERAL_FITNESS")) {
                goals.add("GENERAL_FITNESS");
            }
        }

        return goals.isEmpty() ? List.of("GENERAL_FITNESS") : goals;
    }

    private String buildSearchText(VideoMetadata metadata, PlaylistImportRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append(metadata.getTitle());

        if (StringUtils.hasText(metadata.getChannelTitle())) {
            sb.append(" ").append(metadata.getChannelTitle());
        }

        if (!CollectionUtils.isEmpty(request.bodyParts())) {
            sb.append(" ").append(String.join(" ", request.bodyParts()));
        }

        if (StringUtils.hasText(request.equipment())) {
            sb.append(" ").append(request.equipment());
        }

        if (StringUtils.hasText(request.level())) {
            sb.append(" ").append(request.level());
        }

        return sb.toString().trim();
    }

    private String slugify(String title) {
        if (title == null) {
            return "unknown";
        }
        return title.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
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
                || normalized.contains("cardio")
                || normalized.contains("pilates")
                || normalized.contains("yoga")
                || normalized.contains("stretch");
    }

    private PlaylistItemListResponse fetchPlaylistPage(String playlistId, String nextPageToken) {
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
            return new ChannelMetadata(channelId, title, subscriberCount);
        } catch (IOException e) {
            log.warn("Failed to load channel {} metadata: {}", channelId, e.getMessage());
            return null;
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
    }

    /**
     * Check if ingestion is enabled.
     */
    public boolean isIngestionEnabled() {
        return properties.isIngestionEnabled();
    }

    private record CuratedPlaylistSpec(
            String alias,
            String playlistId,
            String equipment,
            String level,
            List<String> bodyParts,
            int targetCount) {
    }
}
