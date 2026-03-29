package com.fitnessapp.backend.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

@Configuration
@EnableConfigurationProperties(GoogleProperties.class)
public class GoogleAuthConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthConfig.class);

    @Bean
    GoogleIdTokenVerifier googleIdTokenVerifier(GoogleProperties properties) {
        NetHttpTransport transport = new NetHttpTransport.Builder().build();

        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                transport, GsonFactory.getDefaultInstance());

        List<String> clientIds = properties.getClientIds();
        if (!clientIds.isEmpty()) {
            builder.setAudience(clientIds);
            log.info("Configured {} Google OAuth audience(s) for token validation: {}",
                    clientIds.size(),
                    clientIds.stream().map(id -> id.substring(0, Math.min(20, id.length())) + "...").toList());
        } else {
            log.warn("GOOGLE_CLIENT_ID is not configured — Google token validation will accept any audience. "
                    + "For production, set GOOGLE_CLIENT_ID to a comma-separated list of all platform client IDs "
                    + "(web, iOS, Android).");
        }

        return builder.build();
    }
}
