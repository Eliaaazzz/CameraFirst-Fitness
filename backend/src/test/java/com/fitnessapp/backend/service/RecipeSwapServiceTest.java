package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.recipe.entity.Ingredient;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recipe.service.RecipeSwapService;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecipeSwapServiceTest {

  @Mock
  private RecipeRepository recipeRepository;

  @Mock
  private UserProfileRepository userProfileRepository;

  private RecipeSwapService service;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private UUID userId;
  private UUID originalId;

  @BeforeEach
  void setUp() {
    service = new RecipeSwapService(recipeRepository, userProfileRepository);
    userId = UUID.randomUUID();
    originalId = UUID.randomUUID();
  }

  @Test
  void suggestionsRespectAllergensAndSimilarity() {
    Recipe original = recipeWithMacros(originalId, "坚果鸡胸", 500, 45, 30, 18, "EASY", 25, Set.of("chicken breast", "olive oil"));
    Recipe candidateSafe = recipeWithMacros(UUID.randomUUID(), "地中海烤鸡", 520, 42, 32, 17, "EASY", 22, Set.of("chicken breast", "lemon"));
    Recipe candidateWithAllergen = recipeWithMacros(UUID.randomUUID(), "坚果沙拉", 480, 20, 40, 15, "EASY", 15, Set.of("mixed nuts", "spinach"));

    UserProfile profile = UserProfile.builder()
        .userId(userId)
        .user(User.builder().id(userId).build())
        .allergens(Set.of(Allergen.NUTS))
        .build();

    when(recipeRepository.findById(originalId)).thenReturn(Optional.of(original));
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
    when(recipeRepository.findAllWithIngredients()).thenReturn(List.of(original, candidateSafe, candidateWithAllergen));

    List<RecipeSwapService.AlternativeRecipe> results = service.suggestAlternatives(userId, originalId, "不喜欢口感");

    assertThat(results).hasSize(1);
    RecipeSwapService.AlternativeRecipe suggestion = results.get(0);
    assertThat(suggestion.title()).isEqualTo("地中海烤鸡");
    assertThat(suggestion.score()).isGreaterThan(0.5);
    assertThat(suggestion.summary()).contains("营养相似度");
  }

  private Recipe recipeWithMacros(UUID id,
                                  String title,
                                  double calories,
                                  double protein,
                                  double carbs,
                                  double fat,
                                  String difficulty,
                                  int timeMinutes,
                                  Set<String> ingredientNames) {
    ObjectNode macros = objectMapper.createObjectNode();
    macros.set("calories", macroNode(calories));
    macros.set("protein", macroNode(protein));
    macros.set("carbs", macroNode(carbs));
    macros.set("fat", macroNode(fat));
    ObjectNode summary = objectMapper.createObjectNode();
    summary.set("macros", macros);

    Recipe recipe = Recipe.builder()
        .id(id)
        .title(title)
        .difficulty(difficulty)
        .timeMinutes(timeMinutes)
        .createdAt(OffsetDateTime.now().minusDays(5))
        .nutritionSummary(summary)
        .build();

    Set<RecipeIngredient> ingredients = ingredientNames.stream()
        .map(name -> RecipeIngredient.builder()
            .recipe(recipe)
            .ingredient(Ingredient.builder().name(name).build())
            .build())
        .collect(java.util.stream.Collectors.toSet());
    recipe.setIngredients(ingredients);
    return recipe;
  }

  private ObjectNode macroNode(double amount) {
    ObjectNode node = objectMapper.createObjectNode();
    node.put("amount", amount);
    return node;
  }
}
