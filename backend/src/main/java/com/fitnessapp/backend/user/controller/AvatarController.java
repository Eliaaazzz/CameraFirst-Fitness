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

import com.fitnessapp.backend.common.service.R2StorageService;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.user.dto.ConfirmAvatarRequest;
import com.fitnessapp.backend.user.dto.UploadAvatarRequest;
import com.fitnessapp.backend.user.dto.UploadAvatarResponse;
import com.fitnessapp.backend.user.dto.UserProfileResponse;
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

    private final R2StorageService r2StorageService;
    private final UserProfileService userProfileService;

    @PostMapping("/presign")
    public ResponseEntity<UploadAvatarResponse> presignAvatarUpload(
            @Valid @RequestBody UploadAvatarRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {

        if (currentUser == null || currentUser.userId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = currentUser.userId();
        String rawContentType = request.fileType();
        if (rawContentType == null || rawContentType.isBlank()) {
            log.warn("Missing content type (user: {})", userId);
            return ResponseEntity.badRequest().build();
        }

        String contentType = rawContentType.trim().toLowerCase();
        if (!ALLOWED_MIME_TYPES.contains(contentType)) {
            log.warn("Invalid content type: {} (user: {})", rawContentType, userId);
            return ResponseEntity.badRequest().build();
        }

        var result = r2StorageService.generatePresignedUrl(PATH_PREFIX, userId, contentType);

        return ResponseEntity.ok(new UploadAvatarResponse(
            result.uploadUrl(), result.publicUrl(), result.fileKey()
        ));
    }

    @PostMapping("/confirm")
    public ResponseEntity<UserProfileResponse> confirmAvatarUpload(
            @Valid @RequestBody ConfirmAvatarRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {

        if (currentUser == null || currentUser.userId() == null) {
            log.warn("Unauthorized avatar confirm attempt");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        UUID userId = currentUser.userId();
        log.info("Confirming avatar upload for user: {}, publicUrl: {}, fileKey: {}",
            userId, request.publicUrl(), request.fileKey());

        // updateAvatarAndGetResponse handles the transaction and returns the DTO
        // to avoid LazyInitializationException when accessing allergens
        var result = userProfileService.updateAvatarAndGetResponse(userId, request.publicUrl(), request.fileKey());
        UserProfileResponse response = result.response();
        String oldFileKey = result.oldFileKey();

        // Delete old avatar if exists (outside transaction to not block DB)
        if (oldFileKey != null && !oldFileKey.isEmpty()) {
            try {
                log.info("Deleting old avatar file: {}", oldFileKey);
                r2StorageService.deleteFile(oldFileKey);
            } catch (Exception e) {
                log.warn("Failed to delete old avatar: {}", e.getMessage());
            }
        }

        log.info("Returning response with avatarUrl: {}", response.avatarUrl());

        return ResponseEntity.ok(response);
    }
}