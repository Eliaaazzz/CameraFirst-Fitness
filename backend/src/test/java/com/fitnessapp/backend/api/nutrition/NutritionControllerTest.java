package com.fitnessapp.backend.api.nutrition;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.controller.NutritionController;
import com.fitnessapp.backend.nutrition.controller.NutritionController.LogMealRequest;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.service.ai.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.core.NutritionEngine;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class NutritionControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @Mock
  private NutritionTrackingService trackingService;

  @Mock
  private NutritionInsightService insightService;

  @Mock
  private FoodRecognitionService foodRecognitionService;

  @Mock
  private NutritionEngine nutritionEngine;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    NutritionController controller = new NutritionController(trackingService, insightService, foodRecognitionService, nutritionEngine);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  @Test
  void logMealPersists() throws Exception {
    UUID userId = UUID.randomUUID();
    MealLog saved = MealLog.builder()
        .id(1L)
        .userId(userId)
        .mealType("breakfast")
        .consumedAt(OffsetDateTime.now())
        .calories(400)
        .build();
    when(trackingService.logMeal(any(MealLog.class))).thenReturn(saved);

    LogMealRequest request = new LogMealRequest(userId.toString(), null, 1, "breakfast", null, "Oats", 400, 25.0, 45.0, 12.0, null, null);

    mockMvc.perform(post("/api/v1/nutrition/meals")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories").value(400));
  }

  @Test
  void dailySummaryReturnsMetrics() throws Exception {
    UUID userId = UUID.randomUUID();
    NutritionSummary summary = new NutritionSummary(
        OffsetDateTime.now().minusDays(1),
        OffsetDateTime.now(),
        1,
        new NutritionMetric(1800, 2200),
        new NutritionMetric(120, 160),
        new NutritionMetric(150, 220),
        new NutritionMetric(50, 70),
        java.util.List.of("⚠️ 今日卡路里摄入不足 200 kcal (仅82%)，可能影响训练表现"));
    when(trackingService.dailySummary(eq(userId), any(LocalDate.class))).thenReturn(summary);

    mockMvc.perform(get("/api/v1/nutrition/summary/daily")
            .param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories.actual").value(1800.0))
        .andExpect(jsonPath("$.alerts[0]").exists());
  }

  @Test
  void weeklyInsightReturnsAdvice() throws Exception {
    UUID userId = UUID.randomUUID();
    NutritionSummary summary = new NutritionSummary(
        OffsetDateTime.now().minusWeeks(1),
        OffsetDateTime.now(),
        7,
        new NutritionMetric(14000, 15400),
        new NutritionMetric(820, 910),
        new NutritionMetric(1020, 1240),
        new NutritionMetric(420, 490),
        java.util.List.of("⚠️ 本周碳水摄入过低 (82%)，可能导致训练能量不足"));
    MealLog log = MealLog.builder()
        .id(2L)
        .userId(userId)
        .mealType("lunch")
        .recipeName("鸡胸肉沙拉")
        .consumedAt(OffsetDateTime.now().minusDays(1))
        .calories(520)
        .proteinGrams(new BigDecimal("42.0"))
        .carbsGrams(new BigDecimal("35.0"))
        .fatGrams(new BigDecimal("16.0"))
        .build();
    NutritionInsightService.NutritionInsight insight =
        new NutritionInsightService.NutritionInsight(summary, java.util.List.of(log), "请继续保持蛋白质摄入，适当增加复合碳水。");
    when(insightService.generateWeeklyInsight(eq(userId), org.mockito.ArgumentMatchers.nullable(LocalDate.class))).thenReturn(insight);

    mockMvc.perform(get("/api/v1/nutrition/insights/weekly")
            .param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.days").value(7))
        .andExpect(jsonPath("$.aiAdvice").value("请继续保持蛋白质摄入，适当增加复合碳水。"))
        .andExpect(jsonPath("$.logs[0].recipeName").value("鸡胸肉沙拉"));
  }

  @Test
  void dailySummaryAcceptsDefaultUser() throws Exception {
    UUID defaultUuid = UUID.fromString("00000000-0000-0000-0000-000000000001");
    NutritionSummary summary = new NutritionSummary(
        OffsetDateTime.now().minusDays(1),
        OffsetDateTime.now(),
        1,
        new NutritionMetric(1500, 2200),
        new NutritionMetric(100, 160),
        new NutritionMetric(140, 220),
        new NutritionMetric(45, 70),
        java.util.List.of());
    when(trackingService.dailySummary(eq(defaultUuid), any(LocalDate.class))).thenReturn(summary);

    mockMvc.perform(get("/api/v1/nutrition/summary/daily")
            .param("userId", "default-user"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories.actual").value(1500.0));
  }

  @Test
  void logMealAcceptsDefaultUser() throws Exception {
    UUID defaultUuid = UUID.fromString("00000000-0000-0000-0000-000000000001");
    MealLog saved = MealLog.builder()
        .id(10L)
        .userId(defaultUuid)
        .mealType("snack")
        .consumedAt(OffsetDateTime.now())
        .calories(200)
        .build();
    when(trackingService.logMeal(any(MealLog.class))).thenReturn(saved);

    LogMealRequest request = new LogMealRequest("default-user", null, 1, "snack", null, "Apple", 200, 5.0, 25.0, 2.0, null, null);

    mockMvc.perform(post("/api/v1/nutrition/meals")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories").value(200));
  }
}
