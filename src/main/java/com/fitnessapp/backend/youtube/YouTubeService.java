package com.fitnessapp.backend.youtube;

import com.fitnessapp.backend.config.YouTubeProperties;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.SearchListResponse;
import com.google.api.services.youtube.model.SearchResult;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoListResponse;
import jakarta.annotation.Nullable;
import java.io.IOException;
import java.time.Duration;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@RequiredArgsConstructor
@Service
public class YouTubeService {

    private static final int MAX_RESULTS = 50;
    private static final String CACHE_KEY_PREFIX = "yt:video:";

    private final YouTube youtube;
    private final RedisTemplate<String, VideoMetadata> redisTemplate;
    private final YouTubeProperties properties;

    public Optional<VideoMetadata> fetchVideoMetadata(String videoId) {
        String normalizedId = normalizeVideoId(videoId);
        if (normalizedId.isEmpty()) {
            return Optional.empty();
        }

        String cacheKey = CACHE_KEY_PREFIX + normalizedId;
        VideoMetadata cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return Optional.of(cached);
        }

        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            log.warn("YouTube API key is not configured; skipping API call for video {}", normalizedId);
            return Optional.empty();
        }

        try {
            VideoListResponse response = youtube.videos()
                    .list(List.of("snippet", "contentDetails", "statistics"))
                    .setId(Collections.singletonList(normalizedId))
                    .setKey(properties.getApiKey())
                    .execute();

            if (response.getItems() == null || response.getItems().isEmpty()) {
                return Optional.empty();
            }

            VideoMetadata metadata = toMetadata(response.getItems().get(0));
            redisTemplate.opsForValue().set(cacheKey, metadata, properties.getCacheTtl());
            return Optional.of(metadata);
        } catch (GoogleJsonResponseException ex) {
            log.error("YouTube API error ({}): {}", ex.getStatusCode(), ex.getDetails() != null ? ex.getDetails().getMessage() : ex.getMessage());
            return Optional.empty();
        } catch (IOException ex) {
            log.error("Failed to fetch metadata for {}", normalizedId, ex);
            return Optional.empty();
        }
    }

    public List<VideoMetadata> searchWorkoutVideos(String query, int maxResults) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            log.warn("YouTube API key is not configured; search is disabled");
            return List.of();
        }

        int desiredResults = Math.max(1, Math.min(MAX_RESULTS, maxResults));
        try {
            SearchListResponse searchResponse = youtube.search()
                    .list(List.of("id", "snippet"))
                    .setKey(properties.getApiKey())
                    .setType(Collections.singletonList("video"))
                    .setMaxResults((long) desiredResults)
                    .setQ(query)
                    .execute();

            List<String> videoIds = Optional.ofNullable(searchResponse.getItems())
                    .orElseGet(ArrayList::new)
                    .stream()
                    .map(SearchResult::getId)
                    .filter(Objects::nonNull)
                    .map(id -> normalizeVideoId(id.getVideoId()))
                    .filter(id -> !id.isEmpty())
                    .collect(Collectors.toList());

            if (videoIds.isEmpty()) {
                return List.of();
            }

            VideoListResponse videoListResponse = youtube.videos()
                    .list(List.of("snippet", "contentDetails", "statistics"))
                    .setKey(properties.getApiKey())
                    .setId(videoIds)
                    .execute();

            return Optional.ofNullable(videoListResponse.getItems())
                    .orElseGet(ArrayList::new)
                    .stream()
                    .map(this::toMetadata)
                    .collect(Collectors.toList());
        } catch (IOException ex) {
            log.error("YouTube search failed for query '{}'", query, ex);
            return List.of();
        }
    }

    public int parseDuration(@Nullable String isoDuration) {
        if (isoDuration == null || isoDuration.isBlank()) {
            return 0;
        }
        try {
            Duration duration = Duration.parse(isoDuration);
            return (int) duration.toMinutes();
        } catch (DateTimeParseException ex) {
            log.warn("Invalid ISO duration received: {}", isoDuration);
            return 0;
        }
    }

    public int parseDurationSeconds(@Nullable String isoDuration) {
        if (isoDuration == null || isoDuration.isBlank()) {
            return 0;
        }
        try {
            long seconds = Duration.parse(isoDuration).getSeconds();
            if (seconds > Integer.MAX_VALUE) {
                return Integer.MAX_VALUE;
            }
            if (seconds < Integer.MIN_VALUE) {
                return Integer.MIN_VALUE;
            }
            return (int) seconds;
        } catch (DateTimeParseException ex) {
            log.warn("Invalid ISO duration received: {}", isoDuration);
            return 0;
        }
    }

    private String normalizeVideoId(@Nullable String videoId) {
        if (videoId == null) {
            return "";
        }
        String trimmed = videoId.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        if (trimmed.contains("youtube.com")) {
            int start = trimmed.indexOf("v=");
            if (start > -1) {
                String candidate = trimmed.substring(start + 2);
                int delimiter = candidate.indexOf('&');
                return delimiter > -1 ? candidate.substring(0, delimiter) : candidate;
            }
        }
        if (trimmed.contains("youtu.be/")) {
            int start = trimmed.indexOf("youtu.be/") + "youtu.be/".length();
            String candidate = trimmed.substring(start);
            int delimiter = candidate.indexOf('?');
            return delimiter > -1 ? candidate.substring(0, delimiter) : candidate;
        }
        return trimmed;
    }

    private VideoMetadata toMetadata(Video video) {
        String videoId = Optional.ofNullable(video.getId()).orElse("");
        var snippet = video.getSnippet();
        var thumbnails = snippet != null ? snippet.getThumbnails() : null;
        String thumbnail = thumbnails != null && thumbnails.getHigh() != null
                ? thumbnails.getHigh().getUrl()
                : null;
        String isoDuration = video.getContentDetails() != null ? video.getContentDetails().getDuration() : null;
        int durationSeconds = parseDurationSeconds(isoDuration);
        int durationMinutes = durationSeconds > 0
                ? Math.max(1, (int) Math.ceil(durationSeconds / 60.0))
                : parseDuration(isoDuration);

        return VideoMetadata.builder()
                .youtubeId(videoId)
                .title(snippet != null ? snippet.getTitle() : null)
                .description(snippet != null ? snippet.getDescription() : null)
                .thumbnailUrl(thumbnail)
                .channelId(snippet != null ? snippet.getChannelId() : null)
                .channelTitle(snippet != null ? snippet.getChannelTitle() : null)
                .durationSeconds(durationSeconds)
                .durationMinutes(durationMinutes)
                .viewCount(video.getStatistics() != null && video.getStatistics().getViewCount() != null
                        ? video.getStatistics().getViewCount().longValue()
                        : 0L)
                .build();
    }
}
