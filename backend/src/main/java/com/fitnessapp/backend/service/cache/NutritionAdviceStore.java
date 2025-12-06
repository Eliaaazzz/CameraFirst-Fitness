package com.fitnessapp.backend.service.cache;

import java.io.Serializable;
import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Cache store for nutrition advice indexed by user and week.
 * Extends {@link GenericCacheStore} to leverage the common cache pattern.
 */
@Component
public class NutritionAdviceStore extends GenericCacheStore<NutritionAdviceStore.AdviceEntry> {

  public static final String CACHE_NAME = NutritionCacheKeys.ADVICE_CACHE;
  private static final Duration FALLBACK_TTL = Duration.ofHours(6);

  public NutritionAdviceStore(IndexedCacheFacade cacheFacade) {
    super(cacheFacade, CACHE_NAME, FALLBACK_TTL, AdviceEntry.class);
  }

  public AdviceEntry get(UUID userId, LocalDate weekStart) {
    return get(NutritionCacheKeys.adviceKey(userId, weekStart));
  }

  public void put(UUID userId, LocalDate weekStart, AdviceEntry entry) {
    put(
        NutritionCacheKeys.adviceIndexKey(userId),
        NutritionCacheKeys.adviceKey(userId, weekStart),
        entry);
  }

  public void refresh(UUID userId, LocalDate weekStart, AdviceEntry entry) {
    refresh(
        NutritionCacheKeys.adviceIndexKey(userId),
        NutritionCacheKeys.adviceKey(userId, weekStart),
        entry);
  }

  public void invalidate(UUID userId) {
    invalidateNamespace(NutritionCacheKeys.adviceIndexKey(userId));
  }

  public void invalidate(UUID userId, LocalDate weekStart) {
    invalidateEntry(
        NutritionCacheKeys.adviceIndexKey(userId),
        NutritionCacheKeys.adviceKey(userId, weekStart));
  }

  public record AdviceEntry(String signature, String advice) implements Serializable {
    private static final long serialVersionUID = 1L;
  }
}
