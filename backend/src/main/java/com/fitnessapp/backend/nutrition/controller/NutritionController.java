package com.fitnessapp.backend.nutrition.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.service.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.NutritionEngine;
import com.fitnessapp.backend.nutrition.service.NutritionInsightService;
import com.fitnessapp.backend.nutrition.service.NutritionInsightService.NutritionInsight;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.nutrition.service.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.user.entity.User;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
@Validated
public class NutritionController {

  private final NutritionTrackingService trackingService;
  private final NutritionInsightService insightService;
  private final FoodRecognitionService foodRecognitionService;
  private final NutritionEngine nutritionEngine;

  /** Well-known UUID for default/test user (for backward compatibility) */
  private static final UUID DEFAULT_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  /**
   * Analyze food photo and return recognized foods with nutrition info
   * POST /api/v1/nutrition/analyze
   *
   * @param image The food image to analyze
   * @param provider Optional: preferred AI provider (e.g., "gemini", "claude", "openai")
   */
  @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<FoodRecognitionResponse> analyzeFoodImage(
      @RequestParam("image") MultipartFile image,
      @RequestParam(value = "provider", required = false) String provider
  ) throws IOException {
    log.info("Analyzing food image: {}, size: {} bytes, provider: {}",
        image.getOriginalFilename(), image.getSize(), provider != null ? provider : "auto");

    // Validate image
    if (image.isEmpty()) {
      throw new IllegalArgumentException("Image file is required");
    }

    if (image.getSize() > 10 * 1024 * 1024) { // 10MB limit
      throw new IllegalArgumentException("Image file is too large (max 10MB)");
    }

    // Use unified FoodRecognitionService with multi-provider support
    FoodRecognitionResult recognitionResult = foodRecognitionService.recognizeFoods(image, provider);

    // Calculate total nutrition (already enriched by FoodRecognitionService)
    NutritionInfo totalNutrition = nutritionEngine.calculateTotal(recognitionResult.getItems());

    // Build response
    FoodRecognitionResponse response = FoodRecognitionResponse.builder()
        .items(recognitionResult.getItems())
        .totalNutrition(totalNutrition)
        .suggestedMealType(recognitionResult.getMealType())
        .build();

    log.info("Successfully analyzed food image: {} items recognized, total calories: {}",
        response.getItems().size(), totalNutrition.getCalories());

    return ResponseEntity.ok(response);
  }

  /**
   * Get list of available AI providers for food recognition
   * GET /api/v1/nutrition/providers
   */
  @GetMapping("/providers")
  public ResponseEntity<List<FoodRecognitionService.ProviderInfo>> getAvailableProviders() {
    return ResponseEntity.ok(foodRecognitionService.getAvailableProviders());
  }

  @PostMapping("/meals")
  public ResponseEntity<MealLogResponse> logMeal(
      @AuthenticationPrincipal User currentUser,
      @Valid @RequestBody LogMealRequest request) {

    UUID resolvedUserId = resolveAndValidateUserId(request.userId(), currentUser);

    MealLog entity = MealLog.builder()
        .userId(resolvedUserId)
        .mealPlanId(request.mealPlanId())
        .mealDay(request.mealDay())
        .mealType(request.mealType())
        .recipeId(request.recipeId())
        .recipeName(request.recipeName())
        .calories(request.calories())
        .proteinGrams(request.protein() != null ? java.math.BigDecimal.valueOf(request.protein()) : null)
        .carbsGrams(request.carbs() != null ? java.math.BigDecimal.valueOf(request.carbs()) : null)
        .fatGrams(request.fat() != null ? java.math.BigDecimal.valueOf(request.fat()) : null)
        .consumedAt(request.consumedAt())
        .notes(request.notes())
        .build();
    MealLog saved = trackingService.logMeal(entity);
    OffsetDateTime consumedAt = Optional.ofNullable(saved.getConsumedAt()).orElse(OffsetDateTime.now());
    insightService.invalidateIfChanged(resolvedUserId, consumedAt.toLocalDate());
    return ResponseEntity.ok(toResponse(saved));
  }

