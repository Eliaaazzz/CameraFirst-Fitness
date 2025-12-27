package com.fitnessapp.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@Validated
@ConfigurationProperties(prefix = "app.youtube")
public class YouTubeProperties {

    private String apiKey = "";

    private Duration cacheTtl = Duration.ofHours(24);

    /**
     * Feature flag: enable new ingestion pipeline targeting exercise_videos.
     * Disabled by default to prevent accidental writes.
     */
    private boolean ingestionEnabled = false;

    private final Quota quota = new Quota();

    @Getter
    @Setter
    @ToString
    public static class Quota {

        private boolean warningsEnabled = true;

        @Min(10)
        @Max(100)
        private int alertPercent = 80;
    }
}
