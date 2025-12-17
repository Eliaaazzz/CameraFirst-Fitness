package com.fitnessapp.backend.nutrition.controller;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.security.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Meal CRUD operations controller
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/meals")
@RequiredArgsConstructor
@Validated
public class MealController {

  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  private final NutritionTrackingService nutritionTrackingService;
  private final ObjectMapper objectMapper;
  private final CurrentUser currentUser;

  /**
   * Create new meal log from recognized foods
   * POST /api/v1/meals
   */
  @PostMapping
  public ResponseEntity<MealResponse> createMeal(@Valid @RequestBody CreateMealRequest request) {
    // Extract userId from JWT token if not provided in request
    final UUID userId;
    if (request.getUserId() != null) {
      userId = request.getUserId();
    } else {
      userId = currentUser.get()
          .map(com.fitnessapp.backend.security.AuthenticatedUser::userId)
          .orElseThrow(() -> new EntityNotFoundException("User not authenticated"));
    }
    
    log.info("Creating meal log for user {} with {} items",
        userId, request.getItems().size());

    // Verify user exists
    userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));

    // Calculate totals
    NutritionInfo totals = calculateTotals(request.getItems());

    // Convert food items to JSON
    String foodItemsJson;
    try {
      foodItemsJson = objectMapper.writeValueAsString(request.getItems());
    } catch (JsonProcessingException e) {
      throw new RuntimeException("Failed to serialize food items", e);
    }

    // Create meal log entity
    MealLog mealLog = MealLog.builder()
        .userId(userId)
        .mealType(request.getMealType())
        .foodItems(foodItemsJson)
        .imageUrl(request.getImageUrl())
        .notes(request.getNote())
        .totalCalories(totals.getCalories().intValue())
        .totalProtein(totals.getProtein())
        .totalCarbs(totals.getCarbs())
        .totalFat(totals.getFat())
        .consumedAt(OffsetDateTime.now())
        .build();

    MealLog saved = mealLogRepository.save(mealLog);

    log.info("Created meal log {} with total calories: {}",
        saved.getId(), saved.getTotalCalories());

    return ResponseEntity.ok(toResponse(saved));
  }

  /**
   * Get meals for a user on a specific date
   * GET /api/v1/meals?userId={userId}&date={date}
   */
  @GetMapping
  public ResponseEntity<List<MealResponse>> getMeals(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
  ) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    log.info("Getting meals for user {} on {}", userId, targetDate);

    OffsetDateTime start = targetDate.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime end = start.plusDays(1);

    List<MealLog> meals = mealLogRepository
        .findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(userId, start, end);

    List<MealResponse> responses = meals.stream()
        .map(this::toResponse)
        .collect(Collectors.toList());

    log.info("Found {} meals for user {} on {}", responses.size(), userId, targetDate);

    return ResponseEntity.ok(responses);
  }

  /**
   * Get today's nutrition summary
   * GET /api/v1/nutrition/today/{userId}
   */
  @GetMapping("/today/{userId}")
  public ResponseEntity<DailySummaryResponse> getTodaySummary(@PathVariable UUID userId) {
    log.info("Getting today's summary for user {}", userId);

    // Verify user exists
    userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    var summary = nutritionTrackingService.dailySummary(userId, LocalDate.now());

    // Get today's meals
    LocalDate today = LocalDate.now();
    OffsetDateTime start = today.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime end = start.plusDays(1);
    List<MealLog> todayMeals = mealLogRepository
        .findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(userId, start, end);

    DailySummaryResponse response = DailySummaryResponse.builder()
        .date(today.toString())
        .current(NutritionSummary.builder()
            .calories(summary.calories().actual().doubleValue())
            .protein(summary.protein().actual().doubleValue())
            .fat(summary.fat().actual().doubleValue())
            .carbs(summary.carbs().actual().doubleValue())
            .build())
        .target(NutritionSummary.builder()
            .calories(summary.calories().target().doubleValue())
            .protein(summary.protein().target().doubleValue())
            .fat(summary.fat().target().doubleValue())
            .carbs(summary.carbs().target().doubleValue())
            .build())
        .meals(todayMeals.stream().map(this::toSimpleMeal).collect(Collectors.toList()))
        .healthScore(calculateHealthScore(summary))
        .build();

    return ResponseEntity.ok(response);
  }

  /**
   * Delete a meal log
   * DELETE /api/v1/meals/{id}
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteMeal(@PathVariable Long id) {
    log.info("Deleting meal log {}", id);

    MealLog meal = mealLogRepository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Meal not found: " + id));

    mealLogRepository.delete(meal);

    log.info("Deleted meal log {}", id);

    return ResponseEntity.noContent().build();
  }

  // Helper methods

  private NutritionInfo calculateTotals(List<CreateMealRequest.FoodItemRequest> items) {
    NutritionInfo total = NutritionInfo.zero();
    for (CreateMealRequest.FoodItemRequest item : items) {
      total.setCalories(total.getCalories().add(item.getCalories()));
      total.setProtein(total.getProtein().add(item.getProtein()));
      total.setFat(total.getFat().add(item.getFat()));
      total.setCarbs(total.getCarbs().add(item.getCarbs()));
    }
    return total;
  }

  private MealResponse toResponse(MealLog meal) {
    List<FoodItemResponse> foodItems = null;
    if (meal.getFoodItems() != null) {
      try {
        foodItems = objectMapper.readValue(
            meal.getFoodItems(),
            objectMapper.getTypeFactory().constructCollectionType(
                List.class, FoodItemResponse.class)
        );
      } catch (JsonProcessingException e) {
        log.warn("Failed to parse food items JSON for meal {}", meal.getId());
      }
    }

    return MealResponse.builder()
        .id(meal.getId())
        .userId(meal.getUserId())
        .mealType(meal.getMealType())
        .consumedAt(meal.getConsumedAt())
        .foodItems(foodItems)
        .totalCalories(meal.getTotalCalories())
        .totalProtein(meal.getTotalProtein() != null ? meal.getTotalProtein().doubleValue() : null)
        .totalCarbs(meal.getTotalCarbs() != null ? meal.getTotalCarbs().doubleValue() : null)
        .totalFat(meal.getTotalFat() != null ? meal.getTotalFat().doubleValue() : null)
        .imageUrl(meal.getImageUrl())
        .notes(meal.getNotes())
        .build();
  }

  private SimpleMeal toSimpleMeal(MealLog meal) {
    List<String> foodNames = List.of();
    if (meal.getFoodItems() != null) {
      try {
        List<FoodItemResponse> items = objectMapper.readValue(
            meal.getFoodItems(),
            objectMapper.getTypeFactory().constructCollectionType(
                List.class, FoodItemResponse.class)
        );
        foodNames = items.stream()
            .map(FoodItemResponse::getDisplayName)
            .collect(Collectors.toList());
      } catch (JsonProcessingException e) {
        log.warn("Failed to parse food items for meal {}", meal.getId());
      }
    }

    return SimpleMeal.builder()
        .id(meal.getId())
        .mealType(meal.getMealType())
        .time(meal.getConsumedAt().toLocalTime().toString())
        .calories(meal.getTotalCalories())
        .foods(foodNames)
        .build();
  }

  private int calculateHealthScore(NutritionTrackingService.NutritionSummary summary) {
    double caloriesScore = Math.min(100, summary.calories().actual().divide(summary.calories().target(), 4, java.math.RoundingMode.HALF_UP).multiply(new java.math.BigDecimal("100")).doubleValue());
    double proteinScore = Math.min(100, summary.protein().actual().divide(summary.protein().target(), 4, java.math.RoundingMode.HALF_UP).multiply(new java.math.BigDecimal("100")).doubleValue());
    double balanceScore = 100 - Math.abs(summary.calories().percent() - 100);

    return (int) ((caloriesScore + proteinScore + balanceScore) / 3);
  }

  // Response DTOs

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MealResponse {
    private Long id;
    private UUID userId;
    private String mealType;
    private OffsetDateTime consumedAt;
    private List<FoodItemResponse> foodItems;
    private Integer totalCalories;
    private Double totalProtein;
    private Double totalCarbs;
    private Double totalFat;
    private String imageUrl;
    private String notes;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FoodItemResponse {
    private String foodKey;
    private String displayName;
    private Integer grams;
    private Double calories;
    private Double protein;
    private Double fat;
    private Double carbs;
    private Double confidence;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DailySummaryResponse {
    private String date;
    private NutritionSummary current;
    private NutritionSummary target;
    private List<SimpleMeal> meals;
    private Integer healthScore;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class NutritionSummary {
    private Double calories;
    private Double protein;
    private Double fat;
    private Double carbs;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SimpleMeal {
    private Long id;
    private String mealType;
    private String time;
    private Integer calories;
    private List<String> foods;
  }
}
