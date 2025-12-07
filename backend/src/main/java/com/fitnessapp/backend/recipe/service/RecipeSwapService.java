package com.fitnessapp.backend.recipe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeSwapService {

  private static final double MACRO_WEIGHT = 0.7;
  private static final double TIME_WEIGHT = 0.2;
  private static final double DIFFICULTY_WEIGHT = 0.1;
  private static final Map<Allergen, List<String>> ALLERGEN_KEYWORDS = buildAllergenKeywords();
  private static final List<String> MEAT_KEYWORDS = List.of(
      "chicken", "beef", "pork", "lamb", "turkey", "duck", "ham", "bacon", "sausage",
      "fish", "salmon", "tuna", "shrimp", "prawn", "crab", "lobster", "clam", "oyster"
  );
  private static final List<String> DAIRY_KEYWORDS = List.of(
      "milk", "cream", "cheese", "butter", "yogurt", "ghee", "whey"
  );
  private static final List<String> EGG_KEYWORDS = List.of("egg", "eggs");
  private static final List<String> HONEY_KEYWORDS = List.of("honey");

  private final RecipeRepository recipeRepository;
  private final UserProfileRepository userProfileRepository;

  @Transactional(readOnly = true)
  public List<AlternativeRecipe> suggestAlternatives(UUID userId, UUID recipeId, String reason) {
    Recipe original = recipeRepository.findById(recipeId)
        .orElseThrow(() -> new EntityNotFoundException("Recipe not found: " + recipeId));
    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    Nutrition originalNutrition = extractNutrition(original);
    List<Recipe> candidates = recipeRepository.findAllWithIngredients();

    Set<UUID> excluded = Set.of(recipeId);

    List<AlternativeRecipe> scored = new ArrayList<>();
    for (Recipe candidate : candidates) {
      if (excluded.contains(candidate.getId())) {
        continue;
      }
      if (!matchesDietaryPreference(candidate, profile.getDietaryPreference())) {
        continue;
      }
      if (violatesAllergens(candidate, profile.getAllergens())) {
        continue;
      }

      Nutrition candidateNutrition = extractNutrition(candidate);
      double macroScore = macroSimilarity(originalNutrition, candidateNutrition);
      double timeScore = timeSimilarity(original.getTimeMinutes(), candidate.getTimeMinutes());
      double difficultyScore = difficultyScore(original.getDifficulty(), candidate.getDifficulty());
      double recencyBoost = recencyBoost(candidate.getCreatedAt());

      double totalScore = MACRO_WEIGHT * macroScore
          + TIME_WEIGHT * timeScore
          + DIFFICULTY_WEIGHT * difficultyScore
          + recencyBoost;

      if (totalScore <= 0) {
        continue;
      }

      String summary = buildSummary(originalNutrition, candidateNutrition, macroScore, timeScore, reason);

      scored.add(new AlternativeRecipe(
          candidate.getId(),
          candidate.getTitle(),
          candidate.getImageUrl(),
          candidate.getTimeMinutes(),
          candidate.getDifficulty(),
          candidateNutrition,
          totalScore,
          summary
      ));
    }

    return scored.stream()
        .sorted(Comparator.comparingDouble(AlternativeRecipe::score).reversed())
        .limit(3)
        .collect(Collectors.toList());
  }

  private static Map<Allergen, List<String>> buildAllergenKeywords() {
    Map<Allergen, List<String>> map = new EnumMap<>(Allergen.class);
    map.put(Allergen.LACTOSE, List.of("milk", "cheese", "butter", "cream", "yogurt", "lactose"));
    map.put(Allergen.GLUTEN, List.of("wheat", "barley", "rye", "flour", "bread", "pasta", "noodle", "gluten"));
    map.put(Allergen.NUTS, List.of("almond", "cashew", "walnut", "pecan", "peanut", "hazelnut", "pistachio", "nut", "nuts"));
    map.put(Allergen.SEAFOOD, List.of("shrimp", "prawn", "crab", "lobster", "clam", "oyster", "mussel", "fish", "salmon", "tuna", "seafood"));
    return Collections.unmodifiableMap(map);
  }

  private Nutrition extractNutrition(Recipe recipe) {
    JsonNode summary = recipe.getNutritionSummary();
    if (summary == null || summary.isNull()) {
      return Nutrition.empty();
    }
    JsonNode macros = summary.path("macros");
    return new Nutrition(
        extractMacro(macros, "calories"),
        extractMacro(macros, "protein"),
        extractMacro(macros, "carbs"),
        extractMacro(macros, "fat")
    );
  }

  private double extractMacro(JsonNode macros, String field) {
    if (macros == null || macros.isMissingNode() || macros.isNull()) {
      return Double.NaN;
    }
    JsonNode node = macros.path(field);
    if (node.isMissingNode() || node.isNull()) {
      return Double.NaN;
    }
    JsonNode amount = node.path("amount");
    if (!amount.isNumber()) {
      return Double.NaN;
    }
    return amount.asDouble();
  }

  private boolean matchesDietaryPreference(Recipe recipe, DietaryPreference preference) {
    if (preference == null || preference == DietaryPreference.NONE) {
      return true;
    }
    Set<String> ingredientNames = ingredientNameSet(recipe);
    if (ingredientNames.isEmpty()) {
      return true;
    }
    switch (preference) {
      case VEGETARIAN -> {
        return ingredientNames.stream().noneMatch(name -> containsAny(name, MEAT_KEYWORDS) || containsAny(name, List.of("gelatin")));
      }
      case VEGAN -> {
        return ingredientNames.stream().noneMatch(name ->
            containsAny(name, MEAT_KEYWORDS)
                || containsAny(name, DAIRY_KEYWORDS)
                || containsAny(name, EGG_KEYWORDS)
                || containsAny(name, HONEY_KEYWORDS)
        );
      }
      case KETO -> {
        // Allow all foods but prefer those with lower carb macros; handled via macro similarity score.
        return true;
      }
      case MEDITERRANEAN -> {
        return true;
      }
      default -> {
        return true;
      }
    }
  }

  private boolean violatesAllergens(Recipe recipe, Set<Allergen> allergens) {
    if (CollectionUtils.isEmpty(allergens)) {
      return false;
    }
    Set<String> ingredients = ingredientNameSet(recipe);
    if (ingredients.isEmpty()) {
      return false;
    }
    for (Allergen allergen : allergens) {
      List<String> keywords = ALLERGEN_KEYWORDS.getOrDefault(allergen, List.of());
      boolean contains = ingredients.stream().anyMatch(name -> containsAny(name, keywords));
      if (contains) {
        return true;
      }
    }
    return false;
  }

  private Set<String> ingredientNameSet(Recipe recipe) {
    if (CollectionUtils.isEmpty(recipe.getIngredients())) {
      return Set.of();
    }
    Set<String> names = new HashSet<>();
    for (RecipeIngredient ingredient : recipe.getIngredients()) {
      if (ingredient.getIngredient() != null && StringUtils.hasText(ingredient.getIngredient().getName())) {
        names.add(normalize(ingredient.getIngredient().getName()));
      }
    }
    return names;
  }

  private String normalize(String value) {
    return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
  }

  private boolean containsAny(String value, List<String> keywords) {
    if (!StringUtils.hasText(value) || CollectionUtils.isEmpty(keywords)) {
      return false;
    }
    for (String keyword : keywords) {
      if (value.contains(keyword)) {
        return true;
      }
    }
    return false;
  }

  private double macroSimilarity(Nutrition original, Nutrition candidate) {
    double score = 0.0;
    double totalWeight = 0.0;
    totalWeight += accumulateMacroScore(original.calories(), candidate.calories(), 0.4);
    totalWeight += accumulateMacroScore(original.protein(), candidate.protein(), 0.25);
    totalWeight += accumulateMacroScore(original.carbs(), candidate.carbs(), 0.2);
    totalWeight += accumulateMacroScore(original.fat(), candidate.fat(), 0.15);
    score += weightedSimilarity(original.calories(), candidate.calories(), 0.4);
    score += weightedSimilarity(original.protein(), candidate.protein(), 0.25);
    score += weightedSimilarity(original.carbs(), candidate.carbs(), 0.2);
    score += weightedSimilarity(original.fat(), candidate.fat(), 0.15);

    if (totalWeight <= 0) {
      return 0.0;
    }
    return Math.max(0.0, Math.min(1.0, score / totalWeight));
  }

  private double accumulateMacroScore(double a, double b, double weight) {
    if (Double.isNaN(a) || Double.isNaN(b) || a <= 0 || b <= 0) {
      return 0.0;
    }
    return weight;
  }

  private double weightedSimilarity(double a, double b, double weight) {
    if (Double.isNaN(a) || Double.isNaN(b) || a <= 0 || b <= 0) {
      return 0.0;
    }
    double diff = Math.abs(a - b) / Math.max(a, b);
    double similarity = 1.0 - Math.min(diff, 1.0);
    return similarity * weight;
  }

  private double timeSimilarity(Integer original, Integer candidate) {
    if (original == null || original <= 0 || candidate == null || candidate <= 0) {
      return 0.5; // neutral
    }
    double diff = Math.abs(original - candidate) / (double) Math.max(original, candidate);
    return Math.max(0.0, 1.0 - diff);
  }

  private double difficultyScore(String original, String candidate) {
    if (!StringUtils.hasText(original) || !StringUtils.hasText(candidate)) {
      return 0.5;
    }
    return original.equalsIgnoreCase(candidate) ? 1.0 : 0.4;
  }

  private double recencyBoost(OffsetDateTime createdAt) {
    if (createdAt == null) {
      return 0.0;
    }
    Duration age = Duration.between(createdAt, OffsetDateTime.now());
    long days = Math.max(0, age.toDays());
    if (days <= 14) {
      return 0.05;
    }
    if (days <= 30) {
      return 0.02;
    }
    return 0.0;
  }

  private String buildSummary(Nutrition original, Nutrition candidate, double macroScore, double timeScore, String reason) {
    Map<String, String> highlights = new HashMap<>();
    if (isComparable(original.calories(), candidate.calories())) {
      highlights.put("卡路里", deltaDescription(original.calories(), candidate.calories(), "kcal"));
    }
    if (isComparable(original.protein(), candidate.protein())) {
      highlights.put("蛋白质", deltaDescription(original.protein(), candidate.protein(), "g"));
    }
    if (isComparable(original.carbs(), candidate.carbs())) {
      highlights.put("碳水", deltaDescription(original.carbs(), candidate.carbs(), "g"));
    }
    if (isComparable(original.fat(), candidate.fat())) {
      highlights.put("脂肪", deltaDescription(original.fat(), candidate.fat(), "g"));
    }
    StringBuilder builder = new StringBuilder();
    builder.append("营养相似度 ").append(Math.round(macroScore * 100)).append("%，烹饪时长匹配度 ")
        .append(Math.round(timeScore * 100)).append("%。");
    if (!highlights.isEmpty()) {
      builder.append("差异提示：");
      builder.append(highlights.entrySet().stream()
          .map(entry -> entry.getKey() + entry.getValue())
          .collect(Collectors.joining("、")));
      builder.append("。");
    }
    if (StringUtils.hasText(reason)) {
      builder.append("替换原因：").append(reason.trim()).append("。");
    }
    return builder.toString();
  }

  private boolean isComparable(double a, double b) {
    return !Double.isNaN(a) && !Double.isNaN(b) && a > 0 && b > 0;
  }

  private String deltaDescription(double original, double candidate, String unit) {
    double diff = candidate - original;
    double percent = Math.abs(diff) / original * 100.0;
    String symbol = diff >= 0 ? "+" : "-";
    return symbol + Math.round(Math.abs(diff)) + unit + " (" + Math.round(percent) + "%)";
  }

  public record AlternativeRecipe(
      UUID id,
      String title,
      String imageUrl,
      Integer timeMinutes,
      String difficulty,
      Nutrition nutrition,
      double score,
      String summary
  ) {}

  public record Nutrition(double calories, double protein, double carbs, double fat) {
    public static Nutrition empty() {
      return new Nutrition(Double.NaN, Double.NaN, Double.NaN, Double.NaN);
    }
  }
}
