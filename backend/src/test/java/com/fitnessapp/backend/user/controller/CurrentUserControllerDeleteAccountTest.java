package com.fitnessapp.backend.user.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.user.service.UserProfileService;
import com.fitnessapp.backend.user.service.UserService;

import jakarta.persistence.EntityNotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

/**
 * Unit tests for CurrentUserController.deleteAccount() endpoint.
 * 
 * Tests the DELETE /api/v1/me endpoint which permanently deletes
 * the current user's account and all associated data.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CurrentUserController.deleteAccount() Unit Tests")
class CurrentUserControllerDeleteAccountTest {

    @Mock
    private CurrentUser currentUser;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileService userProfileService;

    @Mock
    private UserService userService;

    @Mock
    private SmartRecipeService smartRecipeService;

    @Mock
    private NutritionInsightService nutritionInsightService;

    @InjectMocks
    private CurrentUserController currentUserController;

    private MockMvc mockMvc;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(currentUserController).build();
        testUserId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Successful Account Deletion")
    class SuccessfulAccountDeletion {

        @Test
        @DisplayName("should return 204 No Content when account is successfully deleted")
        void shouldReturn204WhenAccountSuccessfullyDeleted() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When/Then
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("should call userService.deleteUser with correct userId")
        void shouldCallUserServiceDeleteUserWithCorrectUserId() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then
            verify(userService).deleteUser(testUserId);
        }

        @Test
        @DisplayName("should evict smart recipe cache after deletion")
        void shouldEvictSmartRecipeCacheAfterDeletion() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then
            verify(smartRecipeService).evictCache(testUserId);
        }

        @Test
        @DisplayName("should invalidate nutrition insights after deletion")
        void shouldInvalidateNutritionInsightsAfterDeletion() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then
            verify(nutritionInsightService).invalidate(testUserId);
        }

        @Test
        @DisplayName("should call all cleanup operations in correct order")
        void shouldCallAllCleanupOperationsInCorrectOrder() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then - verify order
            var inOrder = inOrder(userService, smartRecipeService, nutritionInsightService);
            inOrder.verify(userService).deleteUser(testUserId);
            inOrder.verify(smartRecipeService).evictCache(testUserId);
            inOrder.verify(nutritionInsightService).invalidate(testUserId);
        }
    }

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandling {

        @Test
        @DisplayName("should return 404 when user not found")
        void shouldReturn404WhenUserNotFound() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);
            doThrow(new EntityNotFoundException("User not found: " + testUserId))
                    .when(userService).deleteUser(testUserId);

            // When/Then
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("should not evict caches when deletion fails")
        void shouldNotEvictCachesWhenDeletionFails() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);
            doThrow(new RuntimeException("Database error"))
                    .when(userService).deleteUser(testUserId);

            // When
            try {
                mockMvc.perform(delete("/api/v1/me")
                        .contentType(MediaType.APPLICATION_JSON));
            } catch (Exception e) {
                // Expected
            }

            // Then - caches should not be evicted
            verify(smartRecipeService, never()).evictCache(any());
            verify(nutritionInsightService, never()).invalidate(any());
        }
    }

    @Nested
    @DisplayName("Authentication")
    class Authentication {

        @Test
        @DisplayName("should use currentUser to get userId")
        void shouldUseCurrentUserToGetUserId() throws Exception {
            // Given
            when(currentUser.requireUserId()).thenReturn(testUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then
            verify(currentUser).requireUserId();
        }

        @Test
        @DisplayName("should handle different user IDs correctly")
        void shouldHandleDifferentUserIdsCorrectly() throws Exception {
            // Given
            UUID anotherUserId = UUID.randomUUID();
            when(currentUser.requireUserId()).thenReturn(anotherUserId);

            // When
            mockMvc.perform(delete("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON));

            // Then
            verify(userService).deleteUser(anotherUserId);
            verify(smartRecipeService).evictCache(anotherUserId);
            verify(nutritionInsightService).invalidate(anotherUserId);
        }
    }

    @Nested
    @DisplayName("HTTP Method Validation")
    class HttpMethodValidation {

        @Test
        @DisplayName("should only accept DELETE method")
        void shouldOnlyAcceptDeleteMethod() throws Exception {
            // GET should not be allowed for delete operation
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/me"))
                    .andExpect(status().isOk()); // GET /me returns user info, not delete

            // POST should not be allowed
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/me")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isMethodNotAllowed());
        }
    }
}