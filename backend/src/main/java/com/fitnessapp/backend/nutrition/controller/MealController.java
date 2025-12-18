package com.fitnessapp.backend.nutrition.controller;


import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.CreateMealRequest;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.MealHistoryService;
import com.fitnessapp.backend.nutrition.service.MealInsightsService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.security.CurrentUser;
import com.fitnessapp.backend.user.repository.UserProfileRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
  private final MealHistoryService mealHistoryService;
  private final MealInsightsService mealInsightsService;

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
    
    // Extract userId from JWT token (always from authenticated user)
    final UUID userId = currentUser.userId();
    
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

  // === New: History Log Endpoint ===
  
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
  
  // === New: Weekly Insights Endpoint ===
  
  /**
   * Get weekly nutrition insights
   * GET /api/v1/meals/insights/weekly
   * 
   * @param endDate End date (defaults to today), looks back 7 days
   */
  @GetMapping("/insights/weekly")
  public ResponseEntity<WeeklyInsightsResponse> getWeeklyInsights(
      @AuthenticationPrincipal com.fitnessapp.backend.security.AuthenticatedUser currentUser,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
  ) {
    UUID userId = currentUser.userId();
    log.info("Fetching weekly insights for user: {}, endDate: {}", userId, endDate);
    
    WeeklyInsightsResponse insights = mealInsightsService.getWeeklyInsights(userId, endDate);
    
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
