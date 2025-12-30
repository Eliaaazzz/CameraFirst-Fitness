package com.fitnessapp.backend.user.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.common.service.S3Service;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.user.dto.ConfirmAvatarRequest;
import com.fitnessapp.backend.user.dto.UploadAvatarRequest;
import com.fitnessapp.backend.user.dto.UploadAvatarResponse;
import com.fitnessapp.backend.user.dto.UserProfileMapper;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.service.UserProfileService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/user/avatar")
@RequiredArgsConstructor
@Validated
public class AvatarController {

    private static final String PATH_PREFIX = "avatars";
    private static final List<String> ALLOWED_MIME_TYPES = List.of(
        "image/jpeg", "image/jpg", "image/png", "image/webp"
    );

    private final S3Service s3Service;
    private final UserProfileService userProfileService;

    @PostMapping("/presign")
    public ResponseEntity<UploadAvatarResponse> presignAvatarUpload(
            @Valid @RequestBody UploadAvatarRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {

        if (currentUser == null || currentUser.userId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = currentUser.userId();
        String contentType = request.fileType();

        if (!ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            log.warn("Invalid content type: {} (user: {})", contentType, userId);
            return ResponseEntity.badRequest().build();
        }

        var result = s3Service.generatePresignedUrl(PATH_PREFIX, userId, contentType);

        return ResponseEntity.ok(new UploadAvatarResponse(
            result.uploadUrl(), result.publicUrl(), result.fileKey()
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<UserProfileResponse> confirmAvatarUpload(
            @Valid @RequestBody ConfirmAvatarRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {

        if (currentUser == null || currentUser.userId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = currentUser.userId();

        UserProfile profile = userProfileService.getProfile(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUserId(userId);
                    return newProfile;
                });

        // Delete old avatar if exists
        String oldFileKey = profile.getAvatarFileKey();
        if (oldFileKey != null && !oldFileKey.isEmpty()) {
            try {
                s3Service.deleteFile(oldFileKey);
            } catch (Exception e) {
                log.warn("Failed to delete old avatar: {}", e.getMessage());
            }
        }

        profile.setAvatarUrl(request.publicUrl());
        profile.setAvatarFileKey(request.fileKey());

        UserProfile saved = userProfileService.save(profile);

        return ResponseEntity.ok(UserProfileMapper.toResponse(saved));
    }
}
