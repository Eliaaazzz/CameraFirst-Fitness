package com.fitnessapp.backend.nutrition.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a food item recognized from image by AI Vision
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognizedFood {
  @JsonProperty("food_key")
  private String foodKey;

  @JsonProperty("display_name")
  private String displayName;

  @JsonProperty("estimated_grams")
  private Integer estimatedGrams;

  @JsonProperty("cooking_method")
  private String cookingMethod;

  private Double confidence;

  // Structured metadata for RAG pipeline (optional, for enhanced search)
  private FoodMetadata metadata;

  // Nutrition info will be calculated by NutritionEngine
  private NutritionInfo nutrition;
}
