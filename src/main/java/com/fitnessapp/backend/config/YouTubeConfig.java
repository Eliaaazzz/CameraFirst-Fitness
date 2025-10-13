package com.fitnessapp.backend.config;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.youtube.YouTube;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(YouTubeProperties.class)
public class YouTubeConfig {

    @Bean
    public YouTube youtubeClient() {
        return new YouTube.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance(), request -> {})
                .setApplicationName("FitnessApp-MVP")
                .build();
    }
}
