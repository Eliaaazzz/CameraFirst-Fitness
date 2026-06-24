package com.fitnessapp.backend.recommendation.hybrid;

import java.util.List;

/**
 * A recipe recommended by the hybrid recommender.
 *
 * @param signals which signals surfaced it: "content" (pgvector similarity), "social" (saved by people
 *                you follow), or both
 */
public record HybridRecipe(
        String id,
        String title,
        Double similarityScore,
        double rrfScore,
        List<String> signals) {
}
