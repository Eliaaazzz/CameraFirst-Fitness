package com.fitnessapp.backend.recipe;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.MealPlan;
import com.fitnessapp.backend.recipe.controller.MealPlanController.GenerateMealPlanRequest;
import com.fitnessapp.backend.recipe.controller.MealPlanController.SwapRecipeRequest;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanDay;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealEntry;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.NutritionTarget;
import com.fitnessapp.backend.recipe.service.RecipeSwapService;
import com.fitnessapp.backend.recipe.service.RecipeSwapService.AlternativeRecipe;
import com.fitnessapp.backend.recipe.service.RecipeSwapService.Nutrition;
import com.fitnessapp.backend.service.ShoppingListService;
import com.fitnessapp.backend.service.ShoppingListService.ShoppingListDTO;
import com.fitnessapp.backend.service.ShoppingListService.ShoppingListDTO.Category;
import com.fitnessapp.backend.service.ShoppingListService.ShoppingListDTO.Item;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MealPlanController.class)
@AutoConfigureMockMvc(addFilters = false)
class MealPlanControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @MockBean
  private SmartRecipeService smartRecipeService;

  @MockBean
  private MealPlanHistoryService mealPlanHistoryService;

  @MockBean
  private RecipeSwapService recipeSwapService;

  @MockBean
  private ShoppingListService shoppingListService;

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

    SwapRecipeRequest request = new SwapRecipeRequest(userId, recipeId, "lunch", "不喜欢味道");

    mockMvc.perform(post("/api/v1/meal-plan/swap-recipe")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.suggestions[0].title").value("地中海烤鸡"))
        .andExpect(jsonPath("$.suggestions[0].calories").value(520.0));
  }

  @Test
  void shoppingListReturnsJson() throws Exception {
    UUID userId = UUID.randomUUID();
    LocalDate start = LocalDate.of(2025, 11, 4);
    ShoppingListDTO list = new ShoppingListDTO(
        start,
        start.plusDays(6),
        List.of(new Category("蔬菜水果", List.of(new Item("西兰花", new BigDecimal("2.0"), "棵", false, List.of("低碳晚餐"))))),
        null
    );
    when(shoppingListService.buildShoppingList(userId, null)).thenReturn(list);

    mockMvc.perform(get("/api/v1/meal-plan/shopping-list")
            .param("userId", userId.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.categories[0].items[0].ingredientName").value("西兰花"))
        .andExpect(jsonPath("$.categories[0].items[0].quantity").value("2 棵"));

    verify(shoppingListService).buildShoppingList(userId, null);
  }

  @Test
  void shoppingListPdfReturnsBinary() throws Exception {
    UUID userId = UUID.randomUUID();
    LocalDate start = LocalDate.of(2025, 11, 4);
    ShoppingListDTO list = new ShoppingListDTO(
        start,
        start.plusDays(6),
        List.of(),
        null
    );
    when(shoppingListService.buildShoppingList(userId, start)).thenReturn(list);
    when(shoppingListService.renderPdf(list)).thenReturn(new byte[]{1, 2, 3});

    mockMvc.perform(get("/api/v1/meal-plan/shopping-list")
            .param("userId", userId.toString())
            .param("weekStart", start.toString())
            .param("format", "pdf"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, Matchers.containsString("shopping-list-" + start)));

    verify(shoppingListService).buildShoppingList(userId, start);
    verify(shoppingListService).renderPdf(list);
  }
}
