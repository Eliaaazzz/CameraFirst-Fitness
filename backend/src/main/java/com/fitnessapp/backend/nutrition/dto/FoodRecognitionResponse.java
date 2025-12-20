package com.fitnessapp.backend.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response for POST /api/v1/nutrition/analyze endpoint
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodRecognitionResponse {
  private List<RecognizedFood> items;
  private NutritionInfo totalNutrition;
  private String suggestedMealType;
  private String imageUrl;
}
