package com.fitnessapp.backend.recipe.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.workout.entity.WorkoutSession;
import com.fitnessapp.backend.workout.repository.WorkoutSessionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class SmartRecipeService {

  private static final String CACHE_PREFIX = "meal-plan:";

  private final UserProfileRepository userProfileRepository;
  private final WorkoutSessionRepository workoutSessionRepository;
  private final RecipeRepository recipeRepository;
  private final MealPlanHistoryService mealPlanHistoryService;
  private final ObjectMapper objectMapper;
  @Nullable
  private final StringRedisTemplate redisTemplate;

  public SmartRecipeService(
      UserProfileRepository userProfileRepository,
      WorkoutSessionRepository workoutSessionRepository,
      RecipeRepository recipeRepository,
      MealPlanHistoryService mealPlanHistoryService,
      ObjectMapper objectMapper,
      @Autowired(required = false) StringRedisTemplate redisTemplate) {
    this.userProfileRepository = userProfileRepository;
    this.workoutSessionRepository = workoutSessionRepository;
    this.recipeRepository = recipeRepository;
    this.mealPlanHistoryService = mealPlanHistoryService;
    this.objectMapper = objectMapper;
    this.redisTemplate = redisTemplate;
  }

  @Value("${app.meal-plan.cache-ttl-hours:24}")
  private long cacheTtlHours;

  public MealPlanResponse generateMealPlan(UUID userId) {
    MealPlanResponse cached = readCachedPlan(userId);
    if (cached != null) {
      log.debug("Returning cached meal plan for user {}", userId);
      return cached;
    }

    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    LocalDateTime now = LocalDateTime.now();
    List<WorkoutSession> sessions = workoutSessionRepository
        .findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(userId, now.minusDays(7), now);

    NutritionTarget target = computeNutritionTarget(profile, sessions);

    MealPlanResponse fallback = fallbackMealPlan(profile, target);
    persistAndCachePlan(userId, fallback, "FALLBACK");
    return fallback;
  }

  public void evictCache(UUID userId) {
    if (redisTemplate == null) return;
    String cacheKey = cacheKey(userId);
    redisTemplate.delete(cacheKey);
  }

  public Optional<MealPlanResponse> getCachedMealPlan(UUID userId) {
    return Optional.ofNullable(readCachedPlan(userId));
  }

  private MealPlanResponse readCachedPlan(UUID userId) {
    if (redisTemplate == null) return null;
    String value = redisTemplate.opsForValue().get(cacheKey(userId));
    if (StringUtils.hasText(value)) {
      try {
        return objectMapper.readValue(value, MealPlanResponse.class);
      } catch (JsonProcessingException e) {
        log.warn("Failed to deserialize cached meal plan for user {}", userId, e);
        redisTemplate.delete(cacheKey(userId));
      }
    }

    return mealPlanHistoryService.latestPlan(userId)
        .flatMap(plan -> {
          try {
            return Optional.of(objectMapper.readValue(plan.getPlanPayload(), MealPlanResponse.class));
          } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize stored meal plan for user {}", userId, e);
            return Optional.empty();
          }
        }).orElse(null);
  }

  private void persistAndCachePlan(UUID userId, MealPlanResponse response, String source) {
    try {
      String payload = objectMapper.writeValueAsString(response);
      mealPlanHistoryService.storePlan(userId, response, source, payload);
      writeCache(userId, payload);
    } catch (JsonProcessingException e) {
      log.warn("Unable to serialize meal plan for user {}", userId, e);
    }
  }

  private void writeCache(UUID userId, String payload) {
    if (redisTemplate == null) return;
    try {
      Duration ttl = Duration.ofHours(cacheTtlHours <= 0 ? 24 : cacheTtlHours);
      redisTemplate.opsForValue().set(cacheKey(userId), payload, ttl);
    } catch (Exception e) {
      log.warn("Unable to cache meal plan for user {}", userId, e);
    }
  }

  private String cacheKey(UUID userId) {
    return CACHE_PREFIX + userId;
  }

  private NutritionTarget computeNutritionTarget(UserProfile profile, List<WorkoutSession> sessions) {
    int calories = Optional.ofNullable(profile.getDailyCalorieTarget()).orElseGet(() ->
        Optional.ofNullable(profile.getBasalMetabolicRate()).orElse(2000));
    int protein = Optional.ofNullable(profile.getDailyProteinTarget()).orElse((int) Math.round(calories * 0.32 / 4));
    int carbs = Optional.ofNullable(profile.getDailyCarbsTarget()).orElse((int) Math.round(calories * 0.38 / 4));
    int fat = Optional.ofNullable(profile.getDailyFatTarget()).orElse((int) Math.round(calories * 0.30 / 9));

    int additionalCalories = sessions.stream()
        .mapToInt(session -> Optional.ofNullable(session.getDurationSeconds()).orElse(0))
        .map(seconds -> seconds / 300) // per 5 minutes
        .sum() * 20; // +20 kcal per 5 minutes of recorded training

    calories += additionalCalories;
    protein += sessions.size() * 5;

    return new NutritionTarget(calories, protein, carbs, fat);
  }

  private MealPlanResponse fallbackMealPlan(UserProfile profile, NutritionTarget target) {
    List<Recipe> recipes = recipeRepository.findTop12ByOrderByCreatedAtDesc();
    if (recipes.isEmpty()) {
      recipes = recipeRepository.findAll().stream().limit(12).collect(Collectors.toList());
    }
    if (recipes.isEmpty()) {
      log.warn("No recipes available for fallback plan");
      List<MealPlanDay> empty = new ArrayList<>();
      return new MealPlanResponse(target, empty);
    }

    Map<String, Integer> defaultMacros = defaultPerMealMacros(target);
    List<MealPlanDay> days = new ArrayList<>();
    String[] mealTypes = {"breakfast", "lunch", "dinner", "snack"};

    for (int day = 1; day <= 7; day++) {
      List<MealEntry> meals = new ArrayList<>();
      for (int i = 0; i < mealTypes.length; i++) {
        Recipe recipe = recipes.get((day * mealTypes.length + i) % recipes.size());
        meals.add(new MealEntry(
            mealTypes[i],
            recipe.getId() != null ? recipe.getId().toString() : null,
            recipe.getTitle(),
            defaultMacros.get("calories"),
            defaultMacros.get("protein").doubleValue(),
            defaultMacros.get("carbs").doubleValue(),
            defaultMacros.get("fat").doubleValue(),
            recipe.getDifficulty()
        ));
      }
      days.add(new MealPlanDay(day, meals));
    }
    return new MealPlanResponse(target, days);
  }

  private Map<String, Integer> defaultPerMealMacros(NutritionTarget target) {
    Map<String, Integer> macros = new HashMap<>();
    macros.put("calories", Math.max(350, target.calories() / 4));
    macros.put("protein", Math.max(20, target.protein() / 4));
    macros.put("carbs", Math.max(25, target.carbs() / 4));
    macros.put("fat", Math.max(10, target.fat() / 4));
    return macros;
  }
  public record NutritionTarget(int calories, int protein, int carbs, int fat) {}

  public record MealPlanResponse(NutritionTarget target, List<MealPlanDay> days) {}

  public record MealPlanDay(int dayNumber, List<MealEntry> meals) {}

  public record MealEntry(
      String mealType,
      String recipeId,
      String recipeName,
      Integer calories,
      Double protein,
      Double carbs,
      Double fat,
      String note
  ) {}
}
