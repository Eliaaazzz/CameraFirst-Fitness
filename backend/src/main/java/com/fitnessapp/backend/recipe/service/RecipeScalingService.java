package com.fitnessapp.backend.recipe.service;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for scaling recipes based on serving size adjustments
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeScalingService {

    private final RecipeRepository recipeRepository;

    /**
     * Scale a recipe to a different serving size
     */
    @Transactional(readOnly = true)
    public ScaledRecipe scaleRecipe(UUID recipeId, int targetServings) {
        Recipe recipe = recipeRepository.findByIdWithIngredients(recipeId)
                .orElseThrow(() -> new EntityNotFoundException("Recipe not found: " + recipeId));

        // Default to 2 servings (standard for most recipes)
        int originalServings = 2;

        if (targetServings <= 0) {
            throw new IllegalArgumentException("Target servings must be greater than 0");
        }

        double scalingFactor = (double) targetServings / originalServings;
        log.info("Scaling recipe {} from {} to {} servings (factor: {})",
                recipe.getTitle(), originalServings, targetServings, scalingFactor);

        // Scale ingredients
        List<ScaledIngredient> scaledIngredients = recipe.getIngredients().stream()
                .map(ri -> scaleIngredient(ri, scalingFactor))
                .collect(Collectors.toList());

        // Scale nutrition information
        Map<String, Object> scaledNutrition = scaleNutrition(recipe.getNutritionSummary(), scalingFactor);

        return new ScaledRecipe(
                recipe.getId(),
                recipe.getTitle(),
                null, // description not in Recipe entity
                originalServings,
                targetServings,
                scalingFactor,
                scaledIngredients,
                recipe.getSteps() != null ? recipe.getSteps().toString() : null,
                recipe.getTimeMinutes(),
                recipe.getDifficulty(),
                scaledNutrition,
                recipe.getImageUrl()
        );
    }

    /**
     * Calculate ingredient quantity for a specific number of servings
     */
    public double calculateScaledQuantity(double originalQuantity, int originalServings, int targetServings) {
        if (originalServings <= 0 || targetServings <= 0) {
            throw new IllegalArgumentException("Servings must be greater than 0");
        }
        double scalingFactor = (double) targetServings / originalServings;
        return originalQuantity * scalingFactor;
    }

    /**
     * Scale a single ingredient
     */
    private ScaledIngredient scaleIngredient(RecipeIngredient ingredient, double scalingFactor) {
        BigDecimal originalQuantity = ingredient.getQuantity();
        BigDecimal scaledQuantity = null;
        String displayQuantity = null;

        if (originalQuantity != null) {
            scaledQuantity = originalQuantity.multiply(BigDecimal.valueOf(scalingFactor))
                    .setScale(2, RoundingMode.HALF_UP);
            displayQuantity = formatQuantity(scaledQuantity);
        }

        return new ScaledIngredient(
                ingredient.getIngredient() != null ? ingredient.getIngredient().getName() : "Unknown",
                originalQuantity != null ? originalQuantity.doubleValue() : null,
                scaledQuantity != null ? scaledQuantity.doubleValue() : null,
                displayQuantity,
                ingredient.getUnit()
        );
    }

    /**
     * Format quantity with nice fractions for common values
     */
    private String formatQuantity(BigDecimal quantity) {
        if (quantity == null) {
            return null;
        }

        double value = quantity.doubleValue();

        // Handle whole numbers
        if (value == Math.floor(value)) {
            return String.valueOf((int) value);
        }

        // Handle common fractions
        int whole = (int) Math.floor(value);
        double fraction = value - whole;

        String fractionStr = formatFraction(fraction);
        if (fractionStr != null) {
            return whole > 0 ? whole + " " + fractionStr : fractionStr;
        }

        // Default decimal formatting
        return quantity.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    /**
     * Format common fractions nicely
     */
    private String formatFraction(double fraction) {
        final double TOLERANCE = 0.01;

        if (Math.abs(fraction - 0.25) < TOLERANCE) return "1/4";
        if (Math.abs(fraction - 0.33) < TOLERANCE) return "1/3";
        if (Math.abs(fraction - 0.5) < TOLERANCE) return "1/2";
        if (Math.abs(fraction - 0.67) < TOLERANCE) return "2/3";
        if (Math.abs(fraction - 0.75) < TOLERANCE) return "3/4";

        return null;
    }

    /**
     * Scale nutrition information
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> scaleNutrition(Object nutritionObj, double scalingFactor) {
        if (!(nutritionObj instanceof Map)) {
            return Map.of();
        }

        Map<String, Object> nutrition = (Map<String, Object>) nutritionObj;
        return nutrition.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> scaleNutritionValue(entry.getValue(), scalingFactor)
                ));
    }

    /**
     * Scale individual nutrition value
     */
    private Object scaleNutritionValue(Object value, double scalingFactor) {
        if (value instanceof Number) {
            double scaled = ((Number) value).doubleValue() * scalingFactor;
            // Round to 1 decimal place for nutrition values
            return Math.round(scaled * 10.0) / 10.0;
        }
        return value;
    }

    // ============================================================================
    // DTOs
    // ============================================================================

    public record ScaledRecipe(
            UUID id,
            String title,
            String description,
            int originalServings,
            int targetServings,
            double scalingFactor,
            List<ScaledIngredient> ingredients,
            String instructions,
            Integer timeMinutes,
            String difficulty,
            Map<String, Object> nutrition,
            String imageUrl
    ) {}

    public record ScaledIngredient(
            String name,
            Double originalQuantity,
            Double scaledQuantity,
            String displayQuantity,
            String unit
    ) {
        public String getFormattedText() {
            StringBuilder sb = new StringBuilder();
            if (displayQuantity != null) {
                sb.append(displayQuantity);
                if (unit != null && !unit.isBlank()) {
                    sb.append(" ").append(unit);
                }
                sb.append(" ");
            }
            sb.append(name);
            return sb.toString();
        }
    }
}
