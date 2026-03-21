package com.fitnessapp.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;

class GoogleAuthConfigTest {

    private final GoogleAuthConfig config = new GoogleAuthConfig();

    @Test
    void googleIdTokenVerifier_acceptsAllConfiguredAudiences() {
        GoogleProperties properties = new GoogleProperties();
        properties.setClientId(" web-client-id , ios-client-id,android-client-id,ios-client-id ");

        GoogleIdTokenVerifier verifier = config.googleIdTokenVerifier(properties);

        assertEquals(
                List.of("web-client-id", "ios-client-id", "android-client-id"),
                List.copyOf(verifier.getAudience()));
    }

    @Test
    void googleIdTokenVerifier_leavesAudienceUnsetWhenClientIdsMissing() {
        GoogleProperties properties = new GoogleProperties();

        GoogleIdTokenVerifier verifier = config.googleIdTokenVerifier(properties);

        assertTrue(verifier.getAudience() == null || verifier.getAudience().isEmpty());
    }
}
