package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.Ingredient;
import com.fitnessapp.backend.recipe.entity.MealPlan;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.recipe.entity.RecipeIngredientId;
import com.fitnessapp.backend.recipe.service.MealPlanHistoryService;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealEntry;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanDay;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.MealPlanResponse;
import com.fitnessapp.backend.recipe.service.SmartRecipeService.NutritionTarget;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShoppingListServiceTest {

  @Mock
  private MealPlanHistoryService mealPlanHistoryService;

  @Mock
  private RecipeRepository recipeRepository;

  @Mock
  private com.fitnessapp.backend.repository.ShoppingListRepository shoppingListRepository;

  @Mock
  private com.fitnessapp.backend.repository.ShoppingListItemRepository shoppingListItemRepository;

  private ShoppingListService service;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private UUID userId;
  private UUID recipeId;

  @BeforeEach
  void setUp() {
    service = new ShoppingListService(mealPlanHistoryService, recipeRepository,
        shoppingListRepository, shoppingListItemRepository, objectMapper);
    userId = UUID.randomUUID();
    recipeId = UUID.randomUUID();
  }

  @Test
  void aggregatesIngredientsByCategory() throws Exception {
    MealPlanResponse plan = new MealPlanResponse(
        new NutritionTarget(2000, 160, 220, 70),
        List.of(new MealPlanDay(1, List.of(new MealEntry("lunch", recipeId.toString(), "烤鸡胸", 520, 40d, 35d, 18d, null))))
    );
    String payload = objectMapper.writeValueAsString(plan);
    MealPlan mealPlan = MealPlan.builder()
        .id(1L)
        .userId(userId)
        .generatedAt(OffsetDateTime.now())
        .planPayload(payload)
        .build();

    when(mealPlanHistoryService.planForWeek(any(), any())).thenReturn(Optional.of(mealPlan));

    Recipe recipe = Recipe.builder()
        .id(recipeId)
        .title("烤鸡胸")
        .build();
    RecipeIngredient chicken = RecipeIngredient.builder()
        .id(new RecipeIngredientId(recipeId, UUID.randomUUID()))
        .recipe(recipe)
        .ingredient(Ingredient.builder().name("chicken breast").build())
        .quantity(BigDecimal.valueOf(0.5))
        .unit("kg")
        .build();
    RecipeIngredient broccoli = RecipeIngredient.builder()
        .id(new RecipeIngredientId(recipeId, UUID.randomUUID()))
        .recipe(recipe)
        .ingredient(Ingredient.builder().name("broccoli").build())
        .quantity(BigDecimal.valueOf(2))
        .unit("head")
        .build();
    recipe.setIngredients(Set.of(chicken, broccoli));

    when(recipeRepository.findByIdIn(Set.of(recipeId))).thenReturn(List.of(recipe));

    ShoppingListService.ShoppingListDTO shoppingList = service.buildShoppingList(userId, LocalDate.of(2025, 11, 4));

    assertThat(shoppingList.categories()).hasSizeGreaterThanOrEqualTo(2);
    Map<String, List<ShoppingListService.ShoppingListDTO.Item>> byCategory = shoppingList.categories().stream()
        .collect(java.util.stream.Collectors.toMap(ShoppingListService.ShoppingListDTO.Category::name, ShoppingListService.ShoppingListDTO.Category::items));
    assertThat(byCategory.get("蛋白肉类")).extracting(ShoppingListService.ShoppingListDTO.Item::ingredientName)
        .contains("chicken breast");
    assertThat(byCategory.get("蔬菜水果")).extracting(ShoppingListService.ShoppingListDTO.Item::ingredientName)
        .contains("broccoli");
  }

  @Test
  void renderPdfProducesBytes() {
    ShoppingListService.ShoppingListDTO list = new ShoppingListService.ShoppingListDTO(
        LocalDate.of(2025, 11, 4),
        LocalDate.of(2025, 11, 10),
        List.of(),
        null
    );

    byte[] pdf = service.renderPdf(list);
    assertThat(pdf).isNotEmpty();
  }
}
