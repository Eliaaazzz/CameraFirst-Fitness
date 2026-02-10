package com.fitnessapp.backend.user.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.recipe.repository.UserSavedRecipeRepository;
import com.fitnessapp.backend.user.dto.StreakUpdateResult;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing User entity operations including streak tracking and username updates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final MealLogRepository mealLogRepository;
  private final UserSavedRecipeRepository userSavedRecipeRepository;
  private final UserGoalRepository userGoalRepository;

  /**
   * Updates the user's streak based on their activity.
   * Uses pessimistic locking to prevent race conditions from rapid button clicks.
   *
   * Streak logic:
   * - If lastActiveDate was yesterday → increment currentStreak + 1
   * - If lastActiveDate is today → do nothing (already active today)
   * - If lastActiveDate was before yesterday or null → reset currentStreak to 1
   * - Always update lastActiveDate to today
   *
   * @param userId the user's ID
   * @return StreakUpdateResult containing current streak and whether it was incremented
   */
  @Transactional
  public StreakUpdateResult updateStreak(UUID userId) {
    // Use pessimistic lock to prevent concurrent updates
    User user = userRepository.findByIdForUpdate(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    LocalDate today = LocalDate.now();
    LocalDate lastActive = user.getLastActiveDate();

    StreakUpdateResult result;

    if (lastActive == null) {
      // First activity ever - start streak at 1
      user.setCurrentStreak(1);
      user.setLastActiveDate(today);
      userRepository.save(user);
      log.info("User {} starting new streak: 1", userId);
      result = StreakUpdateResult.incremented(1, today);
    } else if (lastActive.equals(today)) {
      // Already active today - ensure streak is at least 1
      int streak = user.getCurrentStreak();
      if (streak < 1) {
        user.setCurrentStreak(1);
        userRepository.save(user);
        log.info("User {} streak corrected to 1 (was {} with lastActive today)", userId, streak);
        result = StreakUpdateResult.incremented(1, today);
      } else {
        log.debug("User {} already active today, streak unchanged: {}", userId, streak);
        result = StreakUpdateResult.unchanged(streak, lastActive);
      }
    } else if (lastActive.equals(today.minusDays(1))) {
      // Active yesterday - increment streak
      int newStreak = user.getCurrentStreak() + 1;
      user.setCurrentStreak(newStreak);
      user.setLastActiveDate(today);
      userRepository.save(user);
      log.info("User {} streak incremented to: {}", userId, newStreak);
      result = StreakUpdateResult.incremented(newStreak, today);
    } else {
      // Missed a day (or more) - reset streak to 1
      user.setCurrentStreak(1);
      user.setLastActiveDate(today);
      userRepository.save(user);
      log.info("User {} streak reset to 1 (last active: {})", userId, lastActive);
      result = StreakUpdateResult.reset(today);
    }

    return result;
  }

  /**
   * Updates the user's streak based on login activity.
   * Called from /me endpoint when user logs in or opens the app.
   * Uses server timezone (UTC).
   *
   * @param userId the user's ID
   * @return the updated current streak
   */
  @Transactional
  public int validateAndGetStreak(UUID userId) {
    return validateAndGetStreak(userId, null);
  }

  /**
   * Updates the user's streak based on login activity with timezone support.
   * Called from /me endpoint when user logs in or opens the app.
   *
   * Streak logic:
   * - If lastActiveDate was yesterday → increment currentStreak + 1
   * - If lastActiveDate is today → do nothing (already logged in today)
   * - If lastActiveDate was before yesterday or null → reset currentStreak to 1 (new streak starts)
   * - Always update lastActiveDate to today when streak changes
   *
   * @param userId the user's ID
   * @param userTimezone the user's timezone (e.g., "America/Los_Angeles"), or null for server default
   * @return the updated current streak
   */
  @Transactional
  public int validateAndGetStreak(UUID userId, String userTimezone) {
    // Use pessimistic lock to prevent concurrent updates
    User user = userRepository.findByIdForUpdate(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    // Use user's timezone if provided, otherwise use server default
    LocalDate today;
    if (userTimezone != null && !userTimezone.isBlank()) {
      try {
        ZoneId zone = ZoneId.of(userTimezone);
        today = LocalDate.now(zone);
        log.debug("Using user timezone {} for streak calculation, today={}", userTimezone, today);
      } catch (Exception e) {
        log.warn("Invalid timezone '{}' for user {}, falling back to server default", userTimezone, userId);
        today = LocalDate.now();
      }
    } else {
      today = LocalDate.now();
    }

    LocalDate lastActive = user.getLastActiveDate();

    // If never active - start new streak at 1
    if (lastActive == null) {
      user.setCurrentStreak(1);
      user.setLastActiveDate(today);
      userRepository.save(user);
      log.info("User {} starting new streak: 1 (first login)", userId);
      return 1;
    }

    // If already logged in today - ensure streak is at least 1
    if (lastActive.equals(today)) {
      int streak = user.getCurrentStreak();
      if (streak < 1) {
        // Edge case: lastActiveDate is today but streak is 0 (shouldn't happen, but fix it)
        user.setCurrentStreak(1);
        userRepository.save(user);
        log.info("User {} streak corrected to 1 (was {} with lastActive today)", userId, streak);
        return 1;
      }
      log.debug("User {} already logged in today, streak unchanged: {}", userId, streak);
      return streak;
    }

    // If logged in yesterday - increment streak
    if (lastActive.equals(today.minusDays(1))) {
      int newStreak = user.getCurrentStreak() + 1;
      user.setCurrentStreak(newStreak);
      user.setLastActiveDate(today);
      userRepository.save(user);
      log.info("User {} streak incremented to: {} (consecutive day)", userId, newStreak);
      return newStreak;
    }

    // Missed a day or more - reset streak to 1 (new streak starts today)
    user.setCurrentStreak(1);
    user.setLastActiveDate(today);
    userRepository.save(user);
    log.info("User {} streak reset to 1 (last active: {}, missed days)", userId, lastActive);
    return 1;
  }

  /**
   * Updates the user's display name.
   *
   * @param userId the user's ID
   * @param username the new display name
   * @return the updated User entity
   * @throws IllegalArgumentException if username is blank
   */
  @Transactional
  public User updateUsername(UUID userId, String username) {
    if (username == null || username.isBlank()) {
      throw new IllegalArgumentException("Username cannot be blank");
    }

    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    String trimmedUsername = username.trim();
    if (trimmedUsername.length() > 100) {
      trimmedUsername = trimmedUsername.substring(0, 100);
    }

    user.setUsername(trimmedUsername);
    log.info("User {} username updated to: {}", userId, trimmedUsername);
    return userRepository.save(user);
  }

  /**
   * Gets a user by ID.
   *
   * @param userId the user's ID
   * @return the User entity
   */
  @Transactional(readOnly = true)
  public User getUser(UUID userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
  }

  /**
   * Permanently deletes a user account and all associated data.
   * This operation cannot be undone.
   *
   * @param userId the user's ID
   * @throws EntityNotFoundException if user not found
   */
  @Transactional
  public void deleteUser(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    log.info("Deleting user account: {} ({})", userId, user.getEmail());

    // Delete related data in order (to respect foreign key constraints)
    // 1. Delete saved recipes
    userSavedRecipeRepository.deleteByUser_Id(userId);
    log.debug("Deleted saved recipes for user: {}", userId);

    // 2. Delete meal logs
    mealLogRepository.deleteByUserId(userId);
    log.debug("Deleted meal logs for user: {}", userId);

    // 3. Delete user goals
    userGoalRepository.deleteAllByUserId(userId);
    log.debug("Deleted goals for user: {}", userId);

    // 4. Delete user profile
    userProfileRepository.deleteById(userId);
    log.debug("Deleted profile for user: {}", userId);

    // 5. Delete user account
    userRepository.delete(user);
    log.info("Successfully deleted user account: {}", userId);
  }
}