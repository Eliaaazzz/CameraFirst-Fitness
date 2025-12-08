package com.fitnessapp.backend.recipe.service;

import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Manages free quota for AI recipe generation
 *
 * Free tier limits:
 * - Daily: 5 generations per user per day
 * - Monthly: 30 generations per user per month
 *
 * After exceeding quota, users can:
 * - Wait until quota resets (next day/month)
 * - Use cached recipes (24-hour cache)
 * - Future: Upgrade to premium for unlimited generations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeGenerationQuotaService {

  private static final String DAILY_QUOTA_PREFIX = "recipe-quota:daily:";
  private static final String MONTHLY_QUOTA_PREFIX = "recipe-quota:monthly:";

  private final StringRedisTemplate redisTemplate;
  private final MeterRegistry meterRegistry;

  @Value("${app.recipe-generation.daily-quota:5}")
  private int dailyQuota;

  @Value("${app.recipe-generation.monthly-quota:30}")
  private int monthlyQuota;

  /**
   * Check if user has remaining quota for recipe generation
   *
   * @param userId User ID
   * @return QuotaStatus with remaining quota info
   */
  public QuotaStatus checkQuota(UUID userId) {
    String today = LocalDate.now(ZoneId.systemDefault()).toString();
    String currentMonth = LocalDate.now(ZoneId.systemDefault()).withDayOfMonth(1).toString();

    String dailyKey = DAILY_QUOTA_PREFIX + userId + ":" + today;
    String monthlyKey = MONTHLY_QUOTA_PREFIX + userId + ":" + currentMonth;

    int dailyUsed = getUsageCount(dailyKey);
    int monthlyUsed = getUsageCount(monthlyKey);

    boolean hasQuota = dailyUsed < dailyQuota && monthlyUsed < monthlyQuota;
    int dailyRemaining = Math.max(0, dailyQuota - dailyUsed);
    int monthlyRemaining = Math.max(0, monthlyQuota - monthlyUsed);

    log.debug("Quota check for user {}: daily={}/{}, monthly={}/{}",
        userId, dailyUsed, dailyQuota, monthlyUsed, monthlyQuota);

    meterRegistry.gauge("recipe.generation.quota.daily.remaining",
        dailyRemaining);
    meterRegistry.gauge("recipe.generation.quota.monthly.remaining",
        monthlyRemaining);

    return new QuotaStatus(
        hasQuota,
        dailyUsed,
        dailyQuota,
        dailyRemaining,
        monthlyUsed,
        monthlyQuota,
        monthlyRemaining
    );
  }

  /**
   * Increment usage count for a user
   *
   * @param userId User ID
   */
  public void incrementUsage(UUID userId) {
    String today = LocalDate.now(ZoneId.systemDefault()).toString();
    String currentMonth = LocalDate.now(ZoneId.systemDefault()).withDayOfMonth(1).toString();

    String dailyKey = DAILY_QUOTA_PREFIX + userId + ":" + today;
    String monthlyKey = MONTHLY_QUOTA_PREFIX + userId + ":" + currentMonth;

    // Increment daily counter with TTL = end of today
    redisTemplate.opsForValue().increment(dailyKey);
    redisTemplate.expire(dailyKey, Duration.ofDays(1));

    // Increment monthly counter with TTL = end of month
    redisTemplate.opsForValue().increment(monthlyKey);
    redisTemplate.expire(monthlyKey, Duration.ofDays(32)); // Approximate month

    int dailyUsed = getUsageCount(dailyKey);
    int monthlyUsed = getUsageCount(monthlyKey);

    log.info("Incremented quota for user {}: daily={}/{}, monthly={}/{}",
        userId, dailyUsed, dailyQuota, monthlyUsed, monthlyQuota);

    meterRegistry.counter("recipe.generation.quota.used", "period", "daily").increment();
    meterRegistry.counter("recipe.generation.quota.used", "period", "monthly").increment();
  }

  /**
   * Get current usage count from Redis
   */
  private int getUsageCount(String key) {
    String value = redisTemplate.opsForValue().get(key);
    return value != null ? Integer.parseInt(value) : 0;
  }

  /**
   * Reset quota for a user (admin function)
   *
   * @param userId User ID
   */
  public void resetQuota(UUID userId) {
    String today = LocalDate.now(ZoneId.systemDefault()).toString();
    String currentMonth = LocalDate.now(ZoneId.systemDefault()).withDayOfMonth(1).toString();

    String dailyKey = DAILY_QUOTA_PREFIX + userId + ":" + today;
    String monthlyKey = MONTHLY_QUOTA_PREFIX + userId + ":" + currentMonth;

    redisTemplate.delete(dailyKey);
    redisTemplate.delete(monthlyKey);

    log.info("Reset quota for user {}", userId);
  }

  /**
   * Quota status result
   */
  public record QuotaStatus(
      boolean hasQuota,
      int dailyUsed,
      int dailyLimit,
      int dailyRemaining,
      int monthlyUsed,
      int monthlyLimit,
      int monthlyRemaining
  ) {
    public String getMessage() {
      if (hasQuota) {
        return String.format("Quota available: %d/%d daily, %d/%d monthly",
            dailyRemaining, dailyLimit, monthlyRemaining, monthlyLimit);
      }

      if (dailyUsed >= dailyLimit) {
        return String.format("Daily quota exceeded (%d/%d). Resets tomorrow.",
            dailyUsed, dailyLimit);
      }

      if (monthlyUsed >= monthlyLimit) {
        return String.format("Monthly quota exceeded (%d/%d). Resets next month.",
            monthlyUsed, monthlyLimit);
      }

      return "Quota exceeded";
    }
  }
}
