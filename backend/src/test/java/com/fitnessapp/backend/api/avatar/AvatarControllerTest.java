package com.fitnessapp.backend.api.avatar;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.common.service.R2StorageService;
import com.fitnessapp.backend.common.service.R2StorageService.PresignedUploadResult;
import com.fitnessapp.backend.security.AuthenticatedUser;
import com.fitnessapp.backend.user.controller.AvatarController;
import com.fitnessapp.backend.user.dto.ConfirmAvatarRequest;
import com.fitnessapp.backend.user.dto.UploadAvatarRequest;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.service.UserProfileService;

/**
 * Unit tests for AvatarController using standaloneSetup with Spring Security's
 * AuthenticationPrincipalArgumentResolver for @AuthenticationPrincipal support.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Avatar Controller Tests")
class AvatarControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private R2StorageService r2StorageService;

    @Mock
    private UserProfileService userProfileService;

    private UUID testUserId;
    private AuthenticatedUser authenticatedUser;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        authenticatedUser = new AuthenticatedUser(1L, "test-key", testUserId);
        authentication = new UsernamePasswordAuthenticationToken(authenticatedUser, null, Collections.emptyList());

        // Set up SecurityContext for @AuthenticationPrincipal resolution
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AvatarController controller = new AvatarController(r2StorageService, userProfileService);

        // Use Spring Security's built-in AuthenticationPrincipalArgumentResolver
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Nested
    @DisplayName("POST /api/v1/user/avatar/presign")
    class PresignEndpoint {

        @Test
        @DisplayName("should return presigned URL for valid JPEG image request")
        void presignReturnsUrlForJpeg() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "image/jpeg");
            PresignedUploadResult mockResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url",
                "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/uuid",
                "avatars/" + testUserId + "/uuid"
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/jpeg")))
                .thenReturn(mockResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadUrl").value(mockResult.uploadUrl()))
                .andExpect(jsonPath("$.publicUrl").value(mockResult.publicUrl()))
                .andExpect(jsonPath("$.fileKey").value(mockResult.fileKey()));

            verify(r2StorageService).generatePresignedUrl("avatars", testUserId, "image/jpeg");
        }

        @Test
        @DisplayName("should return presigned URL for valid PNG image request")
        void presignReturnsUrlForPng() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "image/png");
            PresignedUploadResult mockResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url",
                "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/uuid",
                "avatars/" + testUserId + "/uuid"
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/png")))
                .thenReturn(mockResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadUrl").isNotEmpty());
        }

        @Test
        @DisplayName("should return 400 for unsupported file type")
        void presignRejectsBadContentType() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "application/pdf");

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isBadRequest());

            verify(r2StorageService, never()).generatePresignedUrl(any(), any(), any());
        }

        @Test
        @DisplayName("should return 400 when fileType is missing")
        void presignRejectsMissingFileType() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, null);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isBadRequest());

            verify(r2StorageService, never()).generatePresignedUrl(any(), any(), any());
        }

        @Test
        @DisplayName("should accept uppercase MIME type by normalizing")
        void presignNormalizesContentType() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "IMAGE/JPEG");
            PresignedUploadResult mockResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url",
                "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/uuid",
                "avatars/" + testUserId + "/uuid"
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/jpeg")))
                .thenReturn(mockResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadUrl").value(mockResult.uploadUrl()));

            verify(r2StorageService).generatePresignedUrl("avatars", testUserId, "image/jpeg");
        }

        @Test
        @DisplayName("should return 401 when unauthenticated")
        void presignRejectsUnauthenticated() throws Exception {
            SecurityContextHolder.clearContext();
            UploadAvatarRequest request = new UploadAvatarRequest(null, "image/jpeg");

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

            verify(r2StorageService, never()).generatePresignedUrl(any(), any(), any());
        }

        @Test
        @DisplayName("should accept webp format images")
        void presignAcceptsWebpImage() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "image/webp");
            PresignedUploadResult mockResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url",
                "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/uuid",
                "avatars/" + testUserId + "/uuid"
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/webp")))
                .thenReturn(mockResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadUrl").value(mockResult.uploadUrl()));

            verify(r2StorageService).generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/webp"));
        }

        @Test
        @DisplayName("should handle mixed case content types")
        void presignHandlesMixedCaseContentType() throws Exception {
            UploadAvatarRequest request = new UploadAvatarRequest(null, "IMAGE/JPEG");
            PresignedUploadResult mockResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url",
                "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/uuid",
                "avatars/" + testUserId + "/uuid"
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/jpeg")))
                .thenReturn(mockResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk());

            // Should be normalized to lowercase
            verify(r2StorageService).generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/jpeg"));
        }

        @Test
        @DisplayName("should reject multiple unsupported file types")
        void presignRejectsMultipleUnsupportedTypes() throws Exception {
            String[] unsupportedTypes = {
                "application/pdf",
                "text/plain",
                "video/mp4",
                "application/zip",
                "image/gif",
                "image/svg+xml"
            };

            for (String contentType : unsupportedTypes) {
                UploadAvatarRequest request = new UploadAvatarRequest(null, contentType);

                mockMvc.perform(post("/api/v1/user/avatar/presign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authentication(authentication)))
                    .andExpect(status().isBadRequest());
            }

            verify(r2StorageService, never()).generatePresignedUrl(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/user/avatar/confirm")
    class ConfirmEndpoint {

        @Test
        @DisplayName("should save avatar URL to user profile for new user")
        void confirmSavesAvatarToNewProfile() throws Exception {
            String publicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/new-avatar.jpg";
            String fileKey = "avatars/" + testUserId + "/new-avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(publicUrl, fileKey);

            // Mock getOrCreateProfile to return a new profile
            UserProfile newProfile = new UserProfile();
            newProfile.setUserId(testUserId);
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(newProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(publicUrl);
            savedProfile.setAvatarFileKey(fileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(publicUrl));

            ArgumentCaptor<UserProfile> profileCaptor = ArgumentCaptor.forClass(UserProfile.class);
            verify(userProfileService).save(profileCaptor.capture());

            UserProfile capturedProfile = profileCaptor.getValue();
            assertThat(capturedProfile.getAvatarUrl()).isEqualTo(publicUrl);
            assertThat(capturedProfile.getAvatarFileKey()).isEqualTo(fileKey);
        }

        @Test
        @DisplayName("should update avatar URL for existing user and delete old avatar")
        void confirmUpdatesExistingProfileAndDeletesOldAvatar() throws Exception {
            String oldFileKey = "avatars/" + testUserId + "/old-avatar.jpg";
            String newPublicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/new-avatar.jpg";
            String newFileKey = "avatars/" + testUserId + "/new-avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(newPublicUrl, newFileKey);

            UserProfile existingProfile = new UserProfile();
            existingProfile.setUserId(testUserId);
            existingProfile.setAvatarUrl("https://old-url.com/avatar.jpg");
            existingProfile.setAvatarFileKey(oldFileKey);
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(existingProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(newPublicUrl);
            savedProfile.setAvatarFileKey(newFileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(newPublicUrl));

            verify(r2StorageService).deleteFile(oldFileKey);

            ArgumentCaptor<UserProfile> profileCaptor = ArgumentCaptor.forClass(UserProfile.class);
            verify(userProfileService).save(profileCaptor.capture());

            UserProfile capturedProfile = profileCaptor.getValue();
            assertThat(capturedProfile.getAvatarUrl()).isEqualTo(newPublicUrl);
            assertThat(capturedProfile.getAvatarFileKey()).isEqualTo(newFileKey);
        }

        @Test
        @DisplayName("should handle user with no previous avatar gracefully")
        void confirmHandlesNoPreviousAvatar() throws Exception {
            String publicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/avatar.jpg";
            String fileKey = "avatars/" + testUserId + "/avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(publicUrl, fileKey);

            UserProfile existingProfile = new UserProfile();
            existingProfile.setUserId(testUserId);
            existingProfile.setAvatarUrl(null);
            existingProfile.setAvatarFileKey(null);
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(existingProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(publicUrl);
            savedProfile.setAvatarFileKey(fileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk());

            verify(r2StorageService, never()).deleteFile(any());
        }

        @Test
        @DisplayName("should not delete old avatar when old file key is empty")
        void confirmDoesNotDeleteWhenOldFileKeyEmpty() throws Exception {
            String publicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/avatar.jpg";
            String fileKey = "avatars/" + testUserId + "/avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(publicUrl, fileKey);

            UserProfile existingProfile = new UserProfile();
            existingProfile.setUserId(testUserId);
            existingProfile.setAvatarUrl("https://old-url.com/avatar.jpg");
            existingProfile.setAvatarFileKey("");
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(existingProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(publicUrl);
            savedProfile.setAvatarFileKey(fileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk());

            verify(r2StorageService, never()).deleteFile(any());
        }

        @Test
        @DisplayName("should return 401 when unauthenticated")
        void confirmRejectsUnauthenticated() throws Exception {
            SecurityContextHolder.clearContext();
            ConfirmAvatarRequest request = new ConfirmAvatarRequest("https://example.com/avatar.jpg", "avatars/x");

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

            verify(userProfileService, never()).save(any(UserProfile.class));
        }

        @Test
        @DisplayName("should handle empty file key gracefully")
        void confirmHandlesEmptyFileKey() throws Exception {
            String publicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/avatar.jpg";
            String fileKey = "avatars/" + testUserId + "/avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(publicUrl, fileKey);

            UserProfile existingProfile = new UserProfile();
            existingProfile.setUserId(testUserId);
            existingProfile.setAvatarUrl("old-url");
            existingProfile.setAvatarFileKey("");  // Empty string
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(existingProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(publicUrl);
            savedProfile.setAvatarFileKey(fileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk());

            // Should not attempt to delete empty file key
            verify(r2StorageService, never()).deleteFile(any());
        }

        @Test
        @DisplayName("should continue if old avatar deletion fails")
        void confirmContinuesOnDeletionFailure() throws Exception {
            String oldFileKey = "avatars/" + testUserId + "/old-avatar.jpg";
            String newPublicUrl = "https://bucket.s3.us-west-2.amazonaws.com/avatars/" + testUserId + "/new-avatar.jpg";
            String newFileKey = "avatars/" + testUserId + "/new-avatar.jpg";
            ConfirmAvatarRequest request = new ConfirmAvatarRequest(newPublicUrl, newFileKey);

            UserProfile existingProfile = new UserProfile();
            existingProfile.setUserId(testUserId);
            existingProfile.setAvatarUrl("https://old-url.com/avatar.jpg");
            existingProfile.setAvatarFileKey(oldFileKey);
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(existingProfile);

            // Simulate S3 deletion failure using doThrow for void method
            doThrow(new RuntimeException("S3 deletion failed"))
                .when(r2StorageService).deleteFile(oldFileKey);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(newPublicUrl);
            savedProfile.setAvatarFileKey(newFileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            // Should still succeed despite deletion failure
            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(newPublicUrl));

            verify(r2StorageService).deleteFile(oldFileKey);
            verify(userProfileService).save(any(UserProfile.class));
        }
    }

    @Nested
    @DisplayName("End-to-end Avatar Upload Flow")
    class AvatarUploadFlow {

        @Test
        @DisplayName("should complete full avatar upload workflow: presign -> upload -> confirm")
        void fullAvatarUploadWorkflow() throws Exception {
            // Step 1: Request presigned URL
            UploadAvatarRequest presignRequest = new UploadAvatarRequest(null, "image/jpeg");
            String fileKey = "avatars/" + testUserId + "/" + UUID.randomUUID();
            String publicUrl = "https://bucket.s3.us-west-2.amazonaws.com/" + fileKey;
            PresignedUploadResult presignResult = new PresignedUploadResult(
                "https://s3.amazonaws.com/bucket/presigned-url?X-Amz-Algorithm=...",
                publicUrl,
                fileKey
            );

            when(r2StorageService.generatePresignedUrl(eq("avatars"), eq(testUserId), eq("image/jpeg")))
                .thenReturn(presignResult);

            mockMvc.perform(post("/api/v1/user/avatar/presign")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(presignRequest))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadUrl").isNotEmpty())
                .andExpect(jsonPath("$.publicUrl").value(publicUrl))
                .andExpect(jsonPath("$.fileKey").value(fileKey));

            // Step 2: (Simulated) Client uploads image directly to S3 using presigned URL

            // Step 3: Confirm upload and save to profile
            ConfirmAvatarRequest confirmRequest = new ConfirmAvatarRequest(publicUrl, fileKey);

            // Mock getOrCreateProfile to return a new profile
            UserProfile newProfile = new UserProfile();
            newProfile.setUserId(testUserId);
            when(userProfileService.getOrCreateProfile(testUserId)).thenReturn(newProfile);

            UserProfile savedProfile = new UserProfile();
            savedProfile.setUserId(testUserId);
            savedProfile.setAvatarUrl(publicUrl);
            savedProfile.setAvatarFileKey(fileKey);
            when(userProfileService.save(any(UserProfile.class))).thenReturn(savedProfile);

            mockMvc.perform(post("/api/v1/user/avatar/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(confirmRequest))
                    .with(authentication(authentication)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(publicUrl));

            verify(userProfileService).save(any(UserProfile.class));
        }
    }
}
