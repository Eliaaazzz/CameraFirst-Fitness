package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Nutrition calculation engine implementation using database lookup
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionEngineImpl implements NutritionEngine {

  private final NutritionLookupService nutritionLookupService;

  @Override
  public NutritionInfo calculateNutrition(String foodKey, int grams) {
    // Use database lookup with fuzzy matching support
    NutritionInfo per100g = nutritionLookupService.lookupNutrition(foodKey);

    double factor = grams / 100.0;

    log.debug("Calculating nutrition for {} ({}g): factor={}", foodKey, grams, factor);

    return NutritionInfo.builder()
        .calories(roundToTwo(per100g.getCalories() * factor))
        .protein(roundToTwo(per100g.getProtein() * factor))
        .fat(roundToTwo(per100g.getFat() * factor))
        .carbs(roundToTwo(per100g.getCarbs() * factor))
        .build();
  }

  @Override
  public void enrichWithNutrition(RecognizedFood food) {
    if (food.getEstimatedGrams() == null || food.getEstimatedGrams() <= 0) {
      log.warn("Invalid grams for food {}: {}", food.getFoodKey(), food.getEstimatedGrams());
      food.setEstimatedGrams(100); // Default to 100g
    }

    NutritionInfo nutrition = calculateNutrition(food.getFoodKey(), food.getEstimatedGrams());
    food.setNutrition(nutrition);

    log.info("Enriched food {} ({}g) with nutrition: {} cal, {}g protein",
        food.getFoodKey(), food.getEstimatedGrams(),
        nutrition.getCalories(), nutrition.getProtein());
  }

  @Override
  public NutritionInfo calculateTotal(List<RecognizedFood> foods) {
    NutritionInfo total = NutritionInfo.zero();

    for (RecognizedFood food : foods) {
      if (food.getNutrition() == null) {
        enrichWithNutrition(food);
      }
      total.add(food.getNutrition());
    }

    // Round totals
    total.setCalories(roundToTwo(total.getCalories()));
    total.setProtein(roundToTwo(total.getProtein()));
    total.setFat(roundToTwo(total.getFat()));
    total.setCarbs(roundToTwo(total.getCarbs()));

    log.info("Calculated total nutrition from {} foods: {} cal, {}g protein, {}g fat, {}g carbs",
        foods.size(), total.getCalories(), total.getProtein(), total.getFat(), total.getCarbs());

    return total;
  }

  private double roundToTwo(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}
