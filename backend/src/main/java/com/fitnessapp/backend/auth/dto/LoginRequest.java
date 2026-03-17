package com.fitnessapp.backend.auth.dto;

import com.fitnessapp.backend.auth.AuthProvider;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Unified login request supporting social and email/password authentication.
 *
 * <p>For social login (GOOGLE, APPLE):
 * - Set loginType to GOOGLE or APPLE
 * - Provide idToken
 * - fullName is optional and is mainly used for Apple Sign In first-run profile setup
 * - email and password should be null
 *
 * <p>For email/password login:
 * - Set loginType to LOCAL
 * - Provide email and password
 * - idToken should be null
 */
public record LoginRequest(
    @NotNull(message = "Login type is required")
    AuthProvider loginType,

    String idToken,

    String fullName,

    /** Raw nonce for Apple Sign In replay-attack prevention. */
    String nonce,

    /** Apple authorization code for refresh token exchange. */
    String authorizationCode,

    @Email(message = "Invalid email format")
    String email,

    @Size(min = 8, message = "Password must be at least 8 characters")
    String password
) {

    public boolean isSocialLogin() {
        return loginType != AuthProvider.LOCAL;
    }
}
