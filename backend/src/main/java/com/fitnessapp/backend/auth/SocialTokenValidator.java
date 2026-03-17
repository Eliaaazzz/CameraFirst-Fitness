package com.fitnessapp.backend.auth;

import java.util.Optional;

/**
 * Interface for validating social provider ID tokens.
 * Implementations should validate the token and extract user information.
 */
public interface SocialTokenValidator {

    /**
     * Returns the provider this validator handles.
     */
    AuthProvider getProvider();

    /**
     * Validates the given ID token and extracts user info.
     *
     * @param idToken the ID token from the social provider
     * @return user info if token is valid, empty otherwise
     */
    Optional<SocialUserInfo> validate(String idToken);

    /**
     * Validates the given ID token with nonce verification.
     * Providers that don't support nonce (e.g. Google) fall back to {@link #validate(String)}.
     *
     * @param idToken the ID token from the social provider
     * @param nonce   raw nonce to verify against the token's hashed nonce claim (nullable)
     * @return user info if token is valid, empty otherwise
     */
    default Optional<SocialUserInfo> validate(String idToken, String nonce) {
        return validate(idToken);
    }
}
