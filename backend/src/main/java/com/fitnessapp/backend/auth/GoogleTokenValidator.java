package com.fitnessapp.backend.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenValidator implements SocialTokenValidator {

    private final GoogleIdTokenVerifier verifier;

    @Override
    public AuthProvider getProvider() {
        return AuthProvider.GOOGLE;
    }

    @Override
    public Optional<SocialUserInfo> validate(String idToken) {
        try {
            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                log.warn("Google ID token verification failed — token is invalid, expired, "
                        + "or its audience does not match GOOGLE_CLIENT_ID. "
                        + "Ensure GOOGLE_CLIENT_ID includes all platform client IDs "
                        + "(web, iOS, Android) comma-separated.");
                return Optional.empty();
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String email = payload.getEmail();

            if (email == null || email.isBlank()) {
                log.warn("Google token missing email");
                return Optional.empty();
            }

            String name = (String) payload.get("name");
            return Optional.of(new SocialUserInfo(email, name));

        } catch (Exception e) {
            log.error("Failed to validate Google token", e);
            return Optional.empty();
        }
    }
}
