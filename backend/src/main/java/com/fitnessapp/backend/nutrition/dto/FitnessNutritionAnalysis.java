package com.fitnessapp.backend.nutrition.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI-Native Fitness Nutrition Analysis Result.
 *
 * This DTO represents a complete meal analysis from Gemini Pro,
 * designed specifically for bodybuilding and fitness tracking.
 *
 * Key differences from the legacy FoodRecognitionResult:
 * - Nutrition data is provided directly by AI (no USDA lookup needed)
 * - Includes fitness-specific analysis (meal type, advice)
 * - Designed for macro tracking (protein is king!)
 * - Detects hidden calories (oils, sauces in Asian cuisine)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FitnessNutritionAnalysis {

    /**
     * List of detected food items with their macros
     */
    private List<FitnessFood> items;

    /**
     * Total nutrition summary for the entire meal
     */
    @JsonProperty("total_nutrition")
    private MealNutritionSummary totalNutrition;

    /**
     * Fitness-specific meal analysis
     */
    @JsonProperty("fitness_analysis")
    private FitnessMealAnalysis fitnessAnalysis;

    /**
     * Time of day classification
     */
    @JsonProperty("meal_time")
    private String mealTime; // breakfast, lunch, dinner, snack, pre_workout, post_workout

    /**
     * Overall confidence score for the analysis (0-1)
     */
    private Double confidence;

    /**
     * Hidden calories warning (oils, sauces, cooking fats)
     */
    @JsonProperty("hidden_calories")
    private HiddenCaloriesWarning hiddenCalories;

    /**
     * Individual food item with AI-generated nutrition data
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FitnessFood {
        @JsonProperty("food_name")
        private String foodName;

        @JsonProperty("display_name")
        private String displayName;

        /**
         * Estimated portion in grams
         */
        @JsonProperty("portion_grams")
        private Integer portionGrams;

        /**
         * Total calories for this portion
         */
        private Integer calories;

        /**
         * Macronutrients - the core value for bodybuilders
         */
        private Macros macros;

        /**
         * Cooking method affects calories (fried vs grilled)
         */
        @JsonProperty("cooking_method")
        private String cookingMethod;

        /**
         * AI confidence for this item
         */
        private Double confidence;

        /**
         * Is this a protein-rich food? (>20g protein per 100g)
         */
        @JsonProperty("high_protein")
        private Boolean highProtein;
    }

    /**
     * Macronutrients - essential for bodybuilding/fitness tracking
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Macros {
        /**
         * Protein in grams - CRITICAL for muscle gain
         */
        @JsonProperty("protein_g")
        private Integer proteinG;

        /**
         * Carbohydrates in grams
         */
        @JsonProperty("carbs_g")
        private Integer carbsG;

        /**
         * Fat in grams
         */
        @JsonProperty("fat_g")
        private Integer fatG;

        /**
         * Fiber in grams (important for gut health)
         */
        @JsonProperty("fiber_g")
        private Integer fiberG;

        /**
         * Sugar in grams (watch for cutting phases)
         */
        @JsonProperty("sugar_g")
        private Integer sugarG;
    }

    /**
     * Total nutrition for the meal
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealNutritionSummary {
        @JsonProperty("total_calories")
        private Integer totalCalories;

        @JsonProperty("total_protein_g")
        private Integer totalProteinG;

        @JsonProperty("total_carbs_g")
        private Integer totalCarbsG;

        @JsonProperty("total_fat_g")
        private Integer totalFatG;

        @JsonProperty("total_fiber_g")
        private Integer totalFiberG;

        /**
         * Protein percentage of total calories
         * Target: 25-35% for muscle building
         */
        @JsonProperty("protein_percentage")
        private Integer proteinPercentage;

        /**
         * Calories from protein (1g = 4 kcal)
         */
        @JsonProperty("protein_calories")
        private Integer proteinCalories;
    }

    /**
     * Fitness-specific meal analysis
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FitnessMealAnalysis {
        /**
         * Meal classification for fitness goals
         */
        @JsonProperty("meal_type")
        private MealType mealType;

        /**
         * Short, actionable advice for the fitness enthusiast
         */
        private String advice;

        /**
         * Is this meal good for cutting phase?
         */
        @JsonProperty("cutting_friendly")
        private Boolean cuttingFriendly;

        /**
         * Is this meal good for bulking phase?
         */
        @JsonProperty("bulking_friendly")
        private Boolean bulkingFriendly;

        /**
         * Protein quality assessment
         */
        @JsonProperty("protein_quality")
        private String proteinQuality; // excellent, good, moderate, poor

        /**
         * Suggested improvements
         */
        private List<String> suggestions;
    }

    /**
     * Meal type classification for fitness tracking
     */
    public enum MealType {
        CLEAN_EATING,       // High protein, low processed, nutrient dense
        CHEAT_MEAL,         // High calorie, indulgent, treat yourself
        POST_WORKOUT,       // High protein + carbs for recovery
        PRE_WORKOUT,        // Moderate carbs for energy
        HIGH_PROTEIN,       // Protein-focused meal (>40g protein)
        LOW_CARB,           // Keto-friendly, cutting phase
        BALANCED,           // Well-rounded macros
        UNKNOWN
    }

    /**
     * Hidden calories detection - crucial for Asian cuisine
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HiddenCaloriesWarning {
        /**
         * Are there hidden calories detected?
         */
        @JsonProperty("detected")
        private Boolean detected;

        /**
         * Estimated hidden calories from oils/sauces
         */
        @JsonProperty("estimated_hidden_calories")
        private Integer estimatedHiddenCalories;

        /**
         * Sources of hidden calories
         */
        private List<String> sources;

        /**
         * Warning message for the user
         */
        private String warning;
    }
}
