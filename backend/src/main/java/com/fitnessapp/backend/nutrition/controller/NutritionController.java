package com.fitnessapp.backend.nutrition.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.common.service.R2StorageService;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.service.ai.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.core.NutritionEngine;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService.NutritionInsight;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.security.AuthenticatedUser;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
@Validated
public class NutritionController {

  private static final String PATH_PREFIX = "meals";

  private final NutritionTrackingService trackingService;
  private final NutritionInsightService insightService;
  private final FoodRecognitionService foodRecognitionService;
  private final NutritionEngine nutritionEngine;
  private final R2StorageService r2StorageService;

  @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<FoodRecognitionResponse> analyzeFoodImage(
      @RequestParam("image") MultipartFile image,
      @RequestParam(value = "provider", required = false) String provider
  ) throws IOException {
    log.info("Analyzing food image: {}, size: {} bytes", image.getOriginalFilename(), image.getSize());

    if (image.isEmpty()) {
      throw new IllegalArgumentException("Image file is required");
    }

    if (image.getSize() > 10 * 1024 * 1024) {
      throw new IllegalArgumentException("Image file is too large (max 10MB)");
    }

    // Upload to S3
    String s3Url = null;
    try {
      s3Url = r2StorageService.uploadFile(image, PATH_PREFIX);
    } catch (Exception e) {
      log.warn("S3 upload failed; continuing without image URL", e);
    }

    FoodRecognitionResult recognitionResult = foodRecognitionService.recognizeFoods(image, provider);
    NutritionInfo totalNutrition = nutritionEngine.calculateTotal(recognitionResult.getItems());

    FoodRecognitionResponse response = FoodRecognitionResponse.builder()
        .items(recognitionResult.getItems())
        .totalNutrition(totalNutrition)
        .suggestedMealType(recognitionResult.getMealType())
        .imageUrl(s3Url)
        .build();

    return ResponseEntity.ok(response);
  }

  @GetMapping("/providers")
  public ResponseEntity<List<FoodRecognitionService.ProviderInfo>> getAvailableProviders() {
    return ResponseEntity.ok(foodRecognitionService.getAvailableProviders());
  }

  @GetMapping("/summary/daily")
  public ResponseEntity<NutritionSummaryResponse> dailySummary(
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
      @AuthenticationPrincipal AuthenticatedUser currentUser) {
    LocalDate targetDate = date != null ? date : LocalDate.now();
    NutritionSummary summary = trackingService.dailySummary(resolveUserId(userId, currentUser), targetDate);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/summary/weekly")
  public ResponseEntity<NutritionSummaryResponse> weeklySummary(
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
      @AuthenticationPrincipal AuthenticatedUser currentUser) {
    LocalDate start = weekStart != null ? weekStart : LocalDate.now().with(java.time.DayOfWeek.MONDAY);
    NutritionSummary summary = trackingService.weeklySummary(resolveUserId(userId, currentUser), start);
    return ResponseEntity.ok(toSummaryResponse(summary));
  }

  @GetMapping("/insights/weekly")
  public ResponseEntity<NutritionInsightResponse> weeklyInsight(
      @RequestParam(required = false) String userId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
      @AuthenticationPrincipal AuthenticatedUser currentUser) {
    NutritionInsight insight = insightService.generateWeeklyInsight(resolveUserId(userId, currentUser), weekStart);
    return ResponseEntity.ok(toInsightResponse(insight));
  }

  private UUID resolveUserId(String userId, AuthenticatedUser currentUser) {
    if (currentUser == null || currentUser.userId() == null) {
      throw new IllegalStateException("Authentication required");
    }
    return currentUser.userId();
  }

  private NutritionSummaryResponse toSummaryResponse(NutritionSummary summary) {
    return new NutritionSummaryResponse(
        summary.rangeStart(), summary.rangeEnd(), summary.days(),
        toMetric(summary.calories()), toMetric(summary.protein()),
        toMetric(summary.carbs()), toMetric(summary.fat()), summary.alerts());
  }

  private NutritionMetricResponse toMetric(NutritionMetric metric) {
    return new NutritionMetricResponse(metric.actual().doubleValue(), metric.target().doubleValue(), metric.percent());
  }

  private NutritionInsightResponse toInsightResponse(NutritionInsight insight) {
    List<MealLogResponse> logResponses = insight.logs().stream()
        .map(log -> new MealLogResponse(
            log.getId(), log.getUserId().toString(), log.getMealPlanId(), log.getMealDay(),
            log.getMealType(), log.getRecipeId() != null ? log.getRecipeId().toString() : null,
            log.getRecipeName(), log.getConsumedAt(),
            log.getTotalCalories() != null ? log.getTotalCalories() : log.getCalories(),
            log.getTotalProtein() != null ? log.getTotalProtein().doubleValue() :
                (log.getProteinGrams() != null ? log.getProteinGrams().doubleValue() : null),
            log.getTotalCarbs() != null ? log.getTotalCarbs().doubleValue() :
                (log.getCarbsGrams() != null ? log.getCarbsGrams().doubleValue() : null),
            log.getTotalFat() != null ? log.getTotalFat().doubleValue() :
                (log.getFatGrams() != null ? log.getFatGrams().doubleValue() : null),
            log.getNotes(), log.getImageUrl()))
        .toList();
    return new NutritionInsightResponse(toSummaryResponse(insight.summary()), logResponses, insight.aiAdvice());
  }

  public record NutritionSummaryResponse(OffsetDateTime rangeStart, OffsetDateTime rangeEnd, int days,
      NutritionMetricResponse calories, NutritionMetricResponse protein,
      NutritionMetricResponse carbs, NutritionMetricResponse fat, List<String> alerts) {}

  public record NutritionMetricResponse(double actual, double target, double percent) {}

  public record NutritionInsightResponse(NutritionSummaryResponse summary, List<MealLogResponse> logs, String aiAdvice) {}

  public record MealLogResponse(Long id, String userId, Long mealPlanId, Integer mealDay, String mealType,
      String recipeId, String recipeName, OffsetDateTime consumedAt, Integer calories,
      Double protein, Double carbs, Double fat, String notes, String imageUrl) {}

  @lombok.Data
  @lombok.Builder
  @lombok.NoArgsConstructor
  @lombok.AllArgsConstructor
  public static class FoodRecognitionResponse {
    private List<com.fitnessapp.backend.nutrition.dto.RecognizedFood> items;
    private NutritionInfo totalNutrition;
    private String suggestedMealType;
    private String imageUrl;
  }
}