  @GetMapping("/summary/daily")
  public ResponseEntity<NutritionSummaryResponse> dailySummary(
      @AuthenticationPrincipal User currentUser,
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

    UUID resolvedUserId = resolveAndValidateUserId(userId, currentUser);
    LocalDate targetDate = date != null ? date : LocalDate.now();
    NutritionSummary summary = trackingService.dailySummary(resolvedUserId, targetDate);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/summary/weekly")
  public ResponseEntity<NutritionSummaryResponse> weeklySummary(
      @AuthenticationPrincipal User currentUser,
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

    UUID resolvedUserId = resolveAndValidateUserId(userId, currentUser);
    LocalDate start = weekStart != null ? weekStart : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
    NutritionSummary summary = trackingService.weeklySummary(resolvedUserId, start);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/insights/weekly")
  public ResponseEntity<NutritionInsightResponse> weeklyInsight(
      @AuthenticationPrincipal User currentUser,
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

    UUID resolvedUserId = resolveAndValidateUserId(userId, currentUser);
    NutritionInsight insight = insightService.generateWeeklyInsight(resolvedUserId, weekStart);
    return ResponseEntity.ok(toInsightResponse(insight));
  }

  /**
   * Resolves and validates the userId for IDOR protection.
   *
   * Logic:
   * 1. If currentUser is authenticated:
   *    - If userIdParam is null/empty: use currentUser's ID (implicit auth)
   *    - If userIdParam is provided: validate it matches currentUser's ID (IDOR protection)
   * 2. If currentUser is null (API key auth without JWT):
   *    - Fall back to default user for backward compatibility
   *    - If userIdParam provided, parse and use it (for testing purposes)
   *
   * @param userIdParam Optional userId from request parameter or body
   * @param currentUser The authenticated user from JWT (may be null for API key only auth)
   * @return Resolved and validated UUID
   * @throws AccessDeniedException if userId doesn't match currentUser (IDOR attempt)
   */
  private UUID resolveAndValidateUserId(String userIdParam, User currentUser) {
    // Case 1: User is authenticated via JWT
    if (currentUser != null) {
      UUID currentUserId = currentUser.getId();

      // If no userId provided, use the authenticated user's ID (implicit auth)
      if (userIdParam == null || userIdParam.trim().isEmpty()) {
        log.debug("Using authenticated user ID: {}", currentUserId);
        return currentUserId;
      }

      // Parse the provided userId
      UUID requestedUserId = parseUserId(userIdParam);

      // IDOR Protection: Ensure the requested userId matches the authenticated user
      // (Admin bypass could be added here if needed: check for ROLE_ADMIN)
      if (!requestedUserId.equals(currentUserId)) {
        log.warn("IDOR attempt detected: user {} tried to access data for user {}",
            currentUserId, requestedUserId);
        throw new AccessDeniedException("You are not authorized to access this user's data");
      }

      return requestedUserId;
    }

    // Case 2: No authenticated user (API key only, for backward compatibility/testing)
    log.debug("No authenticated user, falling back to default user logic");

    if (userIdParam == null || userIdParam.trim().isEmpty()) {
      // Default to the well-known test user
      log.debug("No userId provided, using default user: {}", DEFAULT_USER_ID);
      return DEFAULT_USER_ID;
    }

    // Parse the provided userId for testing purposes
    return parseUserId(userIdParam);
  }

  /**
   * Parse userId from string, handling the special "default-user" case.
   * This allows testing without proper authentication by using a well-known UUID.
   *
   * @param userId String representation of user ID or "default-user"
   * @return UUID for the user
   * @throws IllegalArgumentException if the string is not a valid UUID and not "default-user"
   */
  private UUID parseUserId(String userId) {
    String cleaned = userId == null ? "" : userId.trim().replace("\"", "");
    if ("default-user".equals(cleaned)) {
      return DEFAULT_USER_ID;
    }
    try {
      return UUID.fromString(cleaned);
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Invalid userId format: " + userId + ". Must be a valid UUID or 'default-user'", e);
    }
  }

  private MealLogResponse toResponse(MealLog log) {
    return new MealLogResponse(
        log.getId(),
        log.getUserId(),
        log.getMealPlanId(),
        log.getMealDay(),
        log.getMealType(),
        log.getRecipeId(),
        log.getRecipeName(),
        log.getConsumedAt(),
        log.getCalories(),
        log.getProteinGrams() != null ? log.getProteinGrams().doubleValue() : null,
        log.getCarbsGrams() != null ? log.getCarbsGrams().doubleValue() : null,
        log.getFatGrams() != null ? log.getFatGrams().doubleValue() : null,
        log.getNotes());
  }

  private NutritionSummaryResponse toSummaryResponse(NutritionSummary summary) {
    return new NutritionSummaryResponse(
        summary.rangeStart(),
        summary.rangeEnd(),
        summary.days(),
        toMetric(summary.calories()),
        toMetric(summary.protein()),
        toMetric(summary.carbs()),
        toMetric(summary.fat()),
        summary.alerts());
  }

  private NutritionMetricResponse toMetric(NutritionMetric metric) {
    return new NutritionMetricResponse(metric.actual().doubleValue(), metric.target().doubleValue(), metric.percent());
  }

  /**
   * Request DTO for logging meals.
   * userId is optional - if not provided, will use the authenticated user's ID.
   */
  public record LogMealRequest(
      String userId,  // Optional: defaults to authenticated user's ID
      Long mealPlanId,
      Integer mealDay,
      @Size(max = 32) String mealType,
      UUID recipeId,
      @Size(max = 255) String recipeName,
      Integer calories,
      Double protein,
      Double carbs,
      Double fat,
      OffsetDateTime consumedAt,
      @Size(max = 500) String notes
  ) {}

  public record MealLogResponse(Long id,
                                UUID userId,
                                Long mealPlanId,
                                Integer mealDay,
                                String mealType,
                                UUID recipeId,
                                String recipeName,
                                OffsetDateTime consumedAt,
                                Integer calories,
                                Double protein,
                                Double carbs,
                                Double fat,
                                String notes) {}

  private NutritionInsightResponse toInsightResponse(NutritionInsight insight) {
    return new NutritionInsightResponse(
        toSummaryResponse(insight.summary()),
        insight.logs().stream().map(this::toResponse).toList(),
        insight.aiAdvice());
  }

  public record NutritionSummaryResponse(OffsetDateTime rangeStart,
                                         OffsetDateTime rangeEnd,
                                         int days,
                                         NutritionMetricResponse calories,
                                         NutritionMetricResponse protein,
                                         NutritionMetricResponse carbs,
                                         NutritionMetricResponse fat,
                                         java.util.List<String> alerts) {}

  public record NutritionMetricResponse(double actual, double target, double percent) {}

  public record NutritionInsightResponse(NutritionSummaryResponse summary,
                                         java.util.List<MealLogResponse> logs,
                                         String aiAdvice) {}

  @lombok.Data
  @lombok.Builder
  @lombok.NoArgsConstructor
  @lombok.AllArgsConstructor
  public static class FoodRecognitionResponse {
    private java.util.List<com.fitnessapp.backend.nutrition.dto.RecognizedFood> items;
    private NutritionInfo totalNutrition;
    private String suggestedMealType;
  }
}
