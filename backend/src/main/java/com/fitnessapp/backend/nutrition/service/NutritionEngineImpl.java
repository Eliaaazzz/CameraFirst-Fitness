package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Nutrition calculation engine implementation with hardcoded food database
 */
@Slf4j
@Service
public class NutritionEngineImpl implements NutritionEngine {

  // Nutrition data per 100g
  private static final Map<String, NutritionInfo> NUTRITION_DATABASE = new HashMap<>();

  static {
    // Rice and grains
    NUTRITION_DATABASE.put("steamed_rice", NutritionInfo.builder()
        .calories(116.0).protein(2.6).fat(0.3).carbs(25.6).build());
    NUTRITION_DATABASE.put("fried_rice", NutritionInfo.builder()
        .calories(186.0).protein(4.8).fat(7.2).carbs(26.5).build());
    NUTRITION_DATABASE.put("noodles", NutritionInfo.builder()
        .calories(137.0).protein(4.5).fat(0.6).carbs(28.5).build());

    // Meat
    NUTRITION_DATABASE.put("braised_pork", NutritionInfo.builder()
        .calories(340.0).protein(14.0).fat(28.0).carbs(5.0).build());
    NUTRITION_DATABASE.put("chicken_breast", NutritionInfo.builder()
        .calories(133.0).protein(28.0).fat(2.0).carbs(0.0).build());
    NUTRITION_DATABASE.put("beef", NutritionInfo.builder()
        .calories(125.0).protein(20.0).fat(4.5).carbs(0.0).build());
    NUTRITION_DATABASE.put("beef_stir_fry", NutritionInfo.builder()
        .calories(180.0).protein(18.0).fat(10.0).carbs(3.0).build());

    // Eggs
    NUTRITION_DATABASE.put("boiled_egg", NutritionInfo.builder()
        .calories(155.0).protein(12.6).fat(10.6).carbs(1.1).build());
    NUTRITION_DATABASE.put("fried_egg", NutritionInfo.builder()
        .calories(196.0).protein(13.6).fat(15.3).carbs(1.1).build());
    NUTRITION_DATABASE.put("scrambled_egg", NutritionInfo.builder()
        .calories(168.0).protein(11.0).fat(12.2).carbs(2.2).build());

    // Vegetables and mixed dishes
    NUTRITION_DATABASE.put("stir_fried_vegetables", NutritionInfo.builder()
        .calories(38.0).protein(2.3).fat(2.1).carbs(3.2).build());
    NUTRITION_DATABASE.put("tomato_egg", NutritionInfo.builder()
        .calories(95.0).protein(6.0).fat(6.5).carbs(4.5).build());

    // Tofu
    NUTRITION_DATABASE.put("tofu", NutritionInfo.builder()
        .calories(76.0).protein(8.1).fat(3.7).carbs(4.2).build());

    // Default fallback
    NUTRITION_DATABASE.put("unknown", NutritionInfo.builder()
        .calories(150.0).protein(8.0).fat(6.0).carbs(15.0).build());
  }

  @Override
  public NutritionInfo calculateNutrition(String foodKey, int grams) {
    NutritionInfo per100g = NUTRITION_DATABASE.getOrDefault(
        foodKey.toLowerCase(),
        NUTRITION_DATABASE.get("unknown")
    );

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
