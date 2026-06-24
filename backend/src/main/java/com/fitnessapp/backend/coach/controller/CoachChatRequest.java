package com.fitnessapp.backend.coach.controller;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for a Coach chat turn.
 *
 * @param sessionId existing conversation to continue, or {@code null} to start a new one
 * @param message   the user's message
 */
public record CoachChatRequest(
        UUID sessionId,
        @NotBlank(message = "message is required")
        @Size(max = 4000, message = "message too long")
        String message) {
}
