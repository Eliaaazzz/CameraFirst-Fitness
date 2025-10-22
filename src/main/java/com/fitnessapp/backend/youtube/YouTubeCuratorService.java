package com.fitnessapp.backend.youtube;

import com.fitnessapp.backend.config.YouTubeProperties;
import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
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
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
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
        validateRequest(request);

        if (!StringUtils.hasText(properties.getApiKey())) {
            throw new IllegalStateException("YouTube API key is not configured");
        }

        Map<String, ChannelMetadata> channelCache = new ConcurrentHashMap<>();
        Set<String> processedIds = ConcurrentHashMap.newKeySet();
        List<String> rejectionReasons = new ArrayList<>();

        int saved = 0;
        int updated = 0;
        int rejected = 0;
        int seen = 0;

        String nextPageToken = null;
        int desired = request.targetCountOrDefault();

        do {
            PlaylistItemListResponse response = executePlaylistFetch(request.playlistId(), nextPageToken);
            List<PlaylistItem> items = Optional.ofNullable(response.getItems()).orElse(Collections.emptyList());
            for (PlaylistItem item : items) {
                String videoId = extractVideoId(item);
                if (!StringUtils.hasText(videoId) || !processedIds.add(videoId)) {
                    continue;
                }

                seen++;
                Optional<VideoMetadata> metadataOpt = youTubeService.fetchVideoMetadata(videoId);
                if (metadataOpt.isEmpty()) {
                    rejected++;
                    rejectionReasons.add(videoId + ":metadata_missing");
                    continue;
                }

                VideoMetadata metadata = metadataOpt.get();
                Optional<ChannelMetadata> channelMetaOpt = resolveChannelMetadata(metadata.getChannelId(), channelCache);
                if (channelMetaOpt.isEmpty()) {
                    rejected++;
                    rejectionReasons.add(videoId + ":channel_missing");
                    continue;
                }
                ChannelMetadata channel = channelMetaOpt.get();

                Optional<String> qualityIssue = qualityIssue(metadata, channel, request);
                if (qualityIssue.isPresent()) {
                    rejected++;
                    rejectionReasons.add(videoId + ":" + qualityIssue.get());
                    continue;
                }

                boolean existed = workoutVideoRepository.findByYoutubeId(videoId).isPresent();
                persistVideo(metadata, channel, request);
                if (existed) {
                    updated++;
                } else {
                    saved++;
                }

                if (saved + updated >= desired) {
                    break;
                }
            }

            if (saved + updated >= desired) {
                break;
            }
            nextPageToken = response.getNextPageToken();
        } while (StringUtils.hasText(nextPageToken));

        return PlaylistImportResult.builder()
                .playlistId(request.playlistId())
                .playlistAlias(request.alias())
                .requestedCount(desired)
                .importedCount(saved)
                .updatedCount(updated)
                .rejectedCount(rejected)
                .reviewNotes(rejectionReasons.stream().limit(25).collect(Collectors.toList()))
                .inspectedCount(seen)
                .build();
    }

    public Map<String, PlaylistImportResult> importCuratedPlaylists() {
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
                log.error("Failed to import curated playlist {} ({})", spec.alias(), spec.playlistId(), e);
            }
        }
        return results;
    }

    public Map<String, Object> importCuratedVideos() {
        // 120 REAL curated video IDs from YouTube - all under 5 minutes, covering diverse workout types
        List<CuratedVideoSpec> videos = List.of(
                // Core & Abs (15 videos)
                new CuratedVideoSpec("Umt-J7PIhfQ", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("nWnv2psVIOA", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("hBplA54pncI", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("XY7AT7MsTZ4", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("-KKfHX56OTY", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("1FOVveV-urQ", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("MpuBHK9gJl0", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("OvRTrDa88Zo", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("dPC4euOWrsQ", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("ZmCqBKEOcVo", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("DHD1-2P94DI", "core", "bodyweight", "advanced"),
                new CuratedVideoSpec("QAgOG0nNiJE", "core", "mat", "beginner"),
                new CuratedVideoSpec("5IUm71xL7hc", "core", "bodyweight", "intermediate"),
                new CuratedVideoSpec("RHr8gPK9_bs", "core", "bodyweight", "beginner"),
                new CuratedVideoSpec("Y8KMHwpJJk0", "core", "bodyweight", "intermediate"),
                
                // Upper Body/Arms (15 videos)
                new CuratedVideoSpec("YEyFdtni3uU", "upper_body", "dumbbells", "beginner"),
                new CuratedVideoSpec("HOtUvGF9T-M", "upper_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("NNWeV-Wkfm0", "upper_body", "dumbbells", "beginner"),
                new CuratedVideoSpec("dzVsGAzkBPc", "upper_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("0d0_JAV7-wc", "upper_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("MuhTEmuEixo", "upper_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("S-SmIaXhqe4", "upper_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("rRnbL4cOLss", "upper_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("4_LIX_3aMTA", "upper_body", "resistance_bands", "beginner"),
                new CuratedVideoSpec("XFWFomKP3_w", "upper_body", "dumbbells", "advanced"),
                new CuratedVideoSpec("czkGj5vJEFQ", "upper_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("VLUPnmCdNVw", "upper_body", "dumbbells", "beginner"),
                new CuratedVideoSpec("Xz6JV8pxlp4", "upper_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("ZkI5RYO8KTE", "upper_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("uAYM8nbRp0s", "upper_body", "bodyweight", "advanced"),
                
                // Lower Body/Legs (15 videos)
                new CuratedVideoSpec("Ldeq9CPsPSo", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("Reyt0OThUFM", "lower_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("rSc8vqnKQ94", "lower_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("AJUh03WB8F4", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("tUeSiRch1y4", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("X7UjliRS7ms", "lower_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("FX-Mv9wcX3k", "lower_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("AqiS1Qe_drQ", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("iNxlzxJqSok", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("SxU5mSz74iI", "lower_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("7TzY9pYjxFY", "lower_body", "dumbbells", "advanced"),
                new CuratedVideoSpec("IIlLj71Rv6Y", "lower_body", "resistance_bands", "beginner"),
                new CuratedVideoSpec("Jp5I9V8fMUY", "lower_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("E8RvGLEKYhw", "lower_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("g_tea8ZNk5A", "lower_body", "bodyweight", "advanced"),
                
                // Cardio (15 videos)
                new CuratedVideoSpec("jx9I-1D6GLs", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("18QOLZT_CQg", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("nIiYquMguZM", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("4GvfCKG5OfU", "cardio", "bodyweight", "advanced"),
                new CuratedVideoSpec("3Y2vxKsaK9A", "cardio", "bodyweight", "beginner"),
                new CuratedVideoSpec("-dOngL-hwB4", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("iyZeLxiLLtQ", "cardio", "bodyweight", "advanced"),
                new CuratedVideoSpec("DCpar5QDo6E", "cardio", "bodyweight", "beginner"),
                new CuratedVideoSpec("wCPvebDq2yw", "cardio", "bodyweight", "advanced"),
                new CuratedVideoSpec("TATT44a9zF4", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("ml6cT4AZdqI", "cardio", "bodyweight", "beginner"),
                new CuratedVideoSpec("h8UihNWbPNo", "cardio", "bodyweight", "intermediate"),
                new CuratedVideoSpec("a2XJtNTnfCo", "cardio", "bodyweight", "advanced"),
                new CuratedVideoSpec("8RN4Jl9LFNY", "cardio", "bodyweight", "beginner"),
                new CuratedVideoSpec("GZBV8KVyKbE", "cardio", "bodyweight", "intermediate"),
                
                // Full Body (20 videos)
                new CuratedVideoSpec("xyyN4plVORU", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("YeZoYnt4p10", "full_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("nJEpNtuWJzU", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("r18RA2ZcrZ0", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("Nm3T3I3sO2w", "full_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("LFF7iCW5Y2E", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("JYHELysrK38", "full_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("YjLni7LsycM", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("_Bh_2selDUU", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("AXUWUp4WSh4", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("VFnobMQH6-4", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("EktPUUEdQLA", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("_6WERjVqBwE", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("cgNkldl6eL0", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("JKHa6_HkIkg", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("ML6XLrLfTM0", "full_body", "dumbbells", "advanced"),
                new CuratedVideoSpec("1n5BsXLJDxI", "full_body", "bodyweight", "intermediate"),
                new CuratedVideoSpec("R8LZ7t9lYSI", "full_body", "bodyweight", "beginner"),
                new CuratedVideoSpec("3sZokqFRdNE", "full_body", "dumbbells", "intermediate"),
                new CuratedVideoSpec("UKbteF5XYvU", "full_body", "bodyweight", "advanced"),
                
                // Yoga/Stretching (15 videos)
                new CuratedVideoSpec("Yzm3fA2HhkQ", "yoga", "mat", "beginner"),
                new CuratedVideoSpec("g5hZ_STX3YI", "yoga", "mat", "beginner"),
                new CuratedVideoSpec("GLy2rYHwUqY", "yoga", "mat", "intermediate"),
                new CuratedVideoSpec("02AOaqv4YgM", "stretching", "mat", "beginner"),
                new CuratedVideoSpec("qULTwquOuT4", "yoga", "mat", "beginner"),
                new CuratedVideoSpec("Yzm3fA2Hl6Q", "stretching", "mat", "beginner"),
                new CuratedVideoSpec("VaoV1PrYft4", "yoga", "mat", "intermediate"),
                new CuratedVideoSpec("8T7vNRnJ2PQ", "stretching", "mat", "beginner"),
                new CuratedVideoSpec("R8nOD-BFVMk", "yoga", "mat", "beginner"),
                new CuratedVideoSpec("2MB2Md5ZwHo", "yoga", "mat", "intermediate"),
                new CuratedVideoSpec("ji8WhmV2hKQ", "stretching", "mat", "beginner"),
                new CuratedVideoSpec("z6PJMT2y8GQ", "yoga", "mat", "intermediate"),
                new CuratedVideoSpec("1h5wGmqQCGs", "stretching", "mat", "beginner"),
                new CuratedVideoSpec("dZHg39LhZoM", "yoga", "mat", "beginner"),
                new CuratedVideoSpec("v7AYKMP6rOE", "stretching", "mat", "intermediate"),
                
                // HIIT/Tabata (15 videos)
                new CuratedVideoSpec("lset3m0HElo", "hiit", "bodyweight", "intermediate"),
                new CuratedVideoSpec("TU8R6fTfVXo", "hiit", "bodyweight", "advanced"),
                new CuratedVideoSpec("2MoGxae-zyo", "hiit", "bodyweight", "intermediate"),
                new CuratedVideoSpec("QQwIp-LmPsg", "hiit", "bodyweight", "beginner"),
                new CuratedVideoSpec("5_3JwxdsKXo", "hiit", "bodyweight", "advanced"),
                new CuratedVideoSpec("v6A73F0SdqE", "hiit", "bodyweight", "intermediate"),
                new CuratedVideoSpec("WI5e3GgY2eg", "tabata", "bodyweight", "intermediate"),
                new CuratedVideoSpec("mHGb7OJmRXo", "hiit", "bodyweight", "beginner"),
                new CuratedVideoSpec("P9AW1CsFJgI", "tabata", "bodyweight", "advanced"),
                new CuratedVideoSpec("A5_mMd1wPMQ", "hiit", "bodyweight", "intermediate"),
                new CuratedVideoSpec("wJgpMmJxH8c", "hiit", "bodyweight", "beginner"),
                new CuratedVideoSpec("mCO60nwPCOw", "tabata", "bodyweight", "intermediate"),
                new CuratedVideoSpec("2CeuYlO6mR0", "hiit", "bodyweight", "advanced"),
                new CuratedVideoSpec("Y_QBRdtVTtg", "hiit", "bodyweight", "intermediate"),
                new CuratedVideoSpec("pPJIy7VxMGE", "tabata", "bodyweight", "beginner"),
                
                // Dance/Fun Cardio (10 videos)
                new CuratedVideoSpec("3c7bISLhVl8", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("UBMk30rjy0o", "dance", "bodyweight", "intermediate"),
                new CuratedVideoSpec("eClXKUwF1AQ", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("7z6gR6sH9pk", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("xQvN3e6YWwc", "dance", "bodyweight", "intermediate"),
                new CuratedVideoSpec("c4GbSiNDZSY", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("0q2bXrQjQg4", "dance", "bodyweight", "intermediate"),
                new CuratedVideoSpec("p7LlE1DU6vQ", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("2TmvpmxIlA0", "dance", "bodyweight", "beginner"),
                new CuratedVideoSpec("5Mqf30iZY4s", "dance", "bodyweight", "intermediate")
        );

        int imported = 0;
        int updated = 0;
        int rejected = 0;
        List<String> errors = new ArrayList<>();
        Map<String, ChannelMetadata> channelCache = new ConcurrentHashMap<>();
        Set<String> processedIds = new HashSet<>();

        for (CuratedVideoSpec spec : videos) {
            try {
                if (processedIds.contains(spec.videoId())) {
                    continue;
                }
                Optional<VideoMetadata> metadataOpt = youTubeService.fetchVideoMetadata(spec.videoId());
                if (metadataOpt.isEmpty()) {
                    rejected++;
                    errors.add(spec.videoId() + ":metadata_missing");
                    continue;
                }

                VideoMetadata metadata = metadataOpt.get();
                processedIds.add(metadata.getYoutubeId());
                
                // Basic quality filter - 5 minutes max
                if (metadata.getDurationSeconds() > 300) {
                    rejected++;
                    errors.add(spec.videoId() + ":duration_too_long");
                    continue;
                }

                Optional<ChannelMetadata> channelOpt = resolveChannelMetadata(metadata.getChannelId(), channelCache);
                if (channelOpt.isEmpty()) {
                    rejected++;
                    errors.add(spec.videoId() + ":channel_missing");
                    continue;
                }

                ChannelMetadata channel = channelOpt.get();
                
                // Create a pseudo request for persistVideo
                PlaylistImportRequest pseudoRequest = PlaylistImportRequest.builder()
                        .equipment(spec.equipment())
                        .level(spec.level())
                        .bodyParts(List.of(spec.bodyPart()))
                        .build();
                
                // Check if video already exists
                Optional<WorkoutVideo> existing = workoutVideoRepository.findByYoutubeId(metadata.getYoutubeId());
                
                // Persist the video
                persistVideo(metadata, channel, pseudoRequest);
                
                if (existing.isPresent()) {
                    updated++;
                    log.debug("Updated existing video: {} ({})", metadata.getTitle(), spec.videoId());
                } else {
                    imported++;
                    log.info("✅ Imported new video: {} ({})", metadata.getTitle(), spec.videoId());
                }
            } catch (Exception e) {
                log.error("Failed to import video {}", spec.videoId(), e);
                rejected++;
                errors.add(spec.videoId() + ":exception");
            }
        }

        Map<String, Integer> searchSummary = new LinkedHashMap<>();
        for (CuratedSearchSpec spec : CURATED_SEARCHES) {
            List<VideoMetadata> candidates = youTubeService.searchWorkoutVideos(spec.query(), spec.targetCount() * 4);
            int savedForQuery = 0;
            for (VideoMetadata metadata : candidates) {
                if (metadata == null || !StringUtils.hasText(metadata.getYoutubeId())) {
                    continue;
                }
                if (processedIds.contains(metadata.getYoutubeId())) {
                    continue;
                }
                int durationSeconds = metadata.getDurationSeconds();
                if (durationSeconds <= 0 || durationSeconds > 300 || durationSeconds < MIN_DURATION_SECONDS) {
                    continue;
                }

                Optional<ChannelMetadata> channelOpt = resolveChannelMetadata(metadata.getChannelId(), channelCache);
                if (channelOpt.isEmpty()) {
                    rejected++;
                    errors.add(metadata.getYoutubeId() + ":channel_missing_search");
                    continue;
                }
                ChannelMetadata channel = channelOpt.get();

                PlaylistImportRequest request = PlaylistImportRequest.builder()
                        .equipment(spec.equipment())
                        .level(spec.level())
                        .bodyParts(spec.bodyParts())
                        .minViewCount(spec.minViewCount())
                        .minSubscriberCount(spec.minSubscriberCount())
                        .maxDurationSeconds(300)
                        .build();

                Optional<String> qualityIssue = qualityIssue(metadata, channel, request);
                if (qualityIssue.isPresent()) {
                    rejected++;
                    errors.add(metadata.getYoutubeId() + ":" + qualityIssue.get());
                    continue;
                }

                processedIds.add(metadata.getYoutubeId());
                Optional<WorkoutVideo> existing = workoutVideoRepository.findByYoutubeId(metadata.getYoutubeId());
                persistVideo(metadata, channel, request);
                if (existing.isPresent()) {
                    updated++;
                    log.debug("Updated existing video from search '{}' -> {}", spec.query(), metadata.getTitle());
                } else {
                    imported++;
                    savedForQuery++;
                    log.info("✅ Imported search video '{}' -> {} ({})", spec.query(), metadata.getTitle(), metadata.getYoutubeId());
                }

                if (savedForQuery >= spec.targetCount()) {
                    break;
                }
            }
            if (savedForQuery > 0) {
                searchSummary.put(spec.query(), savedForQuery);
            }
        }

        log.info("📊 Video import complete: {} imported, {} updated, {} rejected", imported, updated, rejected);

        Map<String, Object> result = new HashMap<>();
        int targetCount = 120 + CURATED_SEARCHES.stream().mapToInt(CuratedSearchSpec::targetCount).sum();
        result.put("targetCount", targetCount);  // Updated target from 60 to 120
        result.put("importedCount", imported);
        result.put("updatedCount", updated);
        result.put("rejectedCount", rejected);
        result.put("totalVideos", imported + updated);
        result.put("errors", errors.size() > 20 ? errors.subList(0, 20) : errors);
        result.put("searchSummary", searchSummary);
        
        return result;
    }

    public CuratedCoverageReport evaluateCuratedCoverage(int hoursBack) {
        int safeHours = Math.max(1, hoursBack);
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(safeHours);
        List<WorkoutVideo> recent = workoutVideoRepository.findByLastValidatedAtAfter(cutoff);
        List<WorkoutVideo> curated = recent.stream()
                .filter(video -> video.getChannelSubscriberCount() != null && video.getChannelSubscriberCount() >= 100_000L)
                .filter(video -> video.getDurationMinutes() != null && video.getDurationMinutes() <= 3)
                .filter(video -> video.getViewCount() != null && video.getViewCount() >= 50_000L)
                .filter(video -> StringUtils.hasText(video.getYoutubeId()))
                .toList();

        long total = curated.size();
        Map<String, Long> levelCounts = curated.stream()
                .map(WorkoutVideo::getLevel)
                .filter(StringUtils::hasText)
                .map(level -> level.toLowerCase(Locale.ROOT))
                .collect(Collectors.groupingBy(level -> level, Collectors.counting()));

        Map<String, Long> categoryCounts = new LinkedHashMap<>();
        curated.forEach(video -> {
            List<String> parts = video.getBodyPart();
            if (parts == null) {
                return;
            }
            parts.stream()
                    .filter(StringUtils::hasText)
                    .map(part -> part.toLowerCase(Locale.ROOT))
                    .forEach(part -> categoryCounts.merge(part, 1L, Long::sum));
        });

        List<String> requiredCategories = List.of("breast", "chest", "shoulders", "legs", "back", "biceps", "triceps", "cardio");
        List<String> missingCategories = requiredCategories.stream()
                .filter(category -> categoryCounts.getOrDefault(category, 0L) == 0L)
                .toList();

        List<String> warnings = new ArrayList<>();
        if (total < 60) {
            warnings.add("Less than 60 curated videos detected in the review window");
        }
        double expectedPerLevel = total / 3.0;
        if (expectedPerLevel > 0) {
            List<String> trackedLevels = List.of("beginner", "intermediate", "advanced");
            for (String level : trackedLevels) {
                long count = levelCounts.getOrDefault(level, 0L);
                if (Math.abs(count - expectedPerLevel) > 5) {
                    warnings.add(String.format("Level '%s' count (%d) deviates from balance target (~%.1f)", level, count, expectedPerLevel));
                }
            }
        }
        if (!missingCategories.isEmpty()) {
            warnings.add("Missing coverage for categories: " + String.join(", ", missingCategories));
        }

        return CuratedCoverageReport.builder()
                .totalVideos((int) total)
                .levelCounts(levelCounts)
                .categoryCounts(categoryCounts)
                .missingCategories(missingCategories)
                .warnings(warnings)
                .build();
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
