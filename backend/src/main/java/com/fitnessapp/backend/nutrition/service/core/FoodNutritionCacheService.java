package com.fitnessapp.backend.nutrition.service.core;

import java.time.Duration;
import java.util.Optional;

import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.FoodNutritionDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Simple Redis-backed cache for FoodNutrition DTOs.
 * This keeps caching concerns out of the DTO itself.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FoodNutritionCacheService {

  private static final String CACHE_PREFIX = "food_nutrition:";
  private static final Duration TTL = Duration.ofHours(6);

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  public Optional<FoodNutritionDto> get(String foodKey) {
    String cacheKey = cacheKey(foodKey);
    try {
      String payload = redisTemplate.opsForValue().get(cacheKey);
      if (!StringUtils.hasText(payload)) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(payload, FoodNutritionDto.class));
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
      // Corrupted JSON stored in cache — remove the key to avoid repeated failures
      log.warn("Failed to deserialize cached food nutrition for key={}", foodKey, e);
      try {
        redisTemplate.delete(cacheKey);
      } catch (Exception ex) {
        log.warn("Failed to delete corrupted cache key={}", cacheKey, ex);
      }
      return Optional.empty();
    } catch (SerializationException e) {
      // Redis-side serialization/deserialization error (e.g. stored value can't be deserialized by Redis serializer)
      log.warn("Redis serializer error for key={}; removing corrupted key", cacheKey, e);
      try {
        redisTemplate.delete(cacheKey);
        log.info("Deleted corrupted key from Redis: {}", cacheKey);
      } catch (Exception ex) {
        // If delete fails (e.g. connection issue), swallow to preserve main flow
        log.warn("Failed to delete corrupted key during fallback: {}", cacheKey, ex);
      }
      return Optional.empty();
    } catch (DataAccessException e) {
      // Redis access problem (connection, timeout, etc.). Treat as cache miss — do NOT delete key.
      log.warn("Redis access error when reading cache for key={}; treating as cache miss", foodKey, e);
      return Optional.empty();
    } catch (Exception e) {
      // Unexpected error — log and return empty, avoid deleting the key on unknown errors.
      log.warn("Unexpected error reading food nutrition cache for key={}", foodKey, e);
      return Optional.empty();
    }
  }

  public void put(FoodNutritionDto dto) {
    if (dto == null || !StringUtils.hasText(dto.getFoodKey())) {
      return;
    }
    String cacheKey = cacheKey(dto.getFoodKey());
    try {
      String payload = objectMapper.writeValueAsString(dto);
      redisTemplate.opsForValue().set(cacheKey, payload, TTL);
    } catch (JsonProcessingException e) {
      log.warn("Failed to cache food nutrition for key={}", dto.getFoodKey(), e);
    }
  }

  public void evict(String foodKey) {
    redisTemplate.delete(cacheKey(foodKey));
  }

  private String cacheKey(String foodKey) {
    return CACHE_PREFIX + foodKey;
  }
}








