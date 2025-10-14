package com.fitnessapp.backend.config;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.youtube.YouTube;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(YouTubeProperties.class)
public class YouTubeConfig {

    @Bean
    public YouTube youtubeClient(
            @Value("${app.youtube.root-url:}") String rootUrl,
            @Value("${app.youtube.service-path:youtube/v3/}") String servicePath) {
        YouTube.Builder builder = new YouTube.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance(), request -> {})
                .setApplicationName("FitnessApp-MVP");
        if (rootUrl != null && !rootUrl.isBlank()) {
            builder.setRootUrl(rootUrl);
            if (servicePath != null && !servicePath.isBlank()) {
                builder.setServicePath(servicePath);
            }
        }
        return builder.build();
    }
}
