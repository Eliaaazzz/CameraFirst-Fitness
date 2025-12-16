package com.fitnessapp.backend.nutrition.service.core;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;

import java.math.BigDecimal;
import java.util.List;

/**
 * Nutrition calculation engine interface
 */
public interface NutritionEngine {

  /** 1 sugar cube = 4 grams of sugar */
  BigDecimal SUGAR_CUBE_GRAMS = new BigDecimal("4.0");

  /**
   * Calculate nutrition for a single food item based on food_key and grams
   *
   * @param foodKey the food identifier (e.g., "steamed_rice")
   * @param grams weight in grams
   * @return nutrition info
   */
  NutritionInfo calculateNutrition(String foodKey, int grams);

  /**
   * Calculate nutrition for a recognized food item (modifies the item in place)
   *
   * @param food recognized food item
   */
  void enrichWithNutrition(RecognizedFood food);

  /**
   * Calculate total nutrition from a list of recognized foods
   *
   * @param foods list of recognized foods
   * @return total nutrition
   */
  NutritionInfo calculateTotal(List<RecognizedFood> foods);

  /**
   * Calculate sugar cubes equivalent (for PREVENTION mode visualization)
   * 1 sugar cube = 4g sugar
   */
  default BigDecimal calculateSugarCubes(BigDecimal sugarGrams) {
    if (sugarGrams == null) return BigDecimal.ZERO;
    return sugarGrams.divide(SUGAR_CUBE_GRAMS, 1, java.math.RoundingMode.HALF_UP);
  }

  /**
   * Calculate net carbs (for DIABETES mode)
   * Net carbs = total carbs - fiber
   */
  default BigDecimal calculateNetCarbs(BigDecimal carbs, BigDecimal fiber) {
    BigDecimal c = carbs != null ? carbs : BigDecimal.ZERO;
    BigDecimal f = fiber != null ? fiber : BigDecimal.ZERO;
    BigDecimal net = c.subtract(f);
    return net.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : net;
  }
}
