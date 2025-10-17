package com.fitnessapp.backend.youtube;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.config.YouTubeProperties;
import com.fitnessapp.backend.youtube.dto.VideoMetadata;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoContentDetails;
import com.google.api.services.youtube.model.VideoListResponse;
import com.google.api.services.youtube.model.VideoSnippet;
import com.google.api.services.youtube.model.VideoStatistics;
import java.io.IOException;
import java.math.BigInteger;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class YouTubeServiceTest {

    @Mock
    private YouTube youtube;

    @Mock
    private YouTube.Videos videos;

    @Mock
    private YouTube.Videos.List videosList;

    @Mock
    private RedisTemplate<String, VideoMetadata> redisTemplate;

    @Mock
    private ValueOperations<String, VideoMetadata> valueOperations;

    private YouTubeProperties properties;
    private YouTubeService service;

    @BeforeEach
    void setUp() throws IOException {
        properties = new YouTubeProperties();
        properties.setApiKey("test-key");
        properties.setCacheTtl(Duration.ofHours(24));

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(youtube.videos()).thenReturn(videos);
        lenient().when(videos.list(any())).thenReturn(videosList);

        service = new YouTubeService(youtube, redisTemplate, properties);
    }

    @Test
    void fetchVideoMetadataReturnsCachedValueWithoutApiCall() {
        VideoMetadata cached = VideoMetadata.builder()
                .youtubeId("abc123")
                .title("Cached Video")
                .durationMinutes(15)
                .viewCount(100L)
                .build();
        when(valueOperations.get("yt:video:abc123")).thenReturn(cached);

        Optional<VideoMetadata> result = service.fetchVideoMetadata("abc123");

        assertThat(result).contains(cached);
        verify(valueOperations).get("yt:video:abc123");
        verifyNoInteractions(videos);
    }

    @Test
    void fetchVideoMetadataCachesApiResponse() throws IOException {
        when(valueOperations.get("yt:video:abc123")).thenReturn(null);

        Video video = new Video();
        video.setId("abc123");
        VideoSnippet snippet = new VideoSnippet();
        snippet.setTitle("API Video");
        snippet.setDescription("desc");
        snippet.setChannelTitle("Channel");
        video.setSnippet(snippet);
        VideoContentDetails details = new VideoContentDetails();
        details.setDuration("PT20M30S");
        video.setContentDetails(details);
        VideoStatistics statistics = new VideoStatistics();
        statistics.setViewCount(BigInteger.valueOf(4250));
        video.setStatistics(statistics);

        VideoListResponse response = new VideoListResponse();
        response.setItems(List.of(video));

        when(videosList.setId(List.of("abc123"))).thenReturn(videosList);
        when(videosList.setKey("test-key")).thenReturn(videosList);
        when(videosList.execute()).thenReturn(response);

        Optional<VideoMetadata> result = service.fetchVideoMetadata("https://www.youtube.com/watch?v=abc123&ab_channel=test");

        assertThat(result).isPresent();
        VideoMetadata metadata = result.orElseThrow();
        assertThat(metadata.getDurationMinutes()).isEqualTo(21);
        assertThat(metadata.getViewCount()).isEqualTo(4250L);

        verify(valueOperations).set(eq("yt:video:abc123"), eq(metadata), eq(properties.getCacheTtl()));
    }

    @Test
    void parseDurationHandlesInvalidInput() {
        assertThat(service.parseDuration(null)).isZero();
        assertThat(service.parseDuration(" ")).isZero();
        assertThat(service.parseDuration("PT15M")).isEqualTo(15);
        assertThat(service.parseDuration("PT1H30M")).isEqualTo(90);
    }
}
