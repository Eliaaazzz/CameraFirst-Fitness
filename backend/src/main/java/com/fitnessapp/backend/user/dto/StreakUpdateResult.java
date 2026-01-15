package com.fitnessapp.backend.user.dto;

import java.time.LocalDate;

/**
 * Result of a streak update operation.
 * Used to communicate streak changes to the frontend for UI animations.
 */
public record StreakUpdateResult(
    int currentStreak,
    boolean isIncremented,
    LocalDate lastActiveDate
) {
  public static StreakUpdateResult incremented(int newStreak, LocalDate lastActiveDate) {
    return new StreakUpdateResult(newStreak, true, lastActiveDate);
  }

  public static StreakUpdateResult unchanged(int currentStreak, LocalDate lastActiveDate) {
    return new StreakUpdateResult(currentStreak, false, lastActiveDate);
  }

  public static StreakUpdateResult reset(LocalDate lastActiveDate) {
    return new StreakUpdateResult(1, false, lastActiveDate);
  }
}
