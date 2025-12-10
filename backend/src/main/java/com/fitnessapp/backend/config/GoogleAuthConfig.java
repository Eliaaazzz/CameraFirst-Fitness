package com.fitnessapp.backend.config;

import java.util.Collections;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

@Configuration
@EnableConfigurationProperties(GoogleProperties.class)
public class GoogleAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthConfig.class);

    @Bean
    GoogleIdTokenVerifier googleIdTokenVerifier(GoogleProperties properties) {
    GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
        new NetHttpTransport(),
        GsonFactory.getDefaultInstance());

        if (StringUtils.hasText(properties.getClientId())) {
            builder.setAudience(Collections.singletonList(properties.getClientId().trim()));
        } else {
            log.warn("Google client ID is not configured; Google token validation will accept any audience");
        }

        return builder.build();
    }
}
