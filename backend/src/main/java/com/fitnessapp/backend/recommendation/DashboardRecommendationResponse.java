package com.fitnessapp.backend.recommendation;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;
import java.io.Serializable;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

/**
 * Response DTO for dashboard recommendations based on user's fitness goal.
 * Contains top 5 workouts and top 5 recipes matching the user's goal.
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardRecommendationResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    /**
     * The fitness goal used for recommendations (e.g., LOSE_WEIGHT, GAIN_MUSCLE)
     */
    String fitnessGoal;

    /**
     * Display label for the fitness goal
     */
    String goalLabel;

    /**
     * Top 5 workout videos matching the fitness goal
     */
    List<WorkoutCard> workouts;

    /**
     * Top 5 healthy recipes matching the fitness goal
     */
    List<RecipeCard> recipes;

    /**
     * Response latency in milliseconds
     */
    int latencyMs;

    /**
     * Search mode used: "vector" for semantic search, "tag-based" for simple matching
     */
    String searchMode;
}
