package com.fitnessapp.backend.recipe.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.workout.entity.WorkoutSession;
import com.fitnessapp.backend.openai.ChatCompletionClient;
import com.fitnessapp.backend.recipe.service.MealPlanHistoryService;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.workout.repository.WorkoutSessionRepository;
import com.fitnessapp.backend.service.quota.QuotaExceededException;
import com.fitnessapp.backend.service.quota.QuotaService;
import com.fitnessapp.backend.service.quota.QuotaType;
import com.fitnessapp.backend.service.quota.QuotaUsage;
import com.theokanning.openai.completion.chat.ChatMessage;
import com.theokanning.openai.completion.chat.ChatMessageRole;
import jakarta.persistence.EntityNotFoundException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class SmartRecipeService {

  private static final String CACHE_PREFIX = "meal-plan:";
  private static final int MAX_TOKENS = 2000;

  private final UserProfileRepository userProfileRepository;
  private final WorkoutSessionRepository workoutSessionRepository;
  private final RecipeRepository recipeRepository;
  private final MealPlanHistoryService mealPlanHistoryService;
  private final Optional<ChatCompletionClient> chatCompletionClient;
  private final ObjectMapper objectMapper;
  private final StringRedisTemplate redisTemplate;
  private final QuotaService quotaService;

  public SmartRecipeService(
      UserProfileRepository userProfileRepository,
      WorkoutSessionRepository workoutSessionRepository,
      RecipeRepository recipeRepository,
      MealPlanHistoryService mealPlanHistoryService,
      Optional<ChatCompletionClient> chatCompletionClient,
      ObjectMapper objectMapper,
      StringRedisTemplate redisTemplate,
      QuotaService quotaService) {
    this.userProfileRepository = userProfileRepository;
    this.workoutSessionRepository = workoutSessionRepository;
    this.recipeRepository = recipeRepository;
    this.mealPlanHistoryService = mealPlanHistoryService;
    this.chatCompletionClient = chatCompletionClient;
    this.objectMapper = objectMapper;
    this.redisTemplate = redisTemplate;
    this.quotaService = quotaService;
  }

  @Value("${app.openai.meal-model:${app.openai.model:gpt-4o}}")
  private String mealPlanModel;

  @Value("${app.meal-plan.cache-ttl-hours:24}")
  private long cacheTtlHours;

  public MealPlanResponse generateMealPlan(UUID userId) {
    // Check quota before expensive AI operation
    log.debug("Checking AI recipe generation quota for user: {}", userId);
    QuotaUsage quotaUsage = quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION);
    
    if (quotaUsage.exceeded()) {
      log.warn("User {} exceeded AI recipe quota: {}/{}", userId, quotaUsage.used(), quotaUsage.limit());
      throw new QuotaExceededException(quotaUsage);
    }
    
    MealPlanResponse cached = readCachedPlan(userId);
    if (cached != null) {
      log.debug("Returning cached meal plan for user {} (quota not consumed)", userId);
      return cached;
    }

    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));

    LocalDateTime now = LocalDateTime.now();
    List<WorkoutSession> sessions = workoutSessionRepository
        .findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(userId, now.minusDays(7), now);

    NutritionTarget target = computeNutritionTarget(profile, sessions);

    // Check if OpenAI is available
    if (chatCompletionClient.isEmpty()) {
      log.warn("OpenAI is not enabled. Using fallback meal plan for user {}", userId);
      MealPlanResponse fallback = fallbackMealPlan(profile, target);
      persistAndCachePlan(userId, fallback, "FALLBACK_NO_OPENAI");
      return fallback;
    }

    try {
      // Consume quota BEFORE making AI call
      quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION);
      log.info("AI recipe generation quota consumed for user {} ({}/{})",
          userId, quotaUsage.used() + 1, quotaUsage.limit());

      String prompt = buildPrompt(profile, target, sessions);
      List<ChatMessage> messages = List.of(
          new ChatMessage(ChatMessageRole.SYSTEM.value(),
              "You are a certified nutritionist specializing in fitness meal planning."),
          new ChatMessage(ChatMessageRole.USER.value(), prompt)
      );

      String completion = chatCompletionClient.get().complete(mealPlanModel, messages, MAX_TOKENS, 0.3);
      MealPlanResponse response = parseMealPlanResponse(userId, target, completion);

      if (response == null || response.days().isEmpty()) {
        log.warn("Parsed meal plan was empty for user {}. Falling back to default plan.", userId);
        response = fallbackMealPlan(profile, target);
      }

      persistAndCachePlan(userId, response, "AI");
      return response;
    } catch (QuotaExceededException ex) {
      // Re-throw quota exceptions
      throw ex;
    } catch (Exception ex) {
      log.error("Failed to generate meal plan for user {} via GPT. Using fallback.", userId, ex);
      // Note: Fallback does NOT consume quota since it doesn't use AI
      MealPlanResponse fallback = fallbackMealPlan(profile, target);
      persistAndCachePlan(userId, fallback, "FALLBACK");
      return fallback;
    }
  }

  public void evictCache(UUID userId) {
    String cacheKey = cacheKey(userId);
    redisTemplate.delete(cacheKey);
  }

  public Optional<MealPlanResponse> getCachedMealPlan(UUID userId) {
    return Optional.ofNullable(readCachedPlan(userId));
  }

  private MealPlanResponse readCachedPlan(UUID userId) {
    String value = redisTemplate.opsForValue().get(cacheKey(userId));
    if (StringUtils.hasText(value)) {
      try {
        return objectMapper.readValue(value, MealPlanResponse.class);
      } catch (JsonProcessingException e) {
        log.warn("Failed to deserialize cached meal plan for user {}", userId, e);
        redisTemplate.delete(cacheKey(userId));
      }
    }

    return mealPlanHistoryService.latestPlan(userId)
        .flatMap(plan -> {
          try {
            return Optional.of(objectMapper.readValue(plan.getPlanPayload(), MealPlanResponse.class));
          } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize stored meal plan for user {}", userId, e);
            return Optional.empty();
          }
        }).orElse(null);
  }

  private void persistAndCachePlan(UUID userId, MealPlanResponse response, String source) {
    try {
      String payload = objectMapper.writeValueAsString(response);
      mealPlanHistoryService.storePlan(userId, response, source, payload);
      writeCache(userId, payload);
    } catch (JsonProcessingException e) {
      log.warn("Unable to serialize meal plan for user {}", userId, e);
    }
  }

  private void writeCache(UUID userId, String payload) {
    try {
      Duration ttl = Duration.ofHours(cacheTtlHours <= 0 ? 24 : cacheTtlHours);
      redisTemplate.opsForValue().set(cacheKey(userId), payload, ttl);
    } catch (Exception e) {
      log.warn("Unable to cache meal plan for user {}", userId, e);
    }
  }

  private String cacheKey(UUID userId) {
    return CACHE_PREFIX + userId;
  }

  private NutritionTarget computeNutritionTarget(UserProfile profile, List<WorkoutSession> sessions) {
    int calories = Optional.ofNullable(profile.getDailyCalorieTarget()).orElseGet(() ->
        Optional.ofNullable(profile.getBasalMetabolicRate()).orElse(2000));
    int protein = Optional.ofNullable(profile.getDailyProteinTarget()).orElse((int) Math.round(calories * 0.32 / 4));
    int carbs = Optional.ofNullable(profile.getDailyCarbsTarget()).orElse((int) Math.round(calories * 0.38 / 4));
    int fat = Optional.ofNullable(profile.getDailyFatTarget()).orElse((int) Math.round(calories * 0.30 / 9));

    int additionalCalories = sessions.stream()
        .mapToInt(session -> Optional.ofNullable(session.getDurationSeconds()).orElse(0))
        .map(seconds -> seconds / 300) // per 5 minutes
        .sum() * 20; // +20 kcal per 5 minutes of recorded training

    calories += additionalCalories;
    protein += sessions.size() * 5;

    return new NutritionTarget(calories, protein, carbs, fat);
  }

  private String buildPrompt(UserProfile profile, NutritionTarget target, List<WorkoutSession> sessions) {
    String goal = profile.getFitnessGoal() != null ? profile.getFitnessGoal().name() : "MAINTAIN";
    String dietary = profile.getDietaryPreference() != null ? profile.getDietaryPreference().name() : "NONE";
    String allergens = profile.getAllergens() != null && !profile.getAllergens().isEmpty()
        ? profile.getAllergens().stream().map(Enum::name).collect(Collectors.joining(", "))
        : "NONE";

    Map<String, Long> exerciseCounts = sessions.stream()
        .collect(Collectors.groupingBy(WorkoutSession::getExerciseType, Collectors.counting()));
    int totalMinutes = sessions.stream()
        .mapToInt(ws -> Optional.ofNullable(ws.getDurationSeconds()).orElse(0))
        .sum() / 60;

    StringBuilder trainingSummary = new StringBuilder();
    if (exerciseCounts.isEmpty()) {
      trainingSummary.append("No training recorded in the past 7 days");
    } else {
      trainingSummary.append("Total training time in past 7 days: ~").append(Math.max(totalMinutes, 30)).append(" minutes. ");
      trainingSummary.append("Exercise type breakdown: ");
      exerciseCounts.entrySet().stream()
          .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
          .forEach(entry -> trainingSummary.append(entry.getKey())
              .append(" x ").append(entry.getValue()).append(" sessions; "));
    }

    // Fetch all available recipes from database
    List<Recipe> availableRecipes = recipeRepository.findAll();
    StringBuilder recipeList = new StringBuilder();
    recipeList.append("\nAVAILABLE RECIPES (you MUST choose from this list only):\n");

    if (availableRecipes.isEmpty()) {
      log.warn("No recipes found in database for AI meal plan generation");
      recipeList.append("(No recipes available - fallback mode will be used)\n");
    } else {
      for (Recipe recipe : availableRecipes) {
        // Extract nutrition from JsonNode
        int calories = extractNutritionInt(recipe, "calories", 350);
        double protein = extractNutritionDouble(recipe, "protein", 20.0);
        double carbs = extractNutritionDouble(recipe, "carbs", 40.0);
        double fat = extractNutritionDouble(recipe, "fat", 12.0);

        recipeList.append(String.format(
            "- %s (Calories: %d, Protein: %.1fg, Carbs: %.1fg, Fat: %.1fg, Difficulty: %s)\n",
            recipe.getTitle(),
            calories,
            protein,
            carbs,
            fat,
            recipe.getDifficulty() != null ? recipe.getDifficulty() : "MEDIUM"
        ));
      }
    }

    return "You are a professional nutritionist AI. Generate a 7-day meal plan with 4 meals per day (breakfast/lunch/dinner/snack) based on the user information and available recipes below.\n" +
        "⚠️ CRITICAL: You can ONLY select recipes from the [AVAILABLE RECIPES] list below. Do NOT create new recipe names!\n\n" +
        "User Information:\n" +
        "Fitness Goal: " + goal + "\n" +
        "Dietary Preference: " + dietary + "\n" +
        "Allergens: " + allergens + "\n" +
        "Height: " + Optional.ofNullable(profile.getHeightCm()).orElse(170) + " cm\n" +
        "Weight: " + Optional.ofNullable(profile.getWeightKg()).orElse(65.0) + " kg\n" +
        "Training Summary: " + trainingSummary + "\n" +
        "Daily Nutrition Target: " +
        "Calories=" + target.calories() + "kcal, " +
        "Protein=" + target.protein() + "g, " +
        "Carbs=" + target.carbs() + "g, " +
        "Fat=" + target.fat() + "g\n" +
        recipeList.toString() + "\n" +
        "Requirements:\n" +
        "1. Return JSON format: {\"days\":[{\"dayNumber\":1,\"meals\":[{\"type\":\"breakfast\",\"recipeName\":\"Grilled Chicken Salad\"}]}]}\n" +
        "2. recipeName MUST exactly match a recipe name from the [AVAILABLE RECIPES] list above!\n" +
        "3. Do NOT include calories/protein/carbs/fat fields - the system will fetch these from the database automatically\n" +
        "4. Each day must have 4 meals with types: breakfast, lunch, dinner, snack\n" +
        "5. Select recipes to meet nutrition targets (within 10% tolerance)\n" +
        "6. Avoid repeating the same recipe on consecutive days - ensure variety\n" +
        "7. Filter out recipes that conflict with the user's dietary preferences and allergens\n" +
        "8. Return only valid JSON without any markdown code blocks or extra text";
  }

  private MealPlanResponse parseMealPlanResponse(UUID userId, NutritionTarget target, String rawContent)
      throws JsonProcessingException {
    if (!StringUtils.hasText(rawContent)) {
      return null;
    }

    String sanitized = sanitizeJson(rawContent);
    JsonNode root = objectMapper.readTree(sanitized);

    if (root == null || !root.has("days")) {
      return null;
    }

    List<MealPlanDay> days = new ArrayList<>();
    for (JsonNode dayNode : root.get("days")) {
      int dayNumber = dayNode.path("dayNumber").asInt(days.size() + 1);
      List<MealEntry> meals = new ArrayList<>();

      for (JsonNode mealNode : dayNode.withArray("meals")) {
        String mealType = mealNode.path("type").asText("meal").toLowerCase(Locale.CHINA);
        String recipeName = mealNode.path("recipeName").asText(null);

        // Look up recipe in database - AI must select from available recipes
        Optional<Recipe> recipeOpt = lookupRecipe(recipeName);

        if (recipeOpt.isEmpty()) {
          log.warn("AI returned recipe not in database: '{}'. Skipping this meal.", recipeName);
          continue; // Skip meals with invalid recipes
        }

        Recipe recipe = recipeOpt.get();

        // Extract nutrition from database (not from AI response)
        Integer calories = extractNutritionInt(recipe, "calories", 350);
        Double protein = extractNutritionDouble(recipe, "protein", 20.0);
        Double carbs = extractNutritionDouble(recipe, "carbs", 40.0);
        Double fat = extractNutritionDouble(recipe, "fat", 12.0);

        MealEntry entry = new MealEntry(
            mealType,
            recipe.getId().toString(),
            recipe.getTitle(),
            calories,
            protein,
            carbs,
            fat,
            recipe.getDifficulty()
        );
        meals.add(entry);
      }

      // Only add days with at least 3 meals (breakfast, lunch, dinner minimum)
      if (meals.size() >= 3) {
        days.add(new MealPlanDay(dayNumber, meals));
      } else {
        log.warn("Day {} has only {} meals (need at least 3). Skipping day.", dayNumber, meals.size());
      }
    }

    // If AI generated insufficient valid days, return null to trigger fallback
    if (days.size() < 5) {
      log.warn("AI generated only {} valid days (need at least 5). Will use fallback plan.", days.size());
      return null;
    }

    return new MealPlanResponse(target, days);
  }

  private Optional<Recipe> lookupRecipe(String recipeName) {
    if (!StringUtils.hasText(recipeName)) {
      return Optional.empty();
    }
    return recipeRepository.findFirstByTitleIgnoreCase(recipeName.trim());
  }

  private MealPlanResponse fallbackMealPlan(UserProfile profile, NutritionTarget target) {
    List<Recipe> recipes = recipeRepository.findTop12ByOrderByCreatedAtDesc();
    if (recipes.isEmpty()) {
      recipes = recipeRepository.findAll().stream().limit(12).collect(Collectors.toList());
    }
    if (recipes.isEmpty()) {
      log.warn("No recipes available for fallback plan");
      List<MealPlanDay> empty = new ArrayList<>();
      return new MealPlanResponse(target, empty);
    }

    Map<String, Integer> defaultMacros = defaultPerMealMacros(target);
    List<MealPlanDay> days = new ArrayList<>();
    String[] mealTypes = {"breakfast", "lunch", "dinner", "snack"};

    for (int day = 1; day <= 7; day++) {
      List<MealEntry> meals = new ArrayList<>();
      for (int i = 0; i < mealTypes.length; i++) {
        Recipe recipe = recipes.get((day * mealTypes.length + i) % recipes.size());
        meals.add(new MealEntry(
            mealTypes[i],
            recipe.getId() != null ? recipe.getId().toString() : null,
            recipe.getTitle(),
            defaultMacros.get("calories"),
            defaultMacros.get("protein").doubleValue(),
            defaultMacros.get("carbs").doubleValue(),
            defaultMacros.get("fat").doubleValue(),
            recipe.getDifficulty()
        ));
      }
      days.add(new MealPlanDay(day, meals));
    }
    return new MealPlanResponse(target, days);
  }

  private Map<String, Integer> defaultPerMealMacros(NutritionTarget target) {
    Map<String, Integer> macros = new HashMap<>();
    macros.put("calories", Math.max(350, target.calories() / 4));
    macros.put("protein", Math.max(20, target.protein() / 4));
    macros.put("carbs", Math.max(25, target.carbs() / 4));
    macros.put("fat", Math.max(10, target.fat() / 4));
    return macros;
  }

  private String sanitizeJson(String content) {
    String trimmed = content.trim();
    if (trimmed.startsWith("```")) {
      int lastFence = trimmed.lastIndexOf("```");
      int firstLineBreak = trimmed.indexOf('\n');
      if (lastFence > firstLineBreak && firstLineBreak >= 0) {
        trimmed = trimmed.substring(firstLineBreak + 1, lastFence).trim();
      }
    }
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
   * Extract integer nutrition value from Recipe's nutritionSummary JsonNode
   */
  private int extractNutritionInt(Recipe recipe, String field, int defaultValue) {
    JsonNode nutritionNode = recipe.getNutritionSummary();
    if (nutritionNode == null || !nutritionNode.has(field)) {
      return defaultValue;
    }
    return nutritionNode.get(field).asInt(defaultValue);
  }

  /**
   * Extract double nutrition value from Recipe's nutritionSummary JsonNode
   */
  private double extractNutritionDouble(Recipe recipe, String field, double defaultValue) {
    JsonNode nutritionNode = recipe.getNutritionSummary();
    if (nutritionNode == null || !nutritionNode.has(field)) {
      return defaultValue;
    }
    return nutritionNode.get(field).asDouble(defaultValue);
  }

  public record NutritionTarget(int calories, int protein, int carbs, int fat) {}

  public record MealPlanResponse(NutritionTarget target, List<MealPlanDay> days) {}

  public record MealPlanDay(int dayNumber, List<MealEntry> meals) {}

  public record MealEntry(
      String mealType,
      String recipeId,
      String recipeName,
      Integer calories,
      Double protein,
      Double carbs,
      Double fat,
      String note
  ) {}
}
