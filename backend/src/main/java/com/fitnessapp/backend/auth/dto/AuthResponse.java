package com.fitnessapp.backend.auth.dto;

import java.util.UUID;

/**
 * Response returned after successful authentication.
 * Includes inline user info so the client never needs a separate /me fetch
 * after login — eliminates cold-start race conditions on serverless.
 */
public record AuthResponse(
    String token,
    String email,
    boolean isNewUser,
    UserSnapshot user
) {
    /** Subset of user fields needed by the client immediately after login. */
    public record UserSnapshot(
        UUID userId,
        String username,
        int currentStreak,
        String level,
        int timeBucket
    ) {}
}
