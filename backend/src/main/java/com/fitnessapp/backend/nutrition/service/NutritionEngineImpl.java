package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.enums.PortionSize;
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

    BigDecimal carbs = scale(per100g.getCarbs(), factor);
    BigDecimal fiber = scale(per100g.getFiber(), factor);
    BigDecimal sugar = scale(per100g.getSugar(), factor);

    return NutritionInfo.builder()
        .calories(scale(per100g.getCalories(), factor))
        .protein(scale(per100g.getProtein(), factor))
        .fat(scale(per100g.getFat(), factor))
        .carbs(carbs)
        .fiber(fiber)
        .sugar(sugar)
        .netCarbs(calculateNetCarbs(carbs, fiber))
        .sugarCubes(calculateSugarCubes(sugar))
        .build();
  }

  @Override
  public void enrichWithNutrition(RecognizedFood food) {
    // Determine grams from metadata or estimated grams
    Integer grams = determineGrams(food);
    
    if (grams == null || grams <= 0) {
      log.warn("Unable to determine valid grams for food {}, using medium portion (250g)", food.getFoodKey());
      grams = PortionSize.MEDIUM.calculateGrams(); // Fallback to medium portion
    }
    
    food.setEstimatedGrams(grams);

    NutritionInfo nutrition;
    
    // Use metadata-based lookup if available (RAG pipeline)
    if (hasValidMetadata(food.getMetadata())) {
      log.debug("Using metadata-based lookup for food: {}", food.getFoodKey());
      nutrition = nutritionLookupService.lookupNutritionWithMetadata(food.getMetadata());
    } else {
      // Fall back to traditional key-based lookup
      log.debug("Using traditional key-based lookup for food: {}", food.getFoodKey());
      nutrition = calculateNutrition(food.getFoodKey(), food.getEstimatedGrams());
      food.setNutrition(nutrition);
      log.info("Enriched food {} ({}g) with nutrition: {} cal, {}g protein, {} sugar cubes",
          food.getFoodKey(), food.getEstimatedGrams(),
          nutrition.getCalories(), nutrition.getProtein(), nutrition.getSugarCubes());
      return;
    }

    // Scale nutrition based on actual grams
    BigDecimal factor = BigDecimal.valueOf(food.getEstimatedGrams()).divide(HUNDRED, 4, RoundingMode.HALF_UP);
    BigDecimal carbs = scale(nutrition.getCarbs(), factor);
    BigDecimal fiber = scale(nutrition.getFiber(), factor);
    BigDecimal sugar = scale(nutrition.getSugar(), factor);

    nutrition = NutritionInfo.builder()
        .calories(scale(nutrition.getCalories(), factor))
        .protein(scale(nutrition.getProtein(), factor))
        .fat(scale(nutrition.getFat(), factor))
        .carbs(carbs)
        .fiber(fiber)
        .sugar(sugar)
        .netCarbs(calculateNetCarbs(carbs, fiber))
        .sugarCubes(calculateSugarCubes(sugar))
        .build();

    food.setNutrition(nutrition);

    log.info("Enriched food {} ({}g) with nutrition: {} cal, {}g protein, {} sugar cubes",
        food.getFoodKey(), food.getEstimatedGrams(),
        nutrition.getCalories(), nutrition.getProtein(), nutrition.getSugarCubes());
  }

  /**
   * Determine grams from metadata or estimated grams.
   * Priority: 
   * 1. Metadata estimated_weight_g (if present)
   * 2. Metadata portion_size (small/medium/large)
   * 3. RecognizedFood estimated_grams
   * 
   * @param food The recognized food
   * @return Grams to use, or null if cannot be determined
   */
  private Integer determineGrams(RecognizedFood food) {
    FoodMetadata metadata = food.getMetadata();
    
    // Priority 1: Metadata has exact weight
    if (metadata != null && metadata.getEstimatedWeightG() != null && metadata.getEstimatedWeightG() > 0) {
      log.debug("Using metadata estimated weight: {}g", metadata.getEstimatedWeightG());
      return metadata.getEstimatedWeightG();
    }
    
    // Priority 2: Metadata has portion size
    if (metadata != null && metadata.getPortionSizeStr() != null) {
      int portionGrams = metadata.getPortionSize().calculateGrams();
      log.debug("Using portion size {} : {}g", metadata.getPortionSize(), portionGrams);
      return portionGrams;
    }
    
    // Priority 3: RecognizedFood has estimated grams
    if (food.getEstimatedGrams() != null && food.getEstimatedGrams() > 0) {
      log.debug("Using RecognizedFood estimated grams: {}g", food.getEstimatedGrams());
      return food.getEstimatedGrams();
    }
    
    return null;
  }

  /**
   * Check if metadata is valid and has search terms for RAG pipeline
   */
  private boolean hasValidMetadata(FoodMetadata metadata) {
    return metadata != null && 
           metadata.getSearchTerms() != null && 
           !metadata.getSearchTerms().isEmpty();
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

  private BigDecimal scale(BigDecimal per100, BigDecimal factor) {
    if (per100 == null) {
      return BigDecimal.ZERO;
    }
    return per100
        .multiply(factor)
        .setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal roundToTwo(BigDecimal value) {
    if (value == null) {
      return BigDecimal.ZERO;
    }
    return value.setScale(2, RoundingMode.HALF_UP);
  }
}

