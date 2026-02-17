package com.fitnessapp.backend.auth;

/**
 * Authentication provider types supported by the application.
 */
public enum AuthProvider {
    GOOGLE,
    APPLE,
    /** @deprecated Facebook login removed. Kept for backward-compatible deserialization of legacy rows. */
    FACEBOOK,
    LOCAL,
    API_KEY
}
