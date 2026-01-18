package com.fitnessapp.backend.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.workout.repository.UserSavedWorkoutRepository;

import jakarta.persistence.EntityNotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

/**
 * Unit tests for UserService.deleteUser() method.
 * 
 * These tests verify:
 * 1. Successful deletion of user and all related data
 * 2. Correct order of deletion operations (respecting foreign key constraints)
 * 3. Proper error handling for non-existent users
 * 4. All repository delete methods are called with correct parameters
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService.deleteUser() Unit Tests")
class UserServiceDeleteUserTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private MealLogRepository mealLogRepository;

    @Mock
    private UserSavedRecipeRepository userSavedRecipeRepository;

    @Mock
    private UserSavedWorkoutRepository userSavedWorkoutRepository;

    @Mock
    private UserGoalRepository userGoalRepository;

    private UserService userService;

    private UUID testUserId;
    private User testUser;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                userProfileRepository,
                mealLogRepository,
                userSavedRecipeRepository,
                userSavedWorkoutRepository,
                userGoalRepository
        );

        testUserId = UUID.randomUUID();
        testUser = User.builder()
                .id(testUserId)
                .email("test@example.com")
                .level("beginner")
                .timeBucket(0)
                .currentStreak(5)
                .build();
    }

    @Nested
    @DisplayName("Successful Deletion")
    class SuccessfulDeletion {

        @Test
        @DisplayName("should delete user when user exists")
        void shouldDeleteUserWhenUserExists() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).findById(testUserId);
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("should delete all related data when deleting user")
        void shouldDeleteAllRelatedDataWhenDeletingUser() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then - verify all related data is deleted
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(userGoalRepository).deleteAllByUserId(testUserId);
            verify(userProfileRepository).deleteById(testUserId);
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("should delete related data in correct order to respect foreign key constraints")
        void shouldDeleteRelatedDataInCorrectOrder() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then - verify deletion order
            InOrder inOrder = inOrder(
                    userSavedRecipeRepository,
                    userSavedWorkoutRepository,
                    mealLogRepository,
                    userGoalRepository,
                    userProfileRepository,
                    userRepository
            );

            // Related data should be deleted first
            inOrder.verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            inOrder.verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            inOrder.verify(mealLogRepository).deleteByUserId(testUserId);
            inOrder.verify(userGoalRepository).deleteAllByUserId(testUserId);
            inOrder.verify(userProfileRepository).deleteById(testUserId);
            // User should be deleted last
            inOrder.verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("should handle user with different email formats")
        void shouldHandleUserWithDifferentEmailFormats() {
            // Given
            testUser.setEmail("user+tag@subdomain.example.co.uk");
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(testUser);
        }
    }

    @Nested
    @DisplayName("Error Handling")
    class ErrorHandling {

        @Test
        @DisplayName("should throw EntityNotFoundException when user does not exist")
        void shouldThrowEntityNotFoundExceptionWhenUserDoesNotExist() {
            // Given
            UUID nonExistentUserId = UUID.randomUUID();
            when(userRepository.findById(nonExistentUserId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(nonExistentUserId))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("User not found")
                    .hasMessageContaining(nonExistentUserId.toString());
        }

        @Test
        @DisplayName("should not delete any data when user is not found")
        void shouldNotDeleteAnyDataWhenUserIsNotFound() {
            // Given
            UUID nonExistentUserId = UUID.randomUUID();
            when(userRepository.findById(nonExistentUserId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(nonExistentUserId))
                    .isInstanceOf(EntityNotFoundException.class);

            // Verify no delete operations were called
            verify(userSavedRecipeRepository, never()).deleteByUser_Id(any());
            verify(userSavedWorkoutRepository, never()).deleteByUser_Id(any());
            verify(mealLogRepository, never()).deleteByUserId(any());
            verify(userGoalRepository, never()).deleteAllByUserId(any());
            verify(userProfileRepository, never()).deleteById(any());
            verify(userRepository, never()).delete(any(User.class));
        }
    }

    @Nested
    @DisplayName("Repository Interaction Verification")
    class RepositoryInteractionVerification {

        @Test
        @DisplayName("should call findById exactly once")
        void shouldCallFindByIdExactlyOnce() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository, times(1)).findById(testUserId);
        }

        @Test
        @DisplayName("should call delete with the correct user entity")
        void shouldCallDeleteWithCorrectUserEntity() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(argThat(user ->
                    user.getId().equals(testUserId) &&
                    user.getEmail().equals("test@example.com")
            ));
        }

        @Test
        @DisplayName("should pass correct userId to all repository delete methods")
        void shouldPassCorrectUserIdToAllRepositoryDeleteMethods() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userSavedRecipeRepository).deleteByUser_Id(eq(testUserId));
            verify(userSavedWorkoutRepository).deleteByUser_Id(eq(testUserId));
            verify(mealLogRepository).deleteByUserId(eq(testUserId));
            verify(userGoalRepository).deleteAllByUserId(eq(testUserId));
            verify(userProfileRepository).deleteById(eq(testUserId));
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle user with null optional fields")
        void shouldHandleUserWithNullOptionalFields() {
            // Given
            User userWithNulls = User.builder()
                    .id(testUserId)
                    .email("minimal@example.com")
                    .level("beginner")
                    .timeBucket(0)
                    .currentStreak(0)
                    .username(null)
                    .dietTilt(null)
                    .lastActiveDate(null)
                    .build();
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(userWithNulls));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(userWithNulls);
        }

        @Test
        @DisplayName("should handle user with maximum streak value")
        void shouldHandleUserWithMaximumStreakValue() {
            // Given
            testUser.setCurrentStreak(Integer.MAX_VALUE);
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("should handle user with zero streak")
        void shouldHandleUserWithZeroStreak() {
            // Given
            testUser.setCurrentStreak(0);
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("should handle deletion when repositories have no data to delete")
        void shouldHandleDeletionWhenRepositoriesHaveNoDataToDelete() {
            // Given - user exists but has no related data
            // (repositories will simply do nothing when called)
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then - all delete methods should still be called
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(userGoalRepository).deleteAllByUserId(testUserId);
            verify(userProfileRepository).deleteById(testUserId);
            verify(userRepository).delete(testUser);
        }
    }

    @Nested
    @DisplayName("Multiple Users Scenario")
    class MultipleUsersScenario {

        @Test
        @DisplayName("should only delete specified user's data")
        void shouldOnlyDeleteSpecifiedUsersData() {
            // Given
            UUID otherUserId = UUID.randomUUID();
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then - verify only testUserId is used, not otherUserId
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedRecipeRepository, never()).deleteByUser_Id(otherUserId);

            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository, never()).deleteByUser_Id(otherUserId);

            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(mealLogRepository, never()).deleteByUserId(otherUserId);

            verify(userGoalRepository).deleteAllByUserId(testUserId);
            verify(userGoalRepository, never()).deleteAllByUserId(otherUserId);

            verify(userProfileRepository).deleteById(testUserId);
            verify(userProfileRepository, never()).deleteById(otherUserId);
        }

        @Test
        @DisplayName("should allow sequential deletion of different users")
        void shouldAllowSequentialDeletionOfDifferentUsers() {
            // Given
            UUID secondUserId = UUID.randomUUID();
            User secondUser = User.builder()
                    .id(secondUserId)
                    .email("second@example.com")
                    .level("intermediate")
                    .timeBucket(1)
                    .currentStreak(10)
                    .build();

            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            when(userRepository.findById(secondUserId)).thenReturn(Optional.of(secondUser));

            // When
            userService.deleteUser(testUserId);
            userService.deleteUser(secondUserId);

            // Then
            verify(userRepository).delete(testUser);
            verify(userRepository).delete(secondUser);
            verify(userRepository, times(2)).findById(any(UUID.class));
        }
    }

    @Nested
    @DisplayName("Exception Propagation")
    class ExceptionPropagation {

        @Test
        @DisplayName("should propagate exception when saved recipe deletion fails")
        void shouldPropagateExceptionWhenSavedRecipeDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("Database connection failed"))
                    .when(userSavedRecipeRepository).deleteByUser_Id(testUserId);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Database connection failed");

            // Verify subsequent operations were not called
            verify(userSavedWorkoutRepository, never()).deleteByUser_Id(any());
            verify(mealLogRepository, never()).deleteByUserId(any());
            verify(userGoalRepository, never()).deleteAllByUserId(any());
            verify(userProfileRepository, never()).deleteById(any());
            verify(userRepository, never()).delete(any(User.class));
        }

        @Test
        @DisplayName("should propagate exception when saved workout deletion fails")
        void shouldPropagateExceptionWhenSavedWorkoutDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("Workout deletion failed"))
                    .when(userSavedWorkoutRepository).deleteByUser_Id(testUserId);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Workout deletion failed");

            // Verify recipe was deleted but subsequent operations were not
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository, never()).deleteByUserId(any());
        }

        @Test
        @DisplayName("should propagate exception when meal log deletion fails")
        void shouldPropagateExceptionWhenMealLogDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("Meal log deletion failed"))
                    .when(mealLogRepository).deleteByUserId(testUserId);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Meal log deletion failed");

            // Verify previous operations were called
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            // Verify subsequent operations were not called
            verify(userGoalRepository, never()).deleteAllByUserId(any());
        }

        @Test
        @DisplayName("should propagate exception when goal deletion fails")
        void shouldPropagateExceptionWhenGoalDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("Goal deletion failed"))
                    .when(userGoalRepository).deleteAllByUserId(testUserId);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Goal deletion failed");

            // Verify previous operations were called
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
        }

        @Test
        @DisplayName("should propagate exception when profile deletion fails")
        void shouldPropagateExceptionWhenProfileDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("Profile deletion failed"))
                    .when(userProfileRepository).deleteById(testUserId);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Profile deletion failed");

            // Verify all previous operations were called
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(userGoalRepository).deleteAllByUserId(testUserId);
            // Verify user was not deleted
            verify(userRepository, never()).delete(any(User.class));
        }

        @Test
        @DisplayName("should propagate exception when user deletion fails")
        void shouldPropagateExceptionWhenUserDeletionFails() {
            // Given
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
            doThrow(new RuntimeException("User deletion failed"))
                    .when(userRepository).delete(testUser);

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("User deletion failed");

            // Verify all related data was deleted before user deletion failed
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(userGoalRepository).deleteAllByUserId(testUserId);
            verify(userProfileRepository).deleteById(testUserId);
        }
    }

    @Nested
    @DisplayName("Data Integrity")
    class DataIntegrity {

        @Test
        @DisplayName("should handle user with all related data types")
        void shouldHandleUserWithAllRelatedDataTypes() {
            // Given - user with all types of related data
            User userWithAllData = User.builder()
                    .id(testUserId)
                    .email("fulluser@example.com")
                    .username("fulluser")
                    .level("advanced")
                    .timeBucket(2)
                    .currentStreak(100)
                    .dietTilt("high_protein")
                    .lastActiveDate(java.time.LocalDate.now())
                    .build();
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(userWithAllData));

            // When
            userService.deleteUser(testUserId);

            // Then - all delete operations should be called
            verify(userSavedRecipeRepository).deleteByUser_Id(testUserId);
            verify(userSavedWorkoutRepository).deleteByUser_Id(testUserId);
            verify(mealLogRepository).deleteByUserId(testUserId);
            verify(userGoalRepository).deleteAllByUserId(testUserId);
            verify(userProfileRepository).deleteById(testUserId);
            verify(userRepository).delete(userWithAllData);
        }

        @Test
        @DisplayName("should handle user with special characters in email")
        void shouldHandleUserWithSpecialCharactersInEmail() {
            // Given
            testUser.setEmail("user+test.name@sub-domain.example.co.uk");
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(argThat(user ->
                    user.getEmail().equals("user+test.name@sub-domain.example.co.uk")
            ));
        }

        @Test
        @DisplayName("should handle user with unicode username")
        void shouldHandleUserWithUnicodeUsername() {
            // Given
            testUser.setUsername("testUnicodeUser");
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(argThat(user ->
                    user.getUsername().equals("testUnicodeUser")
            ));
        }

        @Test
        @DisplayName("should handle user with very long email")
        void shouldHandleUserWithVeryLongEmail() {
            // Given
            String longEmail = "a".repeat(200) + "@example.com";
            testUser.setEmail(longEmail);
            when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

            // When
            userService.deleteUser(testUserId);

            // Then
            verify(userRepository).delete(testUser);
        }
    }

    @Nested
    @DisplayName("Idempotency")
    class Idempotency {

        @Test
        @DisplayName("should fail on second deletion attempt for same user")
        void shouldFailOnSecondDeletionAttemptForSameUser() {
            // Given - first call succeeds
            when(userRepository.findById(testUserId))
                    .thenReturn(Optional.of(testUser))
                    .thenReturn(Optional.empty()); // Second call returns empty

            // When - first deletion
            userService.deleteUser(testUserId);

            // Then - second deletion should fail
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}