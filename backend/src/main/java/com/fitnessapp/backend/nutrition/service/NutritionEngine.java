package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;

import java.util.List;

/**
 * Nutrition calculation engine interface
 */
public interface NutritionEngine {

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
}
