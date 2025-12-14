package com.fitnessapp.backend.nutrition.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
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
     * Estimated weight in grams
     */
    @JsonProperty("estimated_weight_g")
    private Integer estimatedWeightG;
    
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
}
