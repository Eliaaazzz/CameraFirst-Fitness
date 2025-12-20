package com.fitnessapp.backend.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

/**
 * Request DTO for getting personalized recommendations.
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationRequest {

    /**
     * Maximum number of recommendations to return
     */
    @Builder.Default
    Integer limit = 10;

    /**
     * Maximum preparation/cooking time in minutes (for recipes)
     */
    Integer maxTime;

    /**
     * Difficulty filter (easy, medium, hard)
     */
    String difficulty;

    /**
     * Category filter (e.g., "breakfast", "lunch", "dinner" for recipes,
     * "Chest", "Back", "Legs" for workouts)
     */
    String category;

    /**
     * Goal type override (if user wants recommendations for a specific goal
     * instead of their active goal)
     */
    String goalType;

    public int getLimit() {
        return limit != null ? limit : 10;
    }
}
