package com.fitnessapp.backend.service.quota;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.fitnessapp.backend.Cacheservice.quota.QuotaExceededException;
import com.fitnessapp.backend.Cacheservice.quota.QuotaResetPeriod;
import com.fitnessapp.backend.Cacheservice.quota.QuotaService;
import com.fitnessapp.backend.Cacheservice.quota.QuotaType;
import com.fitnessapp.backend.Cacheservice.quota.QuotaUsage;

@ExtendWith(MockitoExtension.class)
class QuotaServiceTest {

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private ValueOperations<String, String> valueOps;

  private QuotaService quotaService;
  private SimpleMeterRegistry meterRegistry;

  @BeforeEach
  void setUp() {
    meterRegistry = new SimpleMeterRegistry();
    quotaService = new QuotaService(redisTemplate, meterRegistry);
    // Use lenient for common stubs that may not be used in all tests
    lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
  }

  @Test
  void checkQuotaReturnsZeroUsedWhenNoData() {
    UUID userId = UUID.randomUUID();
    when(valueOps.get(anyString())).thenReturn(null);

    QuotaUsage usage = quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION);

    assertThat(usage.used()).isZero();
    assertThat(usage.remaining()).isEqualTo(QuotaType.AI_RECIPE_GENERATION.getFreeLimit());
    assertThat(usage.exceeded()).isFalse();
  }

  @Test
  void checkQuotaReturnsCurrentUsage() {
    UUID userId = UUID.randomUUID();
    when(valueOps.get(anyString())).thenReturn("3");

    QuotaUsage usage = quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION);

    assertThat(usage.used()).isEqualTo(3);
    assertThat(usage.remaining()).isEqualTo(7); // 10 - 3
    assertThat(usage.exceeded()).isFalse();
  }

  @Test
  void consumeQuotaIncrementsCounter() {
    UUID userId = UUID.randomUUID();
    when(valueOps.increment(anyString(), anyLong())).thenReturn(1L);
    when(redisTemplate.expire(anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

    QuotaUsage usage = quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION);

    assertThat(usage.used()).isEqualTo(1);
    assertThat(usage.remaining()).isEqualTo(9);
    verify(valueOps).increment(anyString(), eq(1L));
    verify(redisTemplate).expire(anyString(), anyLong(), eq(TimeUnit.SECONDS));
  }

  @Test
  void consumeQuotaThrowsWhenExceeded() {
    UUID userId = UUID.randomUUID();
    when(valueOps.increment(anyString(), anyLong())).thenReturn(11L);

    assertThatThrownBy(() -> quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION))
        .isInstanceOf(QuotaExceededException.class)
        .hasMessageContaining("Quota exceeded");
  }

  @Test
  void consumeQuotaWithAmountConsumesMultiple() {
    UUID userId = UUID.randomUUID();
    when(valueOps.increment(anyString(), anyLong())).thenReturn(5L);
    when(redisTemplate.expire(anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

    QuotaUsage usage = quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION, 5);

    assertThat(usage.used()).isEqualTo(5);
    assertThat(usage.remaining()).isEqualTo(5);
    verify(valueOps).increment(anyString(), eq(5L));
  }

  @Test
  void resetQuotaDeletesRedisKey() {
    UUID userId = UUID.randomUUID();

    quotaService.resetQuota(userId, QuotaType.AI_RECIPE_GENERATION);

    verify(redisTemplate).delete(anyString());
  }

  @Test
  void getAllQuotasReturnsAllTypes() {
    UUID userId = UUID.randomUUID();
    when(valueOps.get(anyString())).thenReturn("0");

    Map<QuotaType, QuotaUsage> quotas = quotaService.getAllQuotas(userId);

    assertThat(quotas).hasSize(QuotaType.values().length);
    assertThat(quotas).containsKeys(QuotaType.values());
  }

  @Test
  void quotaUsagePeriodMatchesResetPeriod() {
    UUID userId = UUID.randomUUID();
    when(valueOps.get(anyString())).thenReturn("2");
    ZoneId zone = ZoneId.systemDefault();

    QuotaUsage usage = quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION, zone);

    LocalDate expectedStart = QuotaResetPeriod.DAILY.getCurrentPeriodStart(zone);
    LocalDate expectedEnd = QuotaResetPeriod.DAILY.getCurrentPeriodEnd(zone);

    assertThat(usage.periodStart()).isEqualTo(expectedStart);
    assertThat(usage.periodEnd()).isEqualTo(expectedEnd);
  }

  @Test
  void consumeQuotaRecordsMetrics() {
    UUID userId = UUID.randomUUID();
    when(valueOps.increment(anyString(), anyLong())).thenReturn(1L);
    when(redisTemplate.expire(anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

    quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION);

    assertThat(meterRegistry.counter("quota.consumed", 
        "type", "ai_recipe_generation", "exceeded", "false").count()).isEqualTo(1.0);
  }

  @Test
  void consumeQuotaRecordsExceededMetric() {
    UUID userId = UUID.randomUUID();
    when(valueOps.increment(anyString(), anyLong())).thenReturn(11L);

    try {
      quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION);
    } catch (QuotaExceededException ignored) {
    }

    assertThat(meterRegistry.counter("quota.exceeded", "type", "ai_recipe_generation").count())
        .isEqualTo(1.0);
  }
}
