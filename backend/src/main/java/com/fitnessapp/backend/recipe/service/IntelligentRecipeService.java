package com.fitnessapp.backend.recipe.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
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
import lombok.extern.slf4j.Slf4j;

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
  @Nullable
  private final StringRedisTemplate redisTemplate;
  private final MeterRegistry meterRegistry;

  public IntelligentRecipeService(
      UserProfileRepository userProfileRepository,
      RecipeRepository recipeRepository,
      IngredientRepository ingredientRepository,
      ObjectMapper objectMapper,
      @Autowired(required = false) StringRedisTemplate redisTemplate,
      MeterRegistry meterRegistry) {
    this.userProfileRepository = userProfileRepository;
    this.recipeRepository = recipeRepository;
    this.ingredientRepository = ingredientRepository;
    this.objectMapper = objectMapper;
    this.redisTemplate = redisTemplate;
    this.meterRegistry = meterRegistry;
  }

  @Value("${app.openai.model:gpt-4o}")
  private String recipeModel;

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

    // OpenAI integration removed - using fallback recipe generation
    log.debug("Using fallback recipe generation for user {}", userId);
    meterRegistry.counter("recipe.generation.fallback_only").increment();
    GeneratedRecipeResponse fallback = fallbackRecipe(profile, mealType);
    Recipe savedRecipe = persistRecipe(fallback, userId);
    return new GeneratedRecipeResponse(
        savedRecipe.getId().toString(),
        fallback.title(),
        fallback.timeMinutes(),
        fallback.difficulty(),
        fallback.calories(),
        fallback.protein(),
        fallback.carbs(),
        fallback.fat(),
        fallback.ingredients(),
        fallback.steps(),
        fallback.tips(),
        fallback.imageUrl(),
        false
    );
  }

  /**
      Recipe savedRecipe = persistRecipe(response, userId);
      response = new GeneratedRecipeResponse(
          savedRecipe.getId().toString(),
          response.title(),
          response.timeMinutes(),
          response.difficulty(),
          response.calories(),
          response.protein(),
          response.carbs(),
          response.fat(),
          response.ingredients(),
          response.steps(),
          response.tips(),
          response.imageUrl(),
          true  // isAiGenerated
      );

      // Cache result
      writeCache(cacheKey, response);

      meterRegistry.counter("recipe.generation.success").increment();
      return response;

    } catch (Exception ex) {
      log.error("Failed to generate recipe for user {} via GPT-4", userId, ex);
      meterRegistry.counter("recipe.generation.error").increment();
      GeneratedRecipeResponse fallback = fallbackRecipe(profile, mealType);
      Recipe savedRecipe = persistRecipe(fallback, userId);
      return new GeneratedRecipeResponse(
          savedRecipe.getId().toString(),
          fallback.title(),
          fallback.timeMinutes(),
          fallback.difficulty(),
          fallback.calories(),
          fallback.protein(),
          fallback.carbs(),
          fallback.fat(),
          fallback.ingredients(),
          fallback.steps(),
          fallback.tips(),
          fallback.imageUrl(),
          true
      );
    }
  }

  /**
   * Build GPT-4 prompt for recipe generation
   * NOTE: Currently unused as OpenAI integration was removed. Kept for future use.
   */
  @SuppressWarnings("unused")
  private String buildPrompt(UserProfile profile, String mealType, List<String> equipment) {
    String goal = profile.getFitnessGoal() != null ? profile.getFitnessGoal().name() : "MAINTAIN";
    String dietary = profile.getDietaryPreference() != null ? profile.getDietaryPreference().name() : "NONE";

    int targetCalories = Optional.ofNullable(profile.getDailyCalorieTarget())
        .orElseGet(() -> Optional.ofNullable(profile.getBasalMetabolicRate()).orElse(2000));
    int targetProtein = Optional.ofNullable(profile.getDailyProteinTarget())
        .orElse((int) Math.round(targetCalories * 0.30 / 4));
    int targetCarbs = Optional.ofNullable(profile.getDailyCarbsTarget())
        .orElse((int) Math.round(targetCalories * 0.40 / 4));
    int targetFat = Optional.ofNullable(profile.getDailyFatTarget())
        .orElse((int) Math.round(targetCalories * 0.30 / 9));

    // Calculate per-meal targets (assuming 4 meals per day)
    int mealCalories = targetCalories / 4;
    int mealProtein = targetProtein / 4;
    int mealCarbs = targetCarbs / 4;
    int mealFat = targetFat / 4;

    String mealTypeStr = StringUtils.hasText(mealType) ? mealType : "any meal type";
    String equipmentStr = equipment != null && !equipment.isEmpty()
        ? String.join(", ", equipment)
        : "basic kitchen equipment";

    return "Generate a personalized recipe with the following requirements:\n\n" +
        "User Profile:\n" +
        "- Fitness Goal: " + goal + "\n" +
        "- Dietary Preference: " + dietary + "\n" +
        "- Height: " + Optional.ofNullable(profile.getHeightCm()).orElse(170) + " cm\n" +
        "- Weight: " + Optional.ofNullable(profile.getWeightKg()).orElse(new BigDecimal("65.0")) + " kg\n\n" +
        "Recipe Requirements:\n" +
        "- Meal Type: " + mealTypeStr + "\n" +
        "- Available Equipment: " + equipmentStr + "\n" +
        "- Target Nutrition (per meal):\n" +
        "  * Calories: ~" + mealCalories + " kcal\n" +
        "  * Protein: ~" + mealProtein + " g\n" +
        "  * Carbs: ~" + mealCarbs + " g\n" +
        "  * Fat: ~" + mealFat + " g\n\n" +
        "Please generate a recipe in the following JSON format (no extra text):\n" +
        "{\n" +
        "  \"title\": \"Recipe Name\",\n" +
        "  \"timeMinutes\": 30,\n" +
        "  \"difficulty\": \"EASY\",  // EASY, MEDIUM, or HARD\n" +
        "  \"calories\": 450,\n" +
        "  \"protein\": 35,\n" +
        "  \"carbs\": 45,\n" +
        "  \"fat\": 15,\n" +
        "  \"ingredients\": [\n" +
        "    {\"name\": \"Chicken breast\", \"amount\": \"200g\"},\n" +
        "    {\"name\": \"Brown rice\", \"amount\": \"100g\"}\n" +
        "  ],\n" +
        "  \"steps\": [\n" +
        "    \"Step 1 description\",\n" +
        "    \"Step 2 description\"\n" +
        "  ],\n" +
        "  \"tips\": \"Optional cooking tips or substitutions\"\n" +
        "}\n\n" +
        "Requirements:\n" +
        "1. Match the dietary preference (e.g., vegetarian, vegan, etc.)\n" +
        "2. Target the specified nutrition values (±10% is acceptable)\n" +
        "3. Be practical and achievable with the available equipment\n" +
        "4. Support the user's fitness goal (e.g., high protein for muscle gain)";
  }

  /**
   * Parse GPT-4 response into a GeneratedRecipeResponse
   * NOTE: Currently unused as OpenAI integration was removed. Kept for future use.
   */
  @SuppressWarnings("unused")
  private GeneratedRecipeResponse parseRecipeResponse(String rawContent, UserProfile profile)
      throws JsonProcessingException {
    if (!StringUtils.hasText(rawContent)) {
      return null;
    }

    String sanitized = sanitizeJson(rawContent);
    JsonNode root = objectMapper.readTree(sanitized);

    if (root == null || !root.has("title")) {
      return null;
    }

    String title = root.path("title").asText(null);
    int timeMinutes = root.path("timeMinutes").asInt(30);
    String difficulty = root.path("difficulty").asText("MEDIUM").toUpperCase();
    int calories = root.path("calories").asInt(0);
    double protein = root.path("protein").asDouble(0.0);
    double carbs = root.path("carbs").asDouble(0.0);
    double fat = root.path("fat").asDouble(0.0);

    List<IngredientEntry> ingredients = new ArrayList<>();
    if (root.has("ingredients")) {
      for (JsonNode ingredientNode : root.get("ingredients")) {
        String name = ingredientNode.path("name").asText("");
        String amount = ingredientNode.path("amount").asText("");
        if (StringUtils.hasText(name)) {
          ingredients.add(new IngredientEntry(name, amount));
        }
      }
    }

    List<String> steps = new ArrayList<>();
    if (root.has("steps")) {
      for (JsonNode stepNode : root.get("steps")) {
        String step = stepNode.asText("");
        if (StringUtils.hasText(step)) {
          steps.add(step);
        }
      }
    }

    String tips = root.path("tips").asText(null);

    return new GeneratedRecipeResponse(
        null,  // ID will be set after persistence
        title,
        timeMinutes,
        difficulty,
        calories,
        protein,
        carbs,
        fat,
        ingredients,
        steps,
        tips,
        null,  // imageUrl - could be generated via DALL-E in future
        true
    );
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
    log.info("Persisted AI-generated recipe: id={}, title={}, ingredients={}",
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
   * Sanitize JSON from GPT-4 response (remove markdown code blocks, etc.)
   */
  private String sanitizeJson(String content) {
    String trimmed = content.trim();

    // Remove markdown code blocks
    if (trimmed.startsWith("```")) {
      int lastFence = trimmed.lastIndexOf("```");
      int firstLineBreak = trimmed.indexOf('\n');
      if (lastFence > firstLineBreak && firstLineBreak >= 0) {
        trimmed = trimmed.substring(firstLineBreak + 1, lastFence).trim();
      }
    }

    // Remove "json" language identifier
    if (trimmed.startsWith("json")) {
      trimmed = trimmed.substring(4).trim();
    }

    // Extract JSON object
    if (trimmed.startsWith("{")) {
      return trimmed;
    }

    int start = trimmed.indexOf('{');
    int end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return trimmed.substring(start, end + 1);
    }

    return trimmed;
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
    if (redisTemplate == null) return null;
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
   * NOTE: Currently unused as OpenAI integration was removed. Kept for future use.
   */
  @SuppressWarnings("unused")
  private void writeCache(String cacheKey, GeneratedRecipeResponse response) {
    if (redisTemplate == null) return;
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
