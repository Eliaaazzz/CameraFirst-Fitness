package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Nutrition calculation engine implementation using database lookup
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionEngineImpl implements NutritionEngine {

  private final NutritionLookupService nutritionLookupService;
  private static final BigDecimal HUNDRED = new BigDecimal("100");

  @Override
  public NutritionInfo calculateNutrition(String foodKey, int grams) {
    NutritionInfo per100g = nutritionLookupService.lookupNutrition(foodKey);
    BigDecimal factor = BigDecimal.valueOf(grams).divide(HUNDRED, 4, RoundingMode.HALF_UP);

    log.debug("Calculating nutrition for {} ({}g): factor={}", foodKey, grams, factor);

    return NutritionInfo.builder()
        .calories(scale(per100g.getCalories(), factor))
        .protein(scale(per100g.getProtein(), factor))
        .fat(scale(per100g.getFat(), factor))
        .carbs(scale(per100g.getCarbs(), factor))
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

  private Double scale(Double per100, BigDecimal factor) {
    if (per100 == null) {
      return 0.0;
    }
    return BigDecimal.valueOf(per100)
        .multiply(factor)
        .setScale(2, RoundingMode.HALF_UP)
        .doubleValue();
  }

  private double roundToTwo(double value) {
    return Math.round(value * 100.0) / 100.0;
  }
}

