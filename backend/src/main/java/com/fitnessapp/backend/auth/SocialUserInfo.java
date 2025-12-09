package com.fitnessapp.backend.auth;

/**
 * User information extracted from a social provider's ID token.
 */
public record SocialUserInfo(
    String email,
    String name
) {}
