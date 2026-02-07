package com.fitnessapp.backend.recipe.repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Lightweight projection interface for recipe recommendations.
 *
 * MEMORY OPTIMIZATION:
 * - Full Recipe entity with embedding: ~6KB per row (vector(1536) = ~6KB)
 * - RecipeSummary projection: ~500 bytes per row
 * - Fetching 200 candidates: 1.2MB → 100KB (92% reduction)
 *
 * This projection excludes:
 * - embedding (float[1536]) - 6KB per row
 * - nutritionSummary (JSONB) - redundant, use generated columns
 * - steps (JSONB)
 * - swaps (JSONB)
 * - searchText
 * - embeddingGeneratedAt
 *
 * Designed for low-memory instances (~1GB RAM).
 */
public interface RecipeSummary {

    UUID getId();

    String getTitle();

    String getImageUrl();

    Integer getTimeMinutes();

    String getDifficulty();

    // Generated nutrition columns (computed from nutrition_summary)
    Integer getCalories();

    Double getProtein();

    Double getCarbs();

    Double getFat();

    Double getSugar();

    Double getFiber();

    // Target goal array for filtering
    List<String> getTargetGoal();

    // Ingredients for exclusion filtering
    Set<RecipeIngredientSummary> getIngredients();

    /**
     * Nested projection for recipe ingredients.
     * Only fetches the ingredient name needed for exclusion filtering.
     */
    interface RecipeIngredientSummary {
        IngredientSummary getIngredient();
    }

    interface IngredientSummary {
        String getName();
    }
}
