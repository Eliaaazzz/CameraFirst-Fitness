package com.fitnessapp.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Validates Facebook user access tokens via Graph API.
 *
 * <p>Flow:
 * 1) debug_token => verifies token validity + app ownership
 * 2) /me fields=id,name,email => extracts user profile
 */
@Component
@Slf4j
public class FacebookTokenValidator implements SocialTokenValidator {

    private static final String FACEBOOK_DEBUG_TOKEN_URL = "https://graph.facebook.com/debug_token";
    private static final String FACEBOOK_ME_URL = "https://graph.facebook.com/me";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.facebook.app-id:}")
    private String appId;

    @Value("${app.facebook.app-secret:}")
    private String appSecret;

    @Override
    public AuthProvider getProvider() {
        return AuthProvider.FACEBOOK;
    }

    @Override
    public Optional<SocialUserInfo> validate(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return Optional.empty();
        }
        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            log.warn("Facebook app credentials are missing - Facebook Sign-In will not work");
            return Optional.empty();
        }
        if (!isTokenValidForApp(accessToken)) {
            return Optional.empty();
        }
        return fetchUserInfo(accessToken);
    }

    private boolean isTokenValidForApp(String userAccessToken) {
        try {
            String appAccessToken = appId + "|" + appSecret;
            String url = FACEBOOK_DEBUG_TOKEN_URL
                    + "?input_token=" + urlEncode(userAccessToken)
                    + "&access_token=" + urlEncode(appAccessToken);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Facebook debug_token failed: HTTP {}", response.statusCode());
                return false;
            }

            JsonNode data = objectMapper.readTree(response.body()).path("data");
            boolean isValid = data.path("is_valid").asBoolean(false);
            String tokenAppId = data.path("app_id").asText("");
            long expiresAt = data.path("expires_at").asLong(0);

            if (!isValid) {
                log.warn("Facebook token marked invalid by debug_token");
                return false;
            }
            if (!appId.equals(tokenAppId)) {
                log.warn("Facebook token app_id mismatch: expected {}, got {}", appId, tokenAppId);
                return false;
            }
            if (expiresAt > 0 && expiresAt < Instant.now().getEpochSecond()) {
                log.warn("Facebook token expired at {}", expiresAt);
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Failed to validate Facebook token", e);
            return false;
        }
    }

    private Optional<SocialUserInfo> fetchUserInfo(String userAccessToken) {
        try {
            String url = FACEBOOK_ME_URL
                    + "?fields=id,name,email"
                    + "&access_token=" + urlEncode(userAccessToken);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("Facebook /me failed: HTTP {}", response.statusCode());
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(response.body());
            String email = root.path("email").asText("");
            String name = root.path("name").asText(null);
            String id = root.path("id").asText("");

            // Some users may not grant `email`; use stable provider id fallback.
            if ((email == null || email.isBlank()) && id != null && !id.isBlank()) {
                email = "fb_" + id + "@facebook.local";
                log.info("Facebook user missing email; using provider-based placeholder for id={}", id);
            }

            if (email == null || email.isBlank()) {
                return Optional.empty();
            }

            return Optional.of(new SocialUserInfo(email, name));
        } catch (Exception e) {
            log.error("Failed to fetch Facebook user info", e);
            return Optional.empty();
        }
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}

