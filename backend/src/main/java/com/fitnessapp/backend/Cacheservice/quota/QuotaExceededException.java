package com.fitnessapp.backend.service.quota;

/**
 * Exception thrown when a user exceeds their quota.
 */
public class QuotaExceededException extends RuntimeException {
  
  private final QuotaUsage quotaUsage;

  public QuotaExceededException(QuotaUsage quotaUsage) {
    super(String.format(
        "Quota exceeded for %s: used %d/%d (resets in %d days)",
        quotaUsage.type().getKey(),
        quotaUsage.used(),
        quotaUsage.limit(),
        java.time.temporal.ChronoUnit.DAYS.between(
            java.time.LocalDate.now(),
            quotaUsage.periodEnd()
        )
    ));
    this.quotaUsage = quotaUsage;
  }

  public QuotaUsage getQuotaUsage() {
    return quotaUsage;
  }
}
