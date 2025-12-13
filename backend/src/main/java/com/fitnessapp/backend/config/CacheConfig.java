package com.fitnessapp.backend.config;

import java.time.Duration;
import java.util.Set;
import org.springframework.boot.autoconfigure.cache.CacheManagerCustomizer;
import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import com.fitnessapp.backend.Cacheservice.cache.LeaderboardCacheKeys;
import com.fitnessapp.backend.Cacheservice.cache.NutritionCacheKeys;
import com.fitnessapp.backend.Cacheservice.cache.UserLibraryCacheKeys;

@Configuration
public class CacheConfig {

  @Bean
  @ConditionalOnBean(RedisConnectionFactory.class)
  public RedisCacheManagerBuilderCustomizer redisCacheCustomizer() {
    return builder -> builder
        // Nutrition advice: 6 hours
        .withCacheConfiguration(
            "nutritionAdvice",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(6))
        )
        // Recipe search results: 30 minutes
        .withCacheConfiguration(
            "recipeSearch",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(30))
        )
        // Individual recipes: 2 hours
        .withCacheConfiguration(
            "recipes",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(2))
        )
        // Spoonacular API responses: 24 hours (reduce API costs)
        .withCacheConfiguration(
            "spoonacular",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(24))
        )
        // Trending recipes: 15 minutes (fresh data)
        .withCacheConfiguration(
            "trending",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofMinutes(15))
        )
        // Community favorites: 1 hour
        .withCacheConfiguration(
            "communityFavorites",
            RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofHours(1))
        );
  }

  @Bean
  @ConditionalOnBean(ConcurrentMapCacheManager.class)
  public CacheManagerCustomizer<ConcurrentMapCacheManager> indexedCacheRegistration() {
    return manager -> manager.setCacheNames(
        Set.of(
            NutritionCacheKeys.ADVICE_CACHE,
            LeaderboardCacheKeys.LEADERBOARD_CACHE,
            UserLibraryCacheKeys.WORKOUTS_CACHE,
            UserLibraryCacheKeys.RECIPES_CACHE
        ));
  }
}
