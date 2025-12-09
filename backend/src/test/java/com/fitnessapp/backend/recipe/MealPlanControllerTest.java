package com.fitnessapp.backend.recipe;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.controller.MealPlanController;
import com.fitnessapp.backend.recipe.controller.MealPlanController.GenerateMealPlanRequest;
import com.fitnessapp.backend.recipe.controller.MealPlanController.SwapRecipeRequest;
import com.fitnessapp.backend.recipe.entity.MealPlan;
import com.fitnessapp.backend.recipe.service.MealPlanHistoryService;
import com.fitnessapp.backend.recipe.service.RecipeSwapService;
import com.fitnessapp.backend.recipe.service.RecipeSwapService.AlternativeRecipe;
import com.fitnessapp.backend.recipe.service.RecipeSwapService.Nutrition;
import com.fitnessapp.backend.recipe.service.SmartRecipeService;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealEntry;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanDay;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.NutritionTarget;

@ExtendWith(MockitoExtension.class)
class MealPlanControllerTest {

  private MockMvc mockMvc;
  private ObjectMapper objectMapper;

  @Mock
  private SmartRecipeService smartRecipeService;

  @Mock
  private MealPlanHistoryService mealPlanHistoryService;

  @Mock
  private RecipeSwapService recipeSwapService;

  @BeforeEach
  void setUp() {
    objectMapper = new ObjectMapper();
    objectMapper.findAndRegisterModules();
    MealPlanController controller = new MealPlanController(smartRecipeService, mealPlanHistoryService, objectMapper, recipeSwapService);
    mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
  }

  private MealPlanResponse samplePlan() {
    NutritionTarget target = new NutritionTarget(2400, 180, 260, 70);
    MealEntry breakfast = new MealEntry("breakfast", UUID.randomUUID().toString(), "燕麦蛋白碗", 450, 30d, 55d, 12d, null);
    return new MealPlanResponse(target, List.of(new MealPlanDay(1, List.of(breakfast))));
  }

  @Test
  void generateReturnsPlan() throws Exception {
    UUID userId = UUID.randomUUID();
    MealPlanResponse plan = samplePlan();
    when(smartRecipeService.generateMealPlan(userId)).thenReturn(plan);

    GenerateMealPlanRequest request = new GenerateMealPlanRequest(userId);
    mockMvc.perform(post("/api/v1/meal-plan/generate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.target.calories").value(2400));

    verify(smartRecipeService).generateMealPlan(userId);
  }

  @Test
  void currentReturnsPlanIfCached() throws Exception {
    UUID userId = UUID.randomUUID();
    MealPlanResponse plan = samplePlan();
    when(smartRecipeService.getCachedMealPlan(userId)).thenReturn(Optional.of(plan));

    mockMvc.perform(get("/api/v1/meal-plan/current").param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.days[0].dayNumber").value(1));
  }

  @Test
  void currentReturns404WhenMissing() throws Exception {
    UUID userId = UUID.randomUUID();
    when(smartRecipeService.getCachedMealPlan(userId)).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/v1/meal-plan/current").param("userId", userId.toString()))
        .andExpect(status().isNotFound());
  }

  @Test
  void historyReturnsList() throws Exception {
    UUID userId = UUID.randomUUID();
    MealPlanResponse plan = samplePlan();
    MealPlan stored = MealPlan.builder()
        .id(1L)
        .userId(userId)
        .generatedAt(java.time.OffsetDateTime.now())
        .source("AI")
        .planPayload(objectMapper.writeValueAsString(plan))
        .build();
    when(mealPlanHistoryService.recentPlans(userId, 5)).thenReturn(List.of(stored));

    mockMvc.perform(get("/api/v1/meal-plan/history").param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].plan.target.calories").value(2400));

    verify(mealPlanHistoryService).recentPlans(userId, 5);
  }

  @Test
  void evictClearsCache() throws Exception {
    UUID userId = UUID.randomUUID();
    GenerateMealPlanRequest request = new GenerateMealPlanRequest(userId);

    mockMvc.perform(post("/api/v1/meal-plan/evict")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNoContent());

    verify(smartRecipeService).evictCache(userId);
  }

  @Test
  void swapRecipeReturnsSuggestions() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID recipeId = UUID.randomUUID();
    AlternativeRecipe alternative = new AlternativeRecipe(
        UUID.randomUUID(),
        "地中海烤鸡",
        "https://image.test/chicken.jpg",
        25,
        "EASY",
        new Nutrition(520, 42, 36, 18),
        0.87,
        "营养相似度 85%，烹饪时长匹配度 90%。"
    );
    when(recipeSwapService.suggestAlternatives(userId, recipeId, "不喜欢味道"))
        .thenReturn(List.of(alternative));

    SwapRecipeRequest request = new SwapRecipeRequest(userId, recipeId, "不喜欢味道");

    mockMvc.perform(post("/api/v1/meal-plan/swap-recipe")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.suggestions[0].title").value("地中海烤鸡"))
        .andExpect(jsonPath("$.suggestions[0].calories").value(520.0));
  }
}
