package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.math.BigDecimal;

/**
 * Nutrition information for recipes
 *
 * Provides complete nutritional breakdown that users see
 * when browsing or viewing recipe details
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NutritionInfo {
    /**
     * Total calories (kcal)
     */
    Integer calories;

    /**
     * Protein in grams
     */
    BigDecimal protein;

    /**
     * Carbohydrates in grams
     */
    BigDecimal carbs;

    /**
     * Fat in grams
     */
    BigDecimal fat;

    /**
     * Fiber in grams (optional)
     */
    BigDecimal fiber;

    /**
     * Sugar in grams (optional)
     */
    BigDecimal sugar;

    /**
     * Sodium in milligrams (optional)
     */
    Integer sodium;

    /**
     * Servings (optional)
     */
    Integer servings;

    /**
     * Create default/estimated nutrition when data is missing
     */
    public static NutritionInfo createDefault() {
        return NutritionInfo.builder()
            .calories(350)
            .protein(new BigDecimal("20.0"))
            .carbs(new BigDecimal("40.0"))
            .fat(new BigDecimal("12.0"))
            .build();
    }

    /**
     * Create nutrition from Spoonacular API data
     */
    public static NutritionInfo fromSpoonacular(
        Integer calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        BigDecimal fiber,
        BigDecimal sugar,
        Integer sodium,
        Integer servings
    ) {
        return NutritionInfo.builder()
            .calories(calories)
            .protein(protein)
            .carbs(carbs)
            .fat(fat)
            .fiber(fiber)
            .sugar(sugar)
            .sodium(sodium)
            .servings(servings)
            .build();
    }
}
