package com.fitnessapp.backend.recommendation.service;

import com.fitnessapp.backend.goals.entity.UserGoal;
import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recommendation.dto.RecipeRecommendation;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Content-based recommendation service for recipes.
 * Recommends recipes based on how well they match the user's nutritional goals.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeRecommendationService {

    private final RecipeRepository recipeRepository;
    private final UserGoalRepository userGoalRepository;

    // Tolerance ranges for nutrition matching (percentage of target)
    private static final double CALORIE_TOLERANCE = 0.20; // 20% tolerance
    private static final double MACRO_TOLERANCE = 0.30;   // 30% tolerance

    /**
     * Get recipe recommendations based on user's active goal.
     * Uses content-based filtering to match recipes to nutritional targets.
     */
    public List<RecipeRecommendation> getRecommendations(UUID userId, RecommendationRequest request) {
        Optional<UserGoal> activeGoal = userGoalRepository.findActiveByUserId(userId);

        if (activeGoal.isEmpty()) {
            log.info("No active goal found for user {}, returning default recommendations", userId);
            return getDefaultRecommendations(request.getLimit());
        }

        UserGoal goal = activeGoal.get();
        log.info("Generating recipe recommendations for user {} with goal type: {}", userId, goal.getGoalType());

        // Calculate per-meal targets (assuming 3 meals per day)
        int mealsPerDay = 3;
        int targetCaloriesPerMeal = goal.getDailyCaloriesTarget() / mealsPerDay;
        int targetProteinPerMeal = goal.getProteinG() / mealsPerDay;
        int targetCarbsPerMeal = goal.getCarbsG() / mealsPerDay;
        int targetFatPerMeal = goal.getFatG() / mealsPerDay;

        // Fetch candidate recipes based on goal type
        List<Recipe> candidates = fetchCandidates(goal, targetCaloriesPerMeal, request);

        // Score and rank recipes
        List<RecipeRecommendation> recommendations = candidates.stream()
                .map(recipe -> scoreRecipe(recipe, targetCaloriesPerMeal, targetProteinPerMeal,
                        targetCarbsPerMeal, targetFatPerMeal, goal.getGoalType()))
                .filter(rec -> rec.getMatchScore() > 0.3) // Minimum 30% match
                .sorted(Comparator.comparingDouble(RecipeRecommendation::getMatchScore).reversed())
                .limit(request.getLimit())
                .collect(Collectors.toList());

        log.info("Generated {} recipe recommendations for user {}", recommendations.size(), userId);
        return recommendations;
    }

    /**
     * Fetch candidate recipes based on goal type and constraints.
     */
    private List<Recipe> fetchCandidates(UserGoal goal, int targetCaloriesPerMeal, RecommendationRequest request) {
        String goalType = goal.getGoalType().toLowerCase();
        int candidateLimit = request.getLimit() * 5; // Fetch more candidates for better ranking

        switch (goalType) {
            case "fat_loss":
            case "weight_loss":
                // For fat loss, prioritize low-calorie, high-protein recipes
                return recipeRepository.findByNutritionCriteria(
                        null, // no min calories
                        (int) (targetCaloriesPerMeal * 1.1), // max slightly above target
                        (int) (goal.getProteinG() / 4), // min protein per meal
                        null,
                        null,
                        (int) (goal.getCarbsG() / 2.5), // limit carbs
                        null,
                        null,
                        request.getMaxTime(),
                        request.getDifficulty(),
                        "protein", // sort by protein (descending)
                        candidateLimit
                );

            case "muscle_gain":
            case "build_muscle":
                // For muscle gain, prioritize high-protein, adequate calories
                return recipeRepository.findHighProteinRecipes(
                        (int) (goal.getProteinG() / 4), // min 25% of daily protein per meal
                        request.getMaxTime(),
                        candidateLimit
                );

            case "maintenance":
            case "maintain_weight":
                // For maintenance, balanced nutrition
                int calorieMargin = (int) (targetCaloriesPerMeal * CALORIE_TOLERANCE);
                return recipeRepository.findByCaloriesRange(
                        targetCaloriesPerMeal - calorieMargin,
                        targetCaloriesPerMeal + calorieMargin,
                        candidateLimit
                );

            default:
                // General recommendations
                return recipeRepository.findByNutritionCriteria(
                        null, null, null, null, null, null, null, null,
                        request.getMaxTime(),
                        request.getDifficulty(),
                        "time",
                        candidateLimit
                );
        }
    }

    /**
     * Score a recipe based on how well it matches the nutritional targets.
     * Returns a RecipeRecommendation with the match score and reasons.
     */
    private RecipeRecommendation scoreRecipe(Recipe recipe, int targetCalories, int targetProtein,
                                              int targetCarbs, int targetFat, String goalType) {
        JsonNode nutrition = recipe.getNutritionSummary();
        if (nutrition == null) {
            return buildRecommendation(recipe, 0.0, List.of("Missing nutrition data"));
        }

        // Extract nutrition values
        int calories = getIntValue(nutrition, "calories", 0);
        double protein = getDoubleValue(nutrition, "protein", 0.0);
        double carbs = getDoubleValue(nutrition, "carbs", 0.0);
        double fat = getDoubleValue(nutrition, "fat", 0.0);

        // Calculate individual match scores (0 to 1)
        double calorieScore = calculateMatchScore(calories, targetCalories, CALORIE_TOLERANCE);
        double proteinScore = calculateMatchScore(protein, targetProtein, MACRO_TOLERANCE);
        double carbsScore = calculateMatchScore(carbs, targetCarbs, MACRO_TOLERANCE);
        double fatScore = calculateMatchScore(fat, targetFat, MACRO_TOLERANCE);

        // Weight scores based on goal type
        double totalScore = calculateWeightedScore(calorieScore, proteinScore, carbsScore, fatScore, goalType);

        // Generate match reasons
        List<String> reasons = generateReasons(calories, targetCalories, protein, targetProtein,
                carbs, targetCarbs, fat, targetFat, goalType);

        return buildRecommendation(recipe, totalScore, reasons);
    }

    /**
     * Calculate weighted score based on goal type.
     */
    private double calculateWeightedScore(double calorieScore, double proteinScore,
                                          double carbsScore, double fatScore, String goalType) {
        String goal = goalType.toLowerCase();

        if (goal.contains("fat_loss") || goal.contains("weight_loss")) {
            // For fat loss: calories and protein are most important
            return calorieScore * 0.35 + proteinScore * 0.35 + carbsScore * 0.15 + fatScore * 0.15;
        } else if (goal.contains("muscle") || goal.contains("build")) {
            // For muscle gain: protein is most important
            return calorieScore * 0.20 + proteinScore * 0.50 + carbsScore * 0.20 + fatScore * 0.10;
        } else {
            // For maintenance: balanced approach
            return calorieScore * 0.30 + proteinScore * 0.25 + carbsScore * 0.25 + fatScore * 0.20;
        }
    }

    /**
     * Calculate match score between actual and target values.
     * Returns 1.0 for perfect match, decreasing as values deviate.
     */
    private double calculateMatchScore(double actual, double target, double tolerance) {
        if (target <= 0) return 0.5; // Neutral score if no target

        double deviation = Math.abs(actual - target) / target;
        if (deviation <= tolerance) {
            return 1.0 - (deviation / tolerance) * 0.3; // 0.7 to 1.0 for within tolerance
        } else {
            return Math.max(0.0, 0.7 - (deviation - tolerance) * 0.5); // Decreasing below 0.7
        }
    }

    /**
     * Generate human-readable reasons for why this recipe matches the goal.
     */
    private List<String> generateReasons(int calories, int targetCalories, double protein, int targetProtein,
                                          double carbs, int targetCarbs, double fat, int targetFat, String goalType) {
        List<String> reasons = new ArrayList<>();
        String goal = goalType.toLowerCase();

        // Calorie-related reasons
        double calorieDeviation = targetCalories > 0 ? (double)(calories - targetCalories) / targetCalories : 0;
        if (Math.abs(calorieDeviation) <= 0.1) {
            reasons.add("Matches your calorie target");
        } else if (calorieDeviation < -0.1 && (goal.contains("fat_loss") || goal.contains("weight_loss"))) {
            reasons.add("Lower calorie for weight management");
        }

        // Protein-related reasons
        double proteinDeviation = targetProtein > 0 ? (protein - targetProtein) / targetProtein : 0;
        if (proteinDeviation >= 0 && protein >= 20) {
            reasons.add(String.format("High protein (%.0fg)", protein));
        } else if (Math.abs(proteinDeviation) <= 0.15) {
            reasons.add("Good protein balance");
        }

        // Carb-related reasons
        if (goal.contains("fat_loss") || goal.contains("weight_loss")) {
            if (carbs < targetCarbs * 0.8) {
                reasons.add("Lower carb option");
            }
        } else if (goal.contains("muscle")) {
            if (carbs >= targetCarbs * 0.9) {
                reasons.add("Adequate carbs for energy");
            }
        }

        // Add goal-specific reasons
        if (reasons.isEmpty()) {
            reasons.add("Balanced nutrition for your goal");
        }

        return reasons;
    }

    /**
     * Get default recommendations when user has no active goal.
     */
    private List<RecipeRecommendation> getDefaultRecommendations(int limit) {
        List<Recipe> recipes = recipeRepository.findTop12ByOrderByCreatedAtDesc();

        return recipes.stream()
                .limit(limit)
                .map(recipe -> buildRecommendation(recipe, 0.5, List.of("Recently added recipe")))
                .collect(Collectors.toList());
    }

    /**
     * Build a RecipeRecommendation DTO from a Recipe entity.
     */
    private RecipeRecommendation buildRecommendation(Recipe recipe, double matchScore, List<String> reasons) {
        JsonNode nutrition = recipe.getNutritionSummary();
        Map<String, Object> nutritionMap = new HashMap<>();

        if (nutrition != null) {
            nutritionMap.put("calories", getIntValue(nutrition, "calories", 0));
            nutritionMap.put("protein", getDoubleValue(nutrition, "protein", 0.0));
            nutritionMap.put("carbs", getDoubleValue(nutrition, "carbs", 0.0));
            nutritionMap.put("fat", getDoubleValue(nutrition, "fat", 0.0));
            nutritionMap.put("fiber", getDoubleValue(nutrition, "fiber", 0.0));
            nutritionMap.put("sugar", getDoubleValue(nutrition, "sugar", 0.0));
        }

        List<String> ingredientNames = recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getName())
                .collect(Collectors.toList());

        return RecipeRecommendation.builder()
                .id(recipe.getId().toString())
                .title(recipe.getTitle())
                .imageUrl(recipe.getImageUrl())
                .timeMinutes(recipe.getTimeMinutes())
                .difficulty(recipe.getDifficulty())
                .nutrition(nutritionMap)
                .ingredients(ingredientNames)
                .matchScore(matchScore)
                .matchReasons(reasons)
                .build();
    }

    private int getIntValue(JsonNode node, String field, int defaultValue) {
        JsonNode value = node.get(field);
        return value != null && value.isNumber() ? value.asInt() : defaultValue;
    }

    private double getDoubleValue(JsonNode node, String field, double defaultValue) {
        JsonNode value = node.get(field);
        return value != null && value.isNumber() ? value.asDouble() : defaultValue;
    }
}
