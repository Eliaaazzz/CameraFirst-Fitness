package com.fitnessapp.backend.api.nutrition;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.controller.NutritionController;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.service.ai.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.core.NutritionInsightService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionMetric;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.security.AuthenticatedUser;

@ExtendWith(MockitoExtension.class)
class NutritionControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;
  private UUID userId;
  private Authentication authentication;

  @Mock
  private NutritionTrackingService trackingService;

  @Mock
  private NutritionInsightService insightService;

  @Mock
  private FoodRecognitionService foodRecognitionService;

  @Mock
  private com.fitnessapp.backend.common.service.R2StorageService r2StorageService;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();

    userId = UUID.randomUUID();
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(1L, "test-key", userId);
    authentication = new UsernamePasswordAuthenticationToken(authenticatedUser, null, Collections.emptyList());
    SecurityContextHolder.getContext().setAuthentication(authentication);

    NutritionController controller = new NutritionController(
        trackingService,
        insightService,
        foodRecognitionService,
        r2StorageService,
        objectMapper
    );

    mockMvc = MockMvcBuilders.standaloneSetup(controller)
        .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
        .build();
  }

  @Test
  void dailySummaryReturnsMetrics() throws Exception {
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
            .with(authentication(authentication)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.calories.actual").value(1800.0))
        .andExpect(jsonPath("$.alerts[0]").exists());
  }

  @Test
  void weeklyInsightReturnsAdvice() throws Exception {
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
            .with(authentication(authentication)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.days").value(7))
        .andExpect(jsonPath("$.aiAdvice").value("请继续保持蛋白质摄入，适当增加复合碳水。"));
  }

  @Test
  void analyzeReturnsImageUrl() throws Exception {
    MockMultipartFile file = new MockMultipartFile(
        "image",
        "meal.jpg",
        "image/jpeg",
        "fake-image".getBytes());

    NutritionInfo nutritionInfo = NutritionInfo.builder()
        .calories(new BigDecimal("320"))
        .protein(new BigDecimal("45"))
        .fat(new BigDecimal("8"))
        .carbs(new BigDecimal("5"))
        .build();

    RecognizedFood food = RecognizedFood.builder()
        .foodKey("grilled_chicken")
        .displayName("Grilled Chicken")
        .estimatedGrams(150)
        .confidence(0.9)
        .nutrition(nutritionInfo)
        .build();

    FoodRecognitionResult result = FoodRecognitionResult.builder()
        .items(List.of(food))
        .build();

    when(r2StorageService.uploadFile(any(), any())).thenReturn("https://media.aurafitness.com/meals/test.jpg");
    when(foodRecognitionService.recognizeFoods(any(), any(), any())).thenReturn(result);
    when(foodRecognitionService.calculateTotalNutrition(any())).thenReturn(nutritionInfo);

    mockMvc.perform(multipart("/api/v1/nutrition/analyze").file(file))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.imageUrl").value("https://media.aurafitness.com/meals/test.jpg"))
        .andExpect(jsonPath("$.items[0].display_name").value("Grilled Chicken"));
  }

  @Test
  void analyzeParsesMetadataAndReturnsSceneType() throws Exception {
    MockMultipartFile file = new MockMultipartFile(
        "image",
        "meal.jpg",
        "image/jpeg",
        "fake-image".getBytes());

    String metadataJson = "{\"img_w_cm\":35.5}";

    NutritionInfo nutritionInfo = NutritionInfo.builder()
        .calories(new BigDecimal("320"))
        .protein(new BigDecimal("45"))
        .fat(new BigDecimal("8"))
        .carbs(new BigDecimal("5"))
        .build();

    RecognizedFood food = RecognizedFood.builder()
        .foodKey("grilled_chicken")
        .displayName("Grilled Chicken")
        .estimatedGrams(150)
        .confidence(0.9)
        .nutrition(nutritionInfo)
        .build();

    FoodRecognitionResult result = FoodRecognitionResult.builder()
        .sceneType("countable")
        .items(List.of(food))
        .build();

    when(r2StorageService.uploadFile(any(), any())).thenReturn("https://media.aurafitness.com/meals/test.jpg");
    when(foodRecognitionService.recognizeFoods(any(), any(), any())).thenReturn(result);
    when(foodRecognitionService.calculateTotalNutrition(any())).thenReturn(nutritionInfo);

    ArgumentCaptor<FoodRecognitionRequestMetadata> metadataCaptor =
        ArgumentCaptor.forClass(FoodRecognitionRequestMetadata.class);

    mockMvc.perform(multipart("/api/v1/nutrition/analyze")
            .file(file)
            .param("metadata", metadataJson))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.scene_type").value("countable"));

    verify(foodRecognitionService).recognizeFoods(any(), any(), metadataCaptor.capture());
    org.assertj.core.api.Assertions.assertThat(metadataCaptor.getValue()).isNotNull();
    org.assertj.core.api.Assertions.assertThat(metadataCaptor.getValue().resolveImageWidthCm())
        .isCloseTo(35.5, org.assertj.core.data.Offset.offset(0.0001));
  }

}
