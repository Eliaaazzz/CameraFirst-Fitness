package com.fitnessapp.backend.nutrition.service;

import java.time.Duration;
import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
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
    } catch (Exception e) {
      log.warn("Failed to read food nutrition cache for key={}", foodKey, e);
      redisTemplate.delete(cacheKey);
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
