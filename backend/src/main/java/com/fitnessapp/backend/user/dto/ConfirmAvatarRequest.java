package com.fitnessapp.backend.user.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfirmAvatarRequest(
    @NotBlank(message = "Public URL is required")
    String publicUrl,
    
    @NotBlank(message = "File key is required")
    String fileKey
) {}
