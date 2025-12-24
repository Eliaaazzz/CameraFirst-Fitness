package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeCard implements Serializable {
    private static final long serialVersionUID = 1L;
    String id;
    String title;
    Integer timeMinutes;
    String difficulty;
    String imageUrl;
    List<RecipeStep> steps;

    /**
     * Nutrition information - ALWAYS included for user display
     * Contains: calories, protein, carbs, fat, fiber, sugar, sodium, servings
     */
    Map<String, Object> nutrition;

    /**
     * List of ingredient names (for display)
     */
    List<String> ingredients;

    /**
     * Similarity score from vector search (0.0 - 1.0).
     * Only populated when using semantic recommendations.
     */
    Double similarityScore;
}
