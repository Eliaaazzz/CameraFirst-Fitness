package com.fitnessapp.backend.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.fitnessapp.backend.Cacheservice.cache.UserLibraryCacheKeys;
import java.time.Duration;
import org.springframework.boot.autoconfigure.cache.CacheManagerCustomizer;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CacheConfig {

  @Bean
  public CacheManagerCustomizer<CaffeineCacheManager> caffeineCacheCustomizer() {
    return manager -> {
      manager.setAllowNullValues(false);
      manager.setCaffeine(caffeineBuilder(Duration.ofMinutes(10), 1_000));

      // Core retrieval caches
      manager.registerCustomCache("recipeSearch", caffeineCache(Duration.ofMinutes(30), 1_000));
      manager.registerCustomCache("recipes", caffeineCache(Duration.ofHours(2), 500));
      manager.registerCustomCache("workoutSearch", caffeineCache(Duration.ofMinutes(15), 1_000));
      manager.registerCustomCache("workouts", caffeineCache(Duration.ofMinutes(20), 500));

      // User library caches (explicitly kept)
      manager.registerCustomCache(UserLibraryCacheKeys.WORKOUTS_CACHE, caffeineCache(Duration.ofMinutes(5), 1_000));
      manager.registerCustomCache(UserLibraryCacheKeys.RECIPES_CACHE, caffeineCache(Duration.ofMinutes(5), 1_000));
    };
  }

  private Cache<Object, Object> caffeineCache(Duration ttl, long maxSize) {
    return caffeineBuilder(ttl, maxSize).build();
  }

  private Caffeine<Object, Object> caffeineBuilder(Duration ttl, long maxSize) {
    return Caffeine.newBuilder()
        .expireAfterWrite(ttl)
        .maximumSize(maxSize);
  }
}
