package com.fitnessapp.backend.nutrition.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.MealHistoryService;
import com.fitnessapp.backend.nutrition.service.MealInsightsService;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Meal CRUD operations controller.
 *
 * Responsibilities:
 * - Create, read, update, delete meal logs
 * - Get meals by date
 *
 * Note: Nutrition analysis and insights are handled by NutritionController (/api/v1/nutrition)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/meals")
@RequiredArgsConstructor
@Validated
public class MealController {

  private final MealLogRepository mealLogRepository;
  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final ObjectMapper objectMapper;
  private final MealHistoryService mealHistoryService;
  private final MealInsightsService mealInsightsService;

  private static final int DEFAULT_DAILY_CALORIES = 2000;
  private static final int DEFAULT_DAILY_PROTEIN = 130;
  private static final int DEFAULT_DAILY_CARBS = 220;
  private static final int DEFAULT_DAILY_FAT = 70;
  
  /**
   * Create new meal log from recognized foods
   * POST /api/v1/meals
   * Security: userId is ALWAYS extracted from JWT token (@AuthenticationPrincipal)
   * Client cannot specify userId - this prevents IDOR attacks
   */
  @PostMapping
  public ResponseEntity<MealResponse> createMeal(
      @Valid @RequestBody CreateMealRequest request,
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser) {

    // Require valid JWT authentication - reject if no authenticated user
    if (currentUser == null || currentUser.userId() == null) {
      log.warn("Meal creation rejected: No authenticated user (JWT may be missing or invalid)");
      return ResponseEntity.status(401).build();
    }

    // Extract userId from JWT token (always from authenticated user)
    final UUID userId = currentUser.userId();
    
    log.info("Creating meal log for user {} with {} items",
        userId, request.getItems().size());

    // Verify user exists in the users table (not user_profiles, which is optional)
    userRepository.findById(userId)
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
   * GET /api/v1/meals?date={date}&timezone={timezone}
   */
  @GetMapping
  public ResponseEntity<List<MealResponse>> getMeals(
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
      @RequestParam(required = false) String timezone
  ) {
    UUID userId = currentUser.userId();
    ZoneId zone = resolveZoneId(timezone);
    LocalDate targetDate = date != null ? date : LocalDate.now(zone);
    log.info("Getting meals for user {} on {} (timezone: {})", userId, targetDate, zone);

    OffsetDateTime start = targetDate.atStartOfDay(zone).toOffsetDateTime();
    OffsetDateTime end = targetDate.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

    List<MealLog> meals = mealLogRepository
        .findByUserIdAndConsumedAtBetweenOrderByConsumedAtDesc(userId, start, end);

    List<MealResponse> responses = meals.stream()
        .map(this::toResponse)
        .collect(Collectors.toList());

    log.info("Found {} meals for user {} on {}", responses.size(), userId, targetDate);

    return ResponseEntity.ok(responses);
  }

  /**
   * Get today's summary with timezone-aware date boundaries
   * GET /api/v1/meals/today
   */
  @GetMapping("/today")
  public ResponseEntity<TodaySummaryResponse> getTodaySummary(
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser,
      @RequestParam(required = false) String timezone
  ) {
    if (currentUser == null) {
      log.warn("Today summary requested without authentication");
      return ResponseEntity.status(401).build();
    }

    UUID userId = currentUser.userId();
    ZoneId zone = resolveZoneId(timezone);
    LocalDate targetDate = LocalDate.now(zone);

    OffsetDateTime start = targetDate.atStartOfDay(zone).toOffsetDateTime();
    OffsetDateTime end = targetDate.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

    List<MealLog> meals = mealLogRepository
        .findByUserIdAndConsumedAtBetweenOrderByConsumedAtDesc(userId, start, end);

    int totalCalories = meals.stream()
        .mapToInt(m -> firstNonNull(m.getTotalCalories(), m.getCalories()))
        .sum();
    double totalProtein = meals.stream()
        .mapToDouble(m -> toDoubleOrZero(m.getTotalProtein(), m.getProteinGrams()))
        .sum();
    double totalCarbs = meals.stream()
        .mapToDouble(m -> toDoubleOrZero(m.getTotalCarbs(), m.getCarbsGrams()))
        .sum();
    double totalFat = meals.stream()
        .mapToDouble(m -> toDoubleOrZero(m.getTotalFat(), m.getFatGrams()))
        .sum();

    UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
    int calorieTarget = profile != null && profile.getDailyCalorieTarget() != null
        ? profile.getDailyCalorieTarget() : DEFAULT_DAILY_CALORIES;
    double proteinTarget = profile != null && profile.getDailyProteinTarget() != null
        ? profile.getDailyProteinTarget() : DEFAULT_DAILY_PROTEIN;
    double carbsTarget = profile != null && profile.getDailyCarbsTarget() != null
        ? profile.getDailyCarbsTarget() : DEFAULT_DAILY_CARBS;
    double fatTarget = profile != null && profile.getDailyFatTarget() != null
        ? profile.getDailyFatTarget() : DEFAULT_DAILY_FAT;

    int healthScore = calculateHealthScore(
        totalCalories, calorieTarget,
        totalProtein, proteinTarget,
        totalCarbs, carbsTarget,
        totalFat, fatTarget
    );

    TodaySummaryResponse response = TodaySummaryResponse.builder()
        .date(targetDate.toString())
        .timezone(zone.getId())
        .current(new NutritionTotals(totalCalories, totalProtein, totalCarbs, totalFat))
        .target(new NutritionTotals(calorieTarget, proteinTarget, carbsTarget, fatTarget))
        .meals(meals.stream().map(this::toResponse).collect(Collectors.toList()))
        .healthScore(healthScore)
        .build();

    log.info("Today summary for user {} ({} meals, timezone {}): {} kcal", userId, meals.size(), zone, totalCalories);
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

  /**
   * Update an existing meal log
   * PUT /api/v1/meals/{id}
   * Security: Validates that the meal belongs to the authenticated user
   */
  @PutMapping("/{id}")
  public ResponseEntity<MealResponse> updateMeal(
      @PathVariable Long id,
      @Valid @RequestBody CreateMealRequest request,
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser) {

    if (currentUser == null || currentUser.userId() == null) {
      log.warn("Meal update rejected: No authenticated user");
      return ResponseEntity.status(401).build();
    }

    final UUID userId = currentUser.userId();
    log.info("Updating meal log {} for user {}", id, userId);

    // Find the meal and verify ownership
    MealLog meal = mealLogRepository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Meal not found: " + id));

    // Security check: ensure the meal belongs to the authenticated user
    if (!meal.getUserId().equals(userId)) {
      log.warn("User {} attempted to update meal {} owned by {}", userId, id, meal.getUserId());
      return ResponseEntity.status(403).build();
    }

    // Calculate new totals
    NutritionInfo totals = calculateTotals(request.getItems());

    // Convert food items to JSON
    String foodItemsJson;
    try {
      foodItemsJson = objectMapper.writeValueAsString(request.getItems());
    } catch (JsonProcessingException e) {
      throw new RuntimeException("Failed to serialize food items", e);
    }

    // Update meal fields
    meal.setMealType(request.getMealType());
    meal.setFoodItems(foodItemsJson);
    meal.setTotalCalories(totals.getCalories().intValue());
    meal.setTotalProtein(totals.getProtein());
    meal.setTotalCarbs(totals.getCarbs());
    meal.setTotalFat(totals.getFat());
    if (request.getNote() != null) {
      meal.setNotes(request.getNote());
    }
    if (request.getImageUrl() != null) {
      meal.setImageUrl(request.getImageUrl());
    }

    MealLog saved = mealLogRepository.save(meal);

    log.info("Updated meal log {} with total calories: {}", saved.getId(), saved.getTotalCalories());

    return ResponseEntity.ok(toResponse(saved));
  }

  // Helper methods

  private ZoneId resolveZoneId(String timezone) {
    if (timezone == null || timezone.isEmpty()) {
      return ZoneOffset.UTC;
    }

    try {
      return ZoneId.of(timezone);
    } catch (Exception e) {
      log.warn("Invalid timezone '{}', using UTC", timezone);
      return ZoneOffset.UTC;
    }
  }

  private int firstNonNull(Integer primary, Integer secondary) {
    if (primary != null) {
      return primary;
    }
    if (secondary != null) {
      return secondary;
    }
    return 0;
  }

  private double toDoubleOrZero(BigDecimal primary, BigDecimal secondary) {
    if (primary != null) {
      return primary.doubleValue();
    }
    if (secondary != null) {
      return secondary.doubleValue();
    }
    return 0.0;
  }

  private int calculateHealthScore(
      int calories, int calorieTarget,
      double protein, double proteinTarget,
      double carbs, double carbsTarget,
      double fat, double fatTarget
  ) {
    double[] ratios = new double[] {
        ratio(calories, calorieTarget),
        ratio(protein, proteinTarget),
        ratio(carbs, carbsTarget),
        ratio(fat, fatTarget)
    };

    double average = java.util.Arrays.stream(ratios).average().orElse(0.0);
    return (int)Math.round(Math.max(0.0, Math.min(average * 100.0, 100.0)));
  }

  private double ratio(double value, double target) {
    if (target <= 0) {
      return 0.0;
    }
    return Math.min(value / target, 1.0);
  }

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

  // === History Log Endpoint ===

  /**
   * Get user's meal history with pagination and date filtering
   * GET /api/v1/meals/history
   *
   * @param page Page number (0-based), default 0
   * @param size Page size, default 20
   * @param startDate Start date (ISO format: 2025-01-01), optional
   * @param endDate End date (ISO format: 2025-01-15), optional
   * @param sort Sort specification, default "consumedAt,desc"
   */
  @GetMapping("/history")
  public ResponseEntity<Page<MealResponse>> getMealHistory(
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(defaultValue = "consumedAt,desc") String sort
  ) {
    if (currentUser == null) {
      log.warn("Meal history requested without authentication");
      return ResponseEntity.status(401).build();
    }
    
    UUID userId = currentUser.userId();
    log.info("Fetching meal history for user: {}, page: {}, size: {}, startDate: {}, endDate: {}",
             userId, page, size, startDate, endDate);

    // Parse sort parameter
    String[] sortParams = sort.split(",");
    String sortField = sortParams.length > 0 ? sortParams[0] : "consumedAt";
    Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc")
        ? Sort.Direction.ASC
        : Sort.Direction.DESC;

    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

    // Call service
    Page<MealLog> mealPage = mealHistoryService.getMealHistory(userId, startDate, endDate, pageable);

    // Convert to response DTOs
    Page<MealResponse> responsePage = mealPage.map(this::toResponse);

    return ResponseEntity.ok(responsePage);
  }

  // === Weekly Insights Endpoint ===

  /**
   * Get weekly nutrition insights
   * GET /api/v1/meals/insights/weekly
   *
   * @param endDate End date (defaults to today in user's timezone), looks back 7 days
   * @param timezone User's IANA timezone (e.g., "Australia/Sydney"), defaults to UTC
   */
  @GetMapping("/insights/weekly")
  public ResponseEntity<MealInsightsService.WeeklyInsightsResponse> getWeeklyInsights(
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(required = false) String timezone
  ) {
    if (currentUser == null) {
      log.warn("Weekly insights requested without authentication");
      return ResponseEntity.status(401).build();
    }

    UUID userId = currentUser.userId();
    log.info("Fetching weekly insights for user: {}, endDate: {}, timezone: {}", userId, endDate, timezone);

    MealInsightsService.WeeklyInsightsResponse insights = mealInsightsService.getWeeklyInsights(userId, endDate, timezone);

    return ResponseEntity.ok(insights);
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
  public static class NutritionTotals {
    private Number calories;
    private Double protein;
    private Double carbs;
    private Double fat;
  }

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class TodaySummaryResponse {
    private String date;
    private String timezone;
    private NutritionTotals current;
    private NutritionTotals target;
    private List<MealResponse> meals;
    private Integer healthScore;
  }

}
