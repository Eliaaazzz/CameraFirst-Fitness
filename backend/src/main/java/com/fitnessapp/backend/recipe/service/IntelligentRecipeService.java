package com.fitnessapp.backend.recipe.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.recipe.entity.Ingredient;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.recipe.entity.RecipeIngredientId;
import com.fitnessapp.backend.recipe.repository.IngredientRepository;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Intelligent Recipe Generation Service using GPT-4
 *
 * Generates personalized recipes based on:
 * - User fitness goals
 * - Dietary preferences and allergens
 * - Nutritional targets
 * - Available equipment
 */
@Service
@Slf4j
public class IntelligentRecipeService {

  private static final String CACHE_PREFIX = "ai-recipe:";

  private final UserProfileRepository userProfileRepository;
  private final RecipeRepository recipeRepository;
  private final IngredientRepository ingredientRepository;
  private final ObjectMapper objectMapper;
  private final StringRedisTemplate redisTemplate;
  private final MeterRegistry meterRegistry;

  public IntelligentRecipeService(
      UserProfileRepository userProfileRepository,
      RecipeRepository recipeRepository,
      IngredientRepository ingredientRepository,
      ObjectMapper objectMapper,
      StringRedisTemplate redisTemplate,
      MeterRegistry meterRegistry) {
    this.userProfileRepository = userProfileRepository;
    this.recipeRepository = recipeRepository;
    this.ingredientRepository = ingredientRepository;
    this.objectMapper = objectMapper;
    this.redisTemplate = redisTemplate;
    this.meterRegistry = meterRegistry;
  }

  @Value("${app.recipe-generation.cache-ttl-hours:24}")
  private long cacheTtlHours;

  /**
   * Generate a personalized recipe for a user based on their profile and preferences
   *
   * @param userId User ID
   * @param mealType Optional meal type (breakfast, lunch, dinner, snack)
   * @param equipment Optional list of available equipment
   * @return Generated recipe
   */
  @Transactional
  public GeneratedRecipeResponse generateRecipe(UUID userId, String mealType, List<String> equipment) {
    // Check cache first
    String cacheKey = buildCacheKey(userId, mealType, equipment);
    GeneratedRecipeResponse cached = readCache(cacheKey);
    if (cached != null) {
      log.debug("Cache HIT for AI recipe generation: {}", cacheKey);
      meterRegistry.counter("recipe.generation", "cached", "true").increment();
      return cached;
    }

    log.debug("Cache MISS for AI recipe generation: {}", cacheKey);
    meterRegistry.counter("recipe.generation", "cached", "false").increment();

    // Get user profile
    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    GeneratedRecipeResponse generated = fallbackRecipe(profile, mealType);
    Recipe savedRecipe = persistRecipe(generated, userId);
    GeneratedRecipeResponse response = new GeneratedRecipeResponse(
        savedRecipe.getId().toString(),
        generated.title(),
        generated.timeMinutes(),
        generated.difficulty(),
        generated.calories(),
        generated.protein(),
        generated.carbs(),
        generated.fat(),
        generated.ingredients(),
        generated.steps(),
        generated.tips(),
        generated.imageUrl(),
        false
    );

    writeCache(cacheKey, response);
    meterRegistry.counter("recipe.generation.fallback").increment();
    return response;
  }

  /**
   * Persist generated recipe to database
   */
  @Transactional
  private Recipe persistRecipe(GeneratedRecipeResponse response, UUID userId) {
    // Create nutrition summary JSON
    ObjectNode nutritionSummary = objectMapper.createObjectNode();
    nutritionSummary.put("calories", response.calories());
    nutritionSummary.put("protein", response.protein());
    nutritionSummary.put("carbs", response.carbs());
    nutritionSummary.put("fat", response.fat());

    // Create steps JSON
    ArrayNode stepsArray = objectMapper.createArrayNode();
    if (response.steps() != null) {
      response.steps().forEach(stepsArray::add);
    }

    // Create recipe entity
    Recipe recipe = Recipe.builder()
        .title(response.title())
        .timeMinutes(response.timeMinutes())
        .difficulty(response.difficulty())
        .nutritionSummary(nutritionSummary)
        .steps(stepsArray)
        .imageUrl(response.imageUrl())
        .build();

    // Save recipe first to get ID
    Recipe saved = recipeRepository.save(recipe);

    // Add ingredients using the two-save pattern for composite keys
    Set<RecipeIngredient> ingredients = new HashSet<>();
    if (response.ingredients() != null) {
      for (IngredientEntry entry : response.ingredients()) {
        // Find or create ingredient
        Ingredient ingredient = ingredientRepository.findByName(entry.name())
            .orElseGet(() -> {
              Ingredient newIngredient = Ingredient.builder()
                  .name(entry.name())
                  .build();
              return ingredientRepository.save(newIngredient);
            });

        // Parse quantity and unit from amount string (e.g., "200g" -> quantity=200, unit="g")
        String[] parts = parseQuantityAndUnit(entry.amount());
        BigDecimal quantity = new BigDecimal(parts[0]);
        String unit = parts[1];

        // Create RecipeIngredient with composite key
        RecipeIngredientId recipeIngredientId = new RecipeIngredientId(saved.getId(), ingredient.getId());
        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
            .id(recipeIngredientId)
            .recipe(saved)
            .ingredient(ingredient)
            .quantity(quantity)
            .unit(unit)
            .build();

        ingredients.add(recipeIngredient);
      }
    }
    saved.setIngredients(ingredients);

    // Save again to persist ingredients
    saved = recipeRepository.save(saved);
    log.info("Persisted generated recipe: id={}, title={}, ingredients={}",
        saved.getId(), saved.getTitle(), saved.getIngredients().size());

    return saved;
  }

