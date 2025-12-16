package com.fitnessapp.backend.nutrition.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.nutrition.enums.FoodDensityCategory;
import com.fitnessapp.backend.nutrition.enums.PortionSize;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Structured metadata extracted from AI for food analysis.
 * Used to construct dynamic USDA database queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodMetadata {

    /**
     * Base ingredient (e.g., "Chicken", "Salmon", "Rice")
     */
    @JsonProperty("base_ingredient")
    private String baseIngredient;

    /**
     * Form or cut (e.g., "Breast", "Thigh", "Fillet", "Whole")
     */
    @JsonProperty("form")
    private String form;

    /**
     * Cooking method enum
     */
    @JsonProperty("cooking_method")
    private String cookingMethodStr;

    /**
     * Additional modifiers (e.g., ["Breaded", "Skin-on", "With sauce"])
     */
    @JsonProperty("modifiers")
    @Builder.Default
    private List<String> modifiers = new ArrayList<>();

    /**
     * Search terms for USDA query (e.g., ["Salmon", "Fillet"])
     */
    @JsonProperty("search_terms")
    @Builder.Default
    private List<String> searchTerms = new ArrayList<>();

    /**
     * Visual attributes detected (e.g., ["skin-on", "sauce", "marbled"])
     */
    @JsonProperty("visual_attributes")
    @Builder.Default
    private List<String> visualAttributes = new ArrayList<>();

    /**
     * Estimated weight in grams (if AI can determine exact)
     */
    @JsonProperty("estimated_weight_g")
    private Integer estimatedWeightG;

    /**
     * Portion size (small/medium/large) when exact grams not provided
     */
    @JsonProperty("portion_size")
    private String portionSizeStr;

    /**
     * Food density category for accurate portion-to-gram conversion.
     * Categories: leafy_veg, carb_staple, meat_main, liquid_soup, fats_dressing,
     * mixed_dish, fruit, dairy, snack, beverage, generic
     */
    @JsonProperty("density_category")
    private String densityCategoryStr;

    /**
     * Proportion percentage for this ingredient in the meal (0-100)
     * Used when multiple ingredients are present
     */
    @JsonProperty("proportion_percentage")
    private Integer proportionPercentage;

    /**
     * Get cooking method as enum
     */
    public CookingMethod getCookingMethod() {
        return CookingMethod.fromString(cookingMethodStr);
    }

    /**
     * Set cooking method from enum
     */
    public void setCookingMethod(CookingMethod method) {
        this.cookingMethodStr = method != null ? method.getDisplayName() : null;
    }

    /**
     * Get portion size as enum
     */
    public PortionSize getPortionSize() {
        return PortionSize.fromString(portionSizeStr);
    }

    /**
     * Set portion size from enum
     */
    public void setPortionSize(PortionSize size) {
        this.portionSizeStr = size != null ? size.getDisplayName() : null;
    }

    /**
     * Get density category as enum
     */
    public FoodDensityCategory getDensityCategory() {
        return FoodDensityCategory.fromString(densityCategoryStr);
    }

    /**
     * Set density category from enum
     */
    public void setDensityCategory(FoodDensityCategory category) {
        this.densityCategoryStr = category != null ? category.getDisplayName() : null;
    }

    /**
     * Calculate grams using portion size and density category.
     * This is the primary method for getting accurate gram values.
     *
     * @return Calculated grams based on portion size and food category
     */
    public int calculateGramsFromPortion() {
        PortionSize portion = getPortionSize();
        FoodDensityCategory category = getDensityCategory();
        return portion.calculateGrams(category);
    }
}
