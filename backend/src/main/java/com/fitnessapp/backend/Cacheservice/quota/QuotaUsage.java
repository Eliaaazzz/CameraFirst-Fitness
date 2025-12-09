package com.fitnessapp.backend.service.quota;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Represents a user's quota usage for a specific quota type in a time period.
 */
public record QuotaUsage(
    QuotaType type,
    int limit,
    int used,
    int remaining,
    LocalDate periodStart,
    LocalDate periodEnd,
    OffsetDateTime resetsAt,
    boolean exceeded
) {
  public QuotaUsage {
    if (limit < 0) throw new IllegalArgumentException("Limit must be non-negative");
    if (used < 0) throw new IllegalArgumentException("Used must be non-negative");
  }

  public static QuotaUsage of(QuotaType type, int limit, int used, LocalDate periodStart, LocalDate periodEnd) {
    int remaining = Math.max(0, limit - used);
    boolean exceeded = used >= limit;
    OffsetDateTime resetsAt = periodEnd.atStartOfDay(java.time.ZoneId.systemDefault()).toOffsetDateTime();
    return new QuotaUsage(type, limit, used, remaining, periodStart, periodEnd, resetsAt, exceeded);
  }

  public boolean canConsume(int amount) {
    return remaining >= amount;
  }

  public double usagePercentage() {
    if (limit == 0) return 0.0;
    return (double) used / limit * 100.0;
  }
}
