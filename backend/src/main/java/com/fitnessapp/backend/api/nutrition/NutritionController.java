package com.fitnessapp.backend.api.nutrition;

import com.fitnessapp.backend.domain.MealLog;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResponse;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.service.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.NutritionEngine;
import com.fitnessapp.backend.service.NutritionInsightService;
import com.fitnessapp.backend.service.NutritionInsightService.NutritionInsight;
import com.fitnessapp.backend.service.NutritionTrackingService;
import com.fitnessapp.backend.service.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.service.NutritionTrackingService.NutritionSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

  /**
   * Analyze food photo and return recognized foods with nutrition info
   * POST /api/v1/nutrition/analyze
   * 
   * @param image The food image to analyze
   * @param provider Optional: preferred AI provider (e.g., "claude-vision", "openai-vision")
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
  public ResponseEntity<MealLogResponse> logMeal(@Valid @RequestBody LogMealRequest request) {
    MealLog entity = MealLog.builder()
        .userId(request.userId())
        .mealPlanId(request.mealPlanId())
        .mealDay(request.mealDay())
        .mealType(request.mealType())
        .recipeId(request.recipeId())
        .recipeName(request.recipeName())
        .calories(request.calories())
        .proteinGrams(request.protein())
        .carbsGrams(request.carbs())
        .fatGrams(request.fat())
        .consumedAt(request.consumedAt())
        .notes(request.notes())
        .build();
    MealLog saved = trackingService.logMeal(entity);
    OffsetDateTime consumedAt = Optional.ofNullable(saved.getConsumedAt()).orElse(OffsetDateTime.now());
    insightService.invalidateIfChanged(request.userId(), consumedAt.toLocalDate());
    return ResponseEntity.ok(toResponse(saved));
  }

  @GetMapping("/summary/daily")
  public ResponseEntity<NutritionSummaryResponse> dailySummary(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    NutritionSummary summary = trackingService.dailySummary(userId, targetDate);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/summary/weekly")
  public ResponseEntity<NutritionSummaryResponse> weeklySummary(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
    LocalDate start = weekStart != null ? weekStart : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
    NutritionSummary summary = trackingService.weeklySummary(userId, start);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/insights/weekly")
  public ResponseEntity<NutritionInsightResponse> weeklyInsight(
      @RequestParam @NotNull UUID userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
    NutritionInsight insight = insightService.generateWeeklyInsight(userId, weekStart);
    return ResponseEntity.ok(toInsightResponse(insight));
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
        log.getProteinGrams(),
        log.getCarbsGrams(),
        log.getFatGrams(),
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
    return new NutritionMetricResponse(metric.actual(), metric.target(), metric.percent());
  }

  public record LogMealRequest(
      @NotNull UUID userId,
      Long mealPlanId,
      Integer mealDay,
      @NotNull @Size(max = 32) String mealType,
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
}