  /**
   * Fallback recipe when AI generation fails
   */
  private GeneratedRecipeResponse fallbackRecipe(UserProfile profile, String mealType) {
    int targetCalories = Optional.ofNullable(profile.getDailyCalorieTarget())
        .orElseGet(() -> Optional.ofNullable(profile.getBasalMetabolicRate()).orElse(2000));

    int mealCalories = targetCalories / 4;
    int mealProtein = (int) Math.round(mealCalories * 0.30 / 4);
    int mealCarbs = (int) Math.round(mealCalories * 0.40 / 4);
    int mealFat = (int) Math.round(mealCalories * 0.30 / 9);

    String title = "Balanced " + (StringUtils.hasText(mealType) ? mealType : "Meal");

    List<IngredientEntry> ingredients = List.of(
        new IngredientEntry("Lean protein source", "150g"),
        new IngredientEntry("Whole grains", "100g"),
        new IngredientEntry("Vegetables", "200g"),
        new IngredientEntry("Healthy fats", "1 tbsp")
    );

    List<String> steps = List.of(
        "Prepare your protein source by grilling or baking",
        "Cook whole grains according to package instructions",
        "Steam or roast vegetables until tender",
        "Combine all components and season to taste"
    );

    return new GeneratedRecipeResponse(
        null,
        title,
        30,
        "EASY",
        mealCalories,
        mealProtein,
        mealCarbs,
        mealFat,
        ingredients,
        steps,
        "This is a template recipe. Try generating a personalized recipe for best results.",
        null,
        false
    );
  }

  /**
   * Build cache key for recipe generation request
   */
  private String buildCacheKey(UUID userId, String mealType, List<String> equipment) {
    String mealKey = StringUtils.hasText(mealType) ? mealType : "any";
    String equipKey = equipment != null && !equipment.isEmpty()
        ? String.join("-", equipment)
        : "basic";
    return CACHE_PREFIX + userId + ":" + mealKey + ":" + equipKey;
  }

  /**
   * Read from cache
   */
  private GeneratedRecipeResponse readCache(String cacheKey) {
    try {
      String value = redisTemplate.opsForValue().get(cacheKey);
      if (StringUtils.hasText(value)) {
        return objectMapper.readValue(value, GeneratedRecipeResponse.class);
      }
    } catch (Exception e) {
      log.warn("Failed to read from cache: {}", cacheKey, e);
      redisTemplate.delete(cacheKey);
    }
    return null;
  }

  /**
   * Write to cache
   */
  private void writeCache(String cacheKey, GeneratedRecipeResponse response) {
    try {
      String payload = objectMapper.writeValueAsString(response);
      Duration ttl = Duration.ofHours(cacheTtlHours <= 0 ? 24 : cacheTtlHours);
      redisTemplate.opsForValue().set(cacheKey, payload, ttl);
      log.debug("Cached AI recipe: {}", cacheKey);
    } catch (Exception e) {
      log.warn("Failed to write to cache: {}", cacheKey, e);
    }
  }

  /**
   * Generated recipe response DTO
   */
  public record GeneratedRecipeResponse(
      String id,
      String title,
      int timeMinutes,
      String difficulty,
      int calories,
      double protein,
      double carbs,
      double fat,
      List<IngredientEntry> ingredients,
      List<String> steps,
      String tips,
      String imageUrl,
      boolean isAiGenerated
  ) {}

  /**
   * Parse quantity and unit from amount string
   * Examples: "200g" -> ["200", "g"], "1 cup" -> ["1", "cup"], "2 tbsp" -> ["2", "tbsp"]
   *
   * @param amount Amount string (e.g., "200g", "1 cup")
   * @return Array with [quantity, unit]
   */
  private String[] parseQuantityAndUnit(String amount) {
    if (!StringUtils.hasText(amount)) {
      return new String[]{"1", ""};
    }

    String trimmed = amount.trim();

    // Try to find where numbers end and unit begins
    int i = 0;
    boolean foundDecimal = false;
    while (i < trimmed.length()) {
      char c = trimmed.charAt(i);
      if (Character.isDigit(c) || (c == '.' && !foundDecimal)) {
        if (c == '.') foundDecimal = true;
        i++;
      } else {
        break;
      }
    }

    if (i == 0) {
      // No number found, default to 1
      return new String[]{"1", trimmed};
    }

    String quantity = trimmed.substring(0, i).trim();
    String unit = (i < trimmed.length()) ? trimmed.substring(i).trim() : "";

    // Handle empty quantity
    if (!StringUtils.hasText(quantity)) {
      quantity = "1";
    }

    return new String[]{quantity, unit};
  }

  /**
   * Ingredient entry DTO
   */
  public record IngredientEntry(String name, String amount) {}
}
