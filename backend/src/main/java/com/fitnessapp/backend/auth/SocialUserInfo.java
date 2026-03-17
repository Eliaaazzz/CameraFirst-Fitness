package com.fitnessapp.backend.auth;

/**
 * User information extracted from a social provider's ID token.
 *
 * @param email the user's email address
 * @param name  the user's display name (may be null)
 * @param sub   the provider's unique user identifier (e.g. Apple's sub claim)
 */
public record SocialUserInfo(
    String email,
    String name,
    String sub
) {
    public SocialUserInfo(String email, String name) {
        this(email, name, null);
    }
}
