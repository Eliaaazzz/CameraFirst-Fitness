package com.fitnessapp.backend.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nutrition information DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionInfo {
  private Double calories;
  private Double protein;
  private Double fat;
  private Double carbs;

  public static NutritionInfo zero() {
    return NutritionInfo.builder()
        .calories(0.0)
        .protein(0.0)
        .fat(0.0)
        .carbs(0.0)
        .build();
  }

  public void add(NutritionInfo other) {
    this.calories += other.calories;
    this.protein += other.protein;
    this.fat += other.fat;
    this.carbs += other.carbs;
  }
}
