package com.fitnessapp.backend.service.quota;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for managing user quotas with Redis-backed counters.
 * Quotas are automatically reset based on their configured period (daily/weekly/monthly).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuotaService {

  private static final String QUOTA_KEY_PREFIX = "quota";
  private static final ZoneId DEFAULT_ZONE = ZoneId.systemDefault();

  private final StringRedisTemplate redisTemplate;
  private final MeterRegistry meterRegistry;

  /**
   * Check if user has available quota without consuming it.
   *
   * @param userId the user ID
   * @param type the quota type
   * @return current quota usage
   */
  public QuotaUsage checkQuota(UUID userId, QuotaType type) {
    return checkQuota(userId, type, DEFAULT_ZONE);
  }

  /**
   * Check if user has available quota with specific timezone.
   */
  public QuotaUsage checkQuota(UUID userId, QuotaType type, ZoneId zoneId) {
    String key = buildQuotaKey(userId, type, zoneId);
    String value = redisTemplate.opsForValue().get(key);
    int used = value != null ? Integer.parseInt(value) : 0;
    
    LocalDate periodStart = type.getResetPeriod().getCurrentPeriodStart(zoneId);
    LocalDate periodEnd = type.getResetPeriod().getCurrentPeriodEnd(zoneId);
    
    QuotaUsage usage = QuotaUsage.of(type, type.getFreeLimit(), used, periodStart, periodEnd);
    
    log.trace("Quota check: userId={}, type={}, usage={}/{}", 
        userId, type.getKey(), usage.used(), usage.limit());
    
    return usage;
  }

  /**
   * Attempt to consume quota. Throws QuotaExceededException if insufficient.
   *
   * @param userId the user ID
   * @param type the quota type
   * @param amount the amount to consume (default 1)
   * @return updated quota usage after consumption
   * @throws QuotaExceededException if quota would be exceeded
   */
  public QuotaUsage consumeQuota(UUID userId, QuotaType type, int amount) throws QuotaExceededException {
    return consumeQuota(userId, type, amount, DEFAULT_ZONE);
  }

  /**
   * Consume 1 unit of quota.
   */
  public QuotaUsage consumeQuota(UUID userId, QuotaType type) throws QuotaExceededException {
    return consumeQuota(userId, type, 1, DEFAULT_ZONE);
  }

  /**
   * Consume quota with timezone awareness.
   */
  public QuotaUsage consumeQuota(UUID userId, QuotaType type, int amount, ZoneId zoneId) 
      throws QuotaExceededException {
    
    if (amount <= 0) {
      throw new IllegalArgumentException("Amount must be positive");
    }

    long startTime = System.nanoTime();
    String key = buildQuotaKey(userId, type, zoneId);
    
    // Atomic increment and get
    Long newValue = redisTemplate.opsForValue().increment(key, amount);
    if (newValue == null) {
      newValue = (long) amount;
    }
    
    // Set expiry if this is the first usage in the period
    if (newValue == amount) {
      Duration ttl = calculateTtl(type.getResetPeriod(), zoneId);
      redisTemplate.expire(key, ttl.toSeconds(), TimeUnit.SECONDS);
      log.debug("Set TTL for quota key {}: {} seconds", key, ttl.toSeconds());
    }

    int used = newValue.intValue();
    LocalDate periodStart = type.getResetPeriod().getCurrentPeriodStart(zoneId);
    LocalDate periodEnd = type.getResetPeriod().getCurrentPeriodEnd(zoneId);
    QuotaUsage usage = QuotaUsage.of(type, type.getFreeLimit(), used, periodStart, periodEnd);

    long duration = System.nanoTime() - startTime;
    log.info("Quota consumed: userId={}, type={}, amount={}, usage={}/{} (durationMs={})",
        userId, type.getKey(), amount, usage.used(), usage.limit(), duration / 1_000_000);

    // Record metrics
    meterRegistry.counter("quota.consumed", 
        "type", type.getKey(),
        "exceeded", Boolean.toString(usage.exceeded()))
        .increment(amount);
    meterRegistry.timer("quota.consume.duration", "type", type.getKey())
        .record(duration, TimeUnit.NANOSECONDS);

    // Check if exceeded
    if (usage.exceeded()) {
      meterRegistry.counter("quota.exceeded", "type", type.getKey()).increment();
      log.warn("Quota exceeded: userId={}, type={}, used={}, limit={}", 
          userId, type.getKey(), usage.used(), usage.limit());
      throw new QuotaExceededException(usage);
    }

    return usage;
  }

  /**
   * Manually reset quota for a user (admin operation or testing).
   */
  public void resetQuota(UUID userId, QuotaType type) {
    resetQuota(userId, type, DEFAULT_ZONE);
  }

  /**
   * Reset quota with timezone.
   */
  public void resetQuota(UUID userId, QuotaType type, ZoneId zoneId) {
    String key = buildQuotaKey(userId, type, zoneId);
    redisTemplate.delete(key);
    log.info("Quota reset: userId={}, type={}", userId, type.getKey());
    meterRegistry.counter("quota.reset", "type", type.getKey()).increment();
  }

  /**
   * Get all quota usages for a user.
   */
  public java.util.Map<QuotaType, QuotaUsage> getAllQuotas(UUID userId) {
    return getAllQuotas(userId, DEFAULT_ZONE);
  }

  /**
   * Get all quota usages with timezone.
   */
  public java.util.Map<QuotaType, QuotaUsage> getAllQuotas(UUID userId, ZoneId zoneId) {
    java.util.Map<QuotaType, QuotaUsage> result = new java.util.HashMap<>();
    for (QuotaType type : QuotaType.values()) {
      result.put(type, checkQuota(userId, type, zoneId));
    }
    return result;
  }

  /**
   * Build Redis key for quota tracking.
   * Format: quota:{quotaType}:{userId}:{periodStart}
   */
  private String buildQuotaKey(UUID userId, QuotaType type, ZoneId zoneId) {
    LocalDate periodStart = type.getResetPeriod().getCurrentPeriodStart(zoneId);
    return String.format("%s:%s:%s:%s", 
        QUOTA_KEY_PREFIX, 
        type.getKey(), 
        userId, 
        periodStart);
  }

  /**
   * Calculate TTL until end of current period.
   */
  private Duration calculateTtl(QuotaResetPeriod period, ZoneId zoneId) {
    LocalDate now = LocalDate.now(zoneId);
    LocalDate periodEnd = period.getCurrentPeriodEnd(zoneId);
    long daysUntilReset = java.time.temporal.ChronoUnit.DAYS.between(now, periodEnd);
    
    // Add a small buffer to ensure key expires after period end
    return Duration.ofDays(daysUntilReset).plusHours(1);
  }
}
