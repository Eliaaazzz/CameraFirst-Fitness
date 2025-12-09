package com.fitnessapp.backend.service.cache;

import java.time.LocalDate;
import java.util.UUID;

public final class NutritionCacheKeys {

  public static final String ADVICE_CACHE = "nutritionAdvice";
  public static final String ADVICE_PREFIX = "nutrition:advice:";
  private static final String INDEX_SUFFIX = ":index";

  private NutritionCacheKeys() {}

  public static String adviceKey(UUID userId, LocalDate weekStart) {
    return ADVICE_PREFIX + userId + ":" + weekStart;
  }

  public static String adviceIndexKey(UUID userId) {
    return ADVICE_PREFIX + userId + INDEX_SUFFIX;
  }
}
