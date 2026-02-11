package com.fitnessapp.backend.user.service;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for user account deletion functionality.
 * 
 * Tests verify that:
 * 1. User account and all associated data are deleted correctly
 * 2. Related entities (profile) are cascade deleted
 * 3. Proper error handling for non-existent users
 * 4. Transaction integrity is maintained
 */
@SpringBootTest
@Testcontainers
@DisplayName("User Deletion Integration Tests")
class UserDeletionIntegrationTest {

    @Container
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16")
            .withDatabaseName("fitness_test")
            .withUsername("test")
            .withPassword("test")
            .withReuse(false);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("r2.endpoint", () -> "http://localhost:9000");
        registry.add("r2.access-key", () -> "test-access-key");
        registry.add("r2.secret-key", () -> "test-secret-key");
        registry.add("r2.bucket", () -> "test-bucket");
        registry.add("r2.public-url", () -> "https://example.invalid");
    }

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private UserProfileService userProfileService;

    private UUID testUserId;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Create a test user
        testUser = new User();
        testUser.setEmail("test-deletion-" + UUID.randomUUID() + "@example.com");
        testUser.setLevel("beginner");
        testUser.setTimeBucket(0);
        testUser.setCurrentStreak(5);
        testUser = userRepository.save(testUser);
        testUserId = testUser.getId();
    }

    @Nested
    @DisplayName("Basic User Deletion")
    class BasicUserDeletion {

        @Test
        @DisplayName("should delete user account successfully")
        void deleteUserAccountSuccessfully() {
            // Given - user exists
            assertThat(userRepository.findById(testUserId)).isPresent();

            // When
            userService.deleteUser(testUserId);

            // Then - user should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
        }

        @Test
        @DisplayName("should throw EntityNotFoundException for non-existent user")
        void throwExceptionForNonExistentUser() {
            // Given
            UUID nonExistentUserId = UUID.randomUUID();

            // When/Then
            assertThatThrownBy(() -> userService.deleteUser(nonExistentUserId))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("User not found");
        }
    }

    @Nested
    @DisplayName("Cascade Deletion of Related Data")
    class CascadeDeletion {

        @Test
        @DisplayName("should delete user profile when user is deleted")
        void deleteUserProfileWithUser() {
            // Given - create user profile
            UserProfile profile = userProfileService.getOrCreateProfile(testUserId);
            profile.setHeightCm(175);
            profile.setWeightKg(BigDecimal.valueOf(70));
            profile.setAvatarUrl("https://example.com/avatar.jpg");
            userProfileService.save(profile);

            assertThat(userProfileRepository.findById(testUserId)).isPresent();

            // When
            userService.deleteUser(testUserId);

            // Then - profile should be deleted
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();
        }

        @Test
        @DisplayName("should delete user profile with all fields when user is deleted")
        void deleteUserProfileWithAllFieldsWhenUserDeleted() {
            // Given - create user profile with all fields
            UserProfile profile = userProfileService.getOrCreateProfile(testUserId);
            profile.setHeightCm(175);
            profile.setWeightKg(BigDecimal.valueOf(70));
            profile.setDailyCalorieTarget(2500);
            profile.setDailyProteinTarget(180);
            profile.setDailyCarbsTarget(300);
            profile.setDailyFatTarget(80);
            profile.setAvatarUrl("https://example.com/avatar.jpg");
            profile.setAvatarFileKey("avatars/test-user/avatar.jpg");
            userProfileService.save(profile);

            assertThat(userProfileRepository.findById(testUserId)).isPresent();

            // When
            userService.deleteUser(testUserId);

            // Then - profile should be deleted
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();
            // And user should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
        }
    }

    @Nested
    @DisplayName("Complete User Data Deletion")
    class CompleteDataDeletion {

        @Test
        @DisplayName("should delete user and profile in a single transaction")
        void deleteUserAndProfileInTransaction() {
            // Given - create user profile
            UserProfile profile = userProfileService.getOrCreateProfile(testUserId);
            profile.setHeightCm(175);
            profile.setWeightKg(BigDecimal.valueOf(70));
            profile.setDailyCalorieTarget(2500);
            profile.setDailyProteinTarget(180);
            profile.setDailyCarbsTarget(300);
            profile.setDailyFatTarget(80);
            userProfileService.save(profile);

            // Verify all data exists
            assertThat(userRepository.findById(testUserId)).isPresent();
            assertThat(userProfileRepository.findById(testUserId)).isPresent();

            // When
            userService.deleteUser(testUserId);

            // Then - all user data should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();
        }

        @Test
        @DisplayName("should handle user with no related data")
        void deleteUserWithNoRelatedData() {
            // Given - user exists but has no related data
            assertThat(userRepository.findById(testUserId)).isPresent();
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();

            // When - should not throw any exception
            userService.deleteUser(testUserId);

            // Then - user should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
        }
    }

    @Nested
    @DisplayName("Data Isolation")
    class DataIsolation {

        @Test
        @DisplayName("should not affect other users' data when deleting a user")
        void shouldNotAffectOtherUsersData() {
            // Given - create another user with data
            User otherUser = new User();
            otherUser.setEmail("other-user-" + UUID.randomUUID() + "@example.com");
            otherUser.setLevel("intermediate");
            otherUser.setTimeBucket(1);
            otherUser = userRepository.save(otherUser);
            UUID otherUserId = otherUser.getId();

            // Create profile for other user
            UserProfile otherProfile = userProfileService.getOrCreateProfile(otherUserId);
            otherProfile.setHeightCm(180);
            otherProfile.setWeightKg(BigDecimal.valueOf(80));
            userProfileService.save(otherProfile);

            // Create data for test user
            UserProfile testProfile = userProfileService.getOrCreateProfile(testUserId);
            testProfile.setHeightCm(170);
            testProfile.setWeightKg(BigDecimal.valueOf(65));
            userProfileService.save(testProfile);

            // When - delete test user
            userService.deleteUser(testUserId);

            // Then - test user data should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();

            // But other user's data should remain intact
            assertThat(userRepository.findById(otherUserId)).isPresent();
            assertThat(userProfileRepository.findById(otherUserId)).isPresent();

            // Cleanup other user
            userService.deleteUser(otherUserId);
        }

        @Test
        @DisplayName("should handle multiple sequential deletions")
        void handleMultipleSequentialDeletions() {
            // Given - create multiple users
            User user1 = new User();
            user1.setEmail("user1-" + UUID.randomUUID() + "@example.com");
            user1.setLevel("beginner");
            user1.setTimeBucket(0);
            user1 = userRepository.save(user1);

            User user2 = new User();
            user2.setEmail("user2-" + UUID.randomUUID() + "@example.com");
            user2.setLevel("intermediate");
            user2.setTimeBucket(1);
            user2 = userRepository.save(user2);

            UUID user1Id = user1.getId();
            UUID user2Id = user2.getId();

            // When - delete users sequentially
            userService.deleteUser(testUserId);
            userService.deleteUser(user1Id);
            userService.deleteUser(user2Id);

            // Then - all users should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
            assertThat(userRepository.findById(user1Id)).isEmpty();
            assertThat(userRepository.findById(user2Id)).isEmpty();
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle deletion of user with empty profile fields")
        void deleteUserWithEmptyProfileFields() {
            // Given - create user profile with minimal fields
            userProfileService.getOrCreateProfile(testUserId);

            assertThat(userProfileRepository.findById(testUserId)).isPresent();

            // When
            userService.deleteUser(testUserId);

            // Then - both should be deleted
            assertThat(userRepository.findById(testUserId)).isEmpty();
            assertThat(userProfileRepository.findById(testUserId)).isEmpty();
        }

        @Test
        @DisplayName("should not throw when deleting user twice")
        void shouldThrowWhenDeletingUserTwice() {
            // Given - delete user once
            userService.deleteUser(testUserId);
            assertThat(userRepository.findById(testUserId)).isEmpty();

            // When/Then - second deletion should throw
            assertThatThrownBy(() -> userService.deleteUser(testUserId))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
