package com.fitnessapp.backend.service.quota;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

/**
 * Defines how frequently quotas reset.
 */
public enum QuotaResetPeriod {
  DAILY(Duration.ofDays(1)),
  WEEKLY(Duration.ofDays(7)),
  MONTHLY(Duration.ofDays(30));

  private final Duration duration;

  QuotaResetPeriod(Duration duration) {
    this.duration = duration;
  }

  public Duration getDuration() {
    return duration;
  }

  /**
   * Get the start of the current period.
   */
  public LocalDate getCurrentPeriodStart(ZoneId zoneId) {
    LocalDate today = LocalDate.now(zoneId);
    return switch (this) {
      case DAILY -> today;
      case WEEKLY -> today.with(java.time.DayOfWeek.MONDAY);
      case MONTHLY -> today.withDayOfMonth(1);
    };
  }

  /**
   * Get the end of the current period.
   */
  public LocalDate getCurrentPeriodEnd(ZoneId zoneId) {
    LocalDate start = getCurrentPeriodStart(zoneId);
    return switch (this) {
      case DAILY -> start.plusDays(1);
      case WEEKLY -> start.plusWeeks(1);
      case MONTHLY -> start.plusMonths(1);
    };
  }

  /**
   * Calculate days until reset.
   */
  public long daysUntilReset(ZoneId zoneId) {
    LocalDate today = LocalDate.now(zoneId);
    LocalDate nextReset = getCurrentPeriodEnd(zoneId);
    return ChronoUnit.DAYS.between(today, nextReset);
  }
}
