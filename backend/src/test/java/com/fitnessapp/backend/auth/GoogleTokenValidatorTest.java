package com.fitnessapp.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoogleTokenValidatorTest {

    @Mock
    private GoogleIdTokenVerifier verifier;

    @InjectMocks
    private GoogleTokenValidator validator;

    @Test
    void getProvider_returnsGoogle() {
        assertEquals(AuthProvider.GOOGLE, validator.getProvider());
    }

    @Test
    void validate_validToken_returnsUserInfo() throws Exception {
        String idToken = "valid-id-token";
        GoogleIdToken googleIdToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);

        when(verifier.verify(idToken)).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(payload.getEmail()).thenReturn("user@example.com");
        when(payload.get("name")).thenReturn("Test User");

        Optional<SocialUserInfo> result = validator.validate(idToken);

        assertTrue(result.isPresent());
        assertEquals("user@example.com", result.get().email());
        assertEquals("Test User", result.get().name());
    }

    @Test
    void validate_invalidToken_returnsEmpty() throws Exception {
        String idToken = "invalid-token";
        when(verifier.verify(idToken)).thenReturn(null);

        Optional<SocialUserInfo> result = validator.validate(idToken);

        assertTrue(result.isEmpty());
    }

    @Test
    void validate_tokenMissingEmail_returnsEmpty() throws Exception {
        String idToken = "token-no-email";
        GoogleIdToken googleIdToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);

        when(verifier.verify(idToken)).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(payload.getEmail()).thenReturn(null);

        Optional<SocialUserInfo> result = validator.validate(idToken);

        assertTrue(result.isEmpty());
    }

    @Test
    void validate_tokenWithBlankEmail_returnsEmpty() throws Exception {
        String idToken = "token-blank-email";
        GoogleIdToken googleIdToken = mock(GoogleIdToken.class);
        GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);

        when(verifier.verify(idToken)).thenReturn(googleIdToken);
        when(googleIdToken.getPayload()).thenReturn(payload);
        when(payload.getEmail()).thenReturn("   ");

        Optional<SocialUserInfo> result = validator.validate(idToken);

        assertTrue(result.isEmpty());
    }

    @Test
    void validate_verifierThrows_returnsEmpty() throws Exception {
        String idToken = "throw-token";
        when(verifier.verify(idToken)).thenThrow(new RuntimeException("Verification failed"));

        Optional<SocialUserInfo> result = validator.validate(idToken);

        assertTrue(result.isEmpty());
    }
}
