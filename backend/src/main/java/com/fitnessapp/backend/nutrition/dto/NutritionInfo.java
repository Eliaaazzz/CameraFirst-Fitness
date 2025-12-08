package com.fitnessapp.backend.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Nutrition information DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionInfo {
  private BigDecimal calories;
  private BigDecimal protein;
  private BigDecimal fat;
  private BigDecimal carbs;

  public static NutritionInfo zero() {
    return NutritionInfo.builder()
        .calories(BigDecimal.ZERO)
        .protein(BigDecimal.ZERO)
        .fat(BigDecimal.ZERO)
        .carbs(BigDecimal.ZERO)
        .build();
  }

  public void add(NutritionInfo other) {
    this.calories = this.calories.add(other.calories);
    this.protein = this.protein.add(other.protein);
    this.fat = this.fat.add(other.fat);
    this.carbs = this.carbs.add(other.carbs);
  }
}
