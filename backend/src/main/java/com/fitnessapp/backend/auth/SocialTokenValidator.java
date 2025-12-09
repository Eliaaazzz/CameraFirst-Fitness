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
}
