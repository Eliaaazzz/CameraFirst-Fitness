package com.fitnessapp.backend.user.service;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
   *
   * Streak logic:
   * - If lastActiveDate was yesterday → increment currentStreak + 1
   * - If lastActiveDate is today → do nothing (already active today)
   * - If lastActiveDate was before yesterday or null → reset currentStreak to 1
   * - Always update lastActiveDate to today
   *
   * @param userId the user's ID
   * @return the updated User entity
   */
  @Transactional
  public User updateStreak(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    LocalDate today = LocalDate.now();
    LocalDate lastActive = user.getLastActiveDate();

    if (lastActive == null) {
      // First activity ever - start streak at 1
      user.setCurrentStreak(1);
      log.info("User {} starting new streak: 1", userId);
    } else if (lastActive.equals(today)) {
      // Already active today - do nothing
      log.debug("User {} already active today, streak unchanged: {}", userId, user.getCurrentStreak());
      return user;
    } else if (lastActive.equals(today.minusDays(1))) {
      // Active yesterday - increment streak
      int newStreak = user.getCurrentStreak() + 1;
      user.setCurrentStreak(newStreak);
      log.info("User {} streak incremented to: {}", userId, newStreak);
    } else {
      // Missed a day (or more) - reset streak to 1
      user.setCurrentStreak(1);
      log.info("User {} streak reset to 1 (last active: {})", userId, lastActive);
    }

    user.setLastActiveDate(today);
    return userRepository.save(user);
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
