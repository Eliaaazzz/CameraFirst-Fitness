package com.fitnessapp.backend.config;

import java.time.Duration;

import org.springframework.boot.autoconfigure.cache.RedisCacheManagerBuilderCustomizer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import com.fitnessapp.backend.Cacheservice.cache.UserLibraryCacheKeys;

/**
 * Distributed (L2) cache configuration, activated only when {@code spring.cache.type=redis}.
 *
 * <p>By default the app uses in-process Caffeine ({@link CacheConfig}). Flipping
 * {@code SPRING_CACHE_TYPE=redis} (with {@code SPRING_DATA_REDIS_HOST}/URL set) switches Spring's
 * cache abstraction to Redis, giving a cache that survives restarts and is shared across instances
 * — the foundation for the "Redis cache on/off" performance experiment and for horizontal scale-out
 * on Cloud Run. Per-cache TTLs mirror the Caffeine settings so behaviour is comparable.</p>
 */
@Configuration
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
public class RedisCacheConfig {

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheTtlCustomizer() {
        // Default-typed JSON serializer so arbitrary cached DTOs round-trip correctly.
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer();
        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        return builder -> builder
                .cacheDefaults(base)
                .withCacheConfiguration("recipeSearch", base.entryTtl(Duration.ofMinutes(30)))
                .withCacheConfiguration("recipes", base.entryTtl(Duration.ofHours(2)))
                .withCacheConfiguration("workoutSearch", base.entryTtl(Duration.ofMinutes(15)))
                .withCacheConfiguration("workouts", base.entryTtl(Duration.ofMinutes(20)))
                .withCacheConfiguration(UserLibraryCacheKeys.WORKOUTS_CACHE, base.entryTtl(Duration.ofMinutes(5)))
                .withCacheConfiguration(UserLibraryCacheKeys.RECIPES_CACHE, base.entryTtl(Duration.ofMinutes(5)));
    }
}
