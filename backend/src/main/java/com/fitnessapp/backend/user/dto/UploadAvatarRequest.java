package com.fitnessapp.backend.user.dto;

public record UploadAvatarRequest (
	String avatarBase64,
	String fileType
) {}