package com.fitnessapp.backend.user.dto;

public record UploadAvatarResponse (
	String uploadUrl,
	String publicUrl,
	String fileKey
) {}






