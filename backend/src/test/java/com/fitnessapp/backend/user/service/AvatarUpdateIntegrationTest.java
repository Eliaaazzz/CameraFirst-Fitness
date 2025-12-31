package com.fitnessapp.backend.user.service;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test for avatar update functionality using real database.
 * 
 * This test verifies that the fix for avatar URL persistence works correctly
 * by testing against a real PostgreSQL database with Testcontainers.
 * 
 * The bug being tested: Previously, avatar updates were done in separate
 * transactions (getOrCreateProfile -> modify -> save), causing detached
 * entity issues where avatarUrl would not persist properly.
 * 
 * The fix: updateAvatar() method performs the entire operation in a single
 * transaction, ensuring the entity remains managed throughout.
 */
@SpringBootTest
@Testcontainers
@DisplayName("Avatar Update Integration Test")
class AvatarUpdateIntegrationTest {

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
    }

    @Autowired
    private UserProfileService userProfileService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    private UUID testUserId;

    @BeforeEach
    void setUp() {
        // Create a test user
        User testUser = new User();
        testUser.setEmail("test-avatar@example.com");
        testUser.setLevel("beginner");
        testUser.setTimeBucket(0);
        testUser = userRepository.save(testUser);
        testUserId = testUser.getId();
    }

    @Test
    @DisplayName("updateAvatar should persist avatar URL in a single transaction")
    void updateAvatarPersistsAvatarUrlCorrectly() {
        // Given
        String avatarUrl = "https://s3.amazonaws.com/bucket/avatars/test-user/avatar.jpg";
        String fileKey = "avatars/test-user/avatar.jpg";

        // When
        UserProfileService.AvatarUpdateResult result = userProfileService.updateAvatar(
            testUserId, avatarUrl, fileKey);

        // Then - verify the returned profile has the avatar URL
        assertThat(result.profile()).isNotNull();
        assertThat(result.profile().getAvatarUrl()).isEqualTo(avatarUrl);
        assertThat(result.profile().getAvatarFileKey()).isEqualTo(fileKey);
        assertThat(result.oldFileKey()).isNull(); // No previous avatar

        // And - verify the database actually has the avatar URL persisted
        UserProfile savedProfile = userProfileRepository.findById(testUserId).orElseThrow();
        assertThat(savedProfile.getAvatarUrl()).isEqualTo(avatarUrl);
        assertThat(savedProfile.getAvatarFileKey()).isEqualTo(fileKey);
    }

    @Test
    @DisplayName("updateAvatar should return old file key when updating existing avatar")
    void updateAvatarReturnsOldFileKey() {
        // Given - create profile with existing avatar
        String oldAvatarUrl = "https://s3.amazonaws.com/bucket/avatars/test-user/old-avatar.jpg";
        String oldFileKey = "avatars/test-user/old-avatar.jpg";
        userProfileService.updateAvatar(testUserId, oldAvatarUrl, oldFileKey);

        // When - update to new avatar
        String newAvatarUrl = "https://s3.amazonaws.com/bucket/avatars/test-user/new-avatar.jpg";
        String newFileKey = "avatars/test-user/new-avatar.jpg";
        UserProfileService.AvatarUpdateResult result = userProfileService.updateAvatar(
            testUserId, newAvatarUrl, newFileKey);

        // Then - verify old file key is returned for cleanup
        assertThat(result.oldFileKey()).isEqualTo(oldFileKey);
        
        // And - verify new avatar is persisted
        assertThat(result.profile().getAvatarUrl()).isEqualTo(newAvatarUrl);
        assertThat(result.profile().getAvatarFileKey()).isEqualTo(newFileKey);

        // And - verify database has new avatar
        UserProfile savedProfile = userProfileRepository.findById(testUserId).orElseThrow();
        assertThat(savedProfile.getAvatarUrl()).isEqualTo(newAvatarUrl);
        assertThat(savedProfile.getAvatarFileKey()).isEqualTo(newFileKey);
    }

    @Test
    @DisplayName("updateAvatar should handle null old file key gracefully")
    void updateAvatarHandlesNullOldFileKey() {
        // Given - create profile with avatar URL but no file key (edge case)
        UserProfile profile = userProfileService.getOrCreateProfile(testUserId);
        profile.setAvatarUrl("https://example.com/old.jpg");
        profile.setAvatarFileKey(null);
        userProfileRepository.save(profile);

        // When
        String newAvatarUrl = "https://s3.amazonaws.com/bucket/avatars/test-user/new-avatar.jpg";
        String newFileKey = "avatars/test-user/new-avatar.jpg";
        UserProfileService.AvatarUpdateResult result = userProfileService.updateAvatar(
            testUserId, newAvatarUrl, newFileKey);

        // Then
        assertThat(result.oldFileKey()).isNull();
        assertThat(result.profile().getAvatarUrl()).isEqualTo(newAvatarUrl);
        assertThat(result.profile().getAvatarFileKey()).isEqualTo(newFileKey);
    }

    @Test
    @DisplayName("updateAvatar should create profile if it doesn't exist")
    void updateAvatarCreatesProfileIfNotExists() {
        // Given - create a new user without profile
        User newUser = new User();
        newUser.setEmail("new-user@example.com");
        newUser.setLevel("beginner");
        newUser.setTimeBucket(0);
        newUser = userRepository.save(newUser);
        UUID newUserId = newUser.getId();

        // Verify no profile exists
        Optional<UserProfile> beforeProfile = userProfileRepository.findById(newUserId);
        assertThat(beforeProfile).isEmpty();

        // When
        String avatarUrl = "https://s3.amazonaws.com/bucket/avatars/new-user/avatar.jpg";
        String fileKey = "avatars/new-user/avatar.jpg";
        UserProfileService.AvatarUpdateResult result = userProfileService.updateAvatar(
            newUserId, avatarUrl, fileKey);

        // Then - profile should be created with avatar
        assertThat(result.profile()).isNotNull();
        assertThat(result.profile().getAvatarUrl()).isEqualTo(avatarUrl);
        assertThat(result.profile().getAvatarFileKey()).isEqualTo(fileKey);
        assertThat(result.oldFileKey()).isNull();

        // And - verify profile exists in database
        UserProfile savedProfile = userProfileRepository.findById(newUserId).orElseThrow();
        assertThat(savedProfile.getAvatarUrl()).isEqualTo(avatarUrl);
        assertThat(savedProfile.getAvatarFileKey()).isEqualTo(fileKey);
    }

    @Test
    @DisplayName("updateAvatar should maintain transaction consistency even with long URLs")
    void updateAvatarHandlesLongUrls() {
        // Given - create a very long URL (up to 500 chars limit)
        String longAvatarUrl = "https://s3.amazonaws.com/bucket/avatars/test-user/" +
            "very-long-filename-with-lots-of-characters-" +
            "abcdefghijklmnopqrstuvwxyz-0123456789-" +
            "abcdefghijklmnopqrstuvwxyz-0123456789-" +
            "abcdefghijklmnopqrstuvwxyz-0123456789-" +
            "abcdefghijklmnopqrstuvwxyz-0123456789-" +
            "abcdefghijklmnopqrstuvwxyz-0123456789.jpg";
        String longFileKey = "avatars/test-user/very-long-filename.jpg";

        // When
        UserProfileService.AvatarUpdateResult result = userProfileService.updateAvatar(
            testUserId, longAvatarUrl, longFileKey);

        // Then - should persist correctly
        assertThat(result.profile().getAvatarUrl()).isEqualTo(longAvatarUrl);
        
        // And - verify in database
        UserProfile savedProfile = userProfileRepository.findById(testUserId).orElseThrow();
        assertThat(savedProfile.getAvatarUrl()).isEqualTo(longAvatarUrl);
        assertThat(savedProfile.getAvatarFileKey()).isEqualTo(longFileKey);
    }
}
