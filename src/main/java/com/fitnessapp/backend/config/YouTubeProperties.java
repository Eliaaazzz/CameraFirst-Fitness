package com.fitnessapp.backend.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Duration;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@ToString
@Validated
@ConfigurationProperties(prefix = "app.youtube")
public class YouTubeProperties {

    private String apiKey = "";

    private Duration cacheTtl = Duration.ofHours(24);

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
