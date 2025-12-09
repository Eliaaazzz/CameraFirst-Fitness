package com.fitnessapp.backend.auth.dto;

/**
 * Response returned after successful authentication.
 */
public record AuthResponse(
    String token,
    String email,
    boolean isNewUser
) {}
