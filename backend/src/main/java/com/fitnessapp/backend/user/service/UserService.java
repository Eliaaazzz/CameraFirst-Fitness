package com.fitnessapp.backend.user.service;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.user.dto.StreakUpdateResult;
import com.fitnessapp.backend.user.entity.User;
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
      // Already active today - do nothing
      log.debug("User {} already active today, streak unchanged: {}", userId, user.getCurrentStreak());
      result = StreakUpdateResult.unchanged(user.getCurrentStreak(), lastActive);
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
   * Validates and potentially resets the user's streak based on last activity.
   * Called from /me endpoint to ensure users see accurate streak status.
   *
   * Lazy Reset: If user hasn't been active for more than 1 day, reset streak to 0.
   * This ensures the UI shows the correct "broken streak" state.
   *
   * @param userId the user's ID
   * @return the validated current streak (may be reset to 0 if expired)
   */
  @Transactional
  public int validateAndGetStreak(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    LocalDate today = LocalDate.now();
    LocalDate lastActive = user.getLastActiveDate();

    // If never active or last active was more than 1 day ago, streak is broken
    if (lastActive == null) {
      return 0;
    }

    if (lastActive.isBefore(today.minusDays(1))) {
      // Lazy reset: streak is broken, update DB and return 0
      user.setCurrentStreak(0);
      userRepository.save(user);
      log.info("User {} streak expired (last active: {}), reset to 0", userId, lastActive);
      return 0;
    }

    // Streak is still valid (active today or yesterday)
    return user.getCurrentStreak();
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
}
