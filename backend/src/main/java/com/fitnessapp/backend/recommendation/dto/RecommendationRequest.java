package com.fitnessapp.backend.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for getting personalized recommendations.
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecommendationRequest {

    /**
     * User profile information for personalized recommendations
     */
    @Valid
    @NotNull(message = "userProfile is required")
    UserProfileInput userProfile;

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

    /**
     * Nested user profile input for recommendation requests.
     */
    @Value
    @Builder
    @Jacksonized
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class UserProfileInput {

        // Optional / ignored: the server derives the user id from the authenticated principal
        // (see RecommendationController). Kept for backwards-compatible request bodies.
        UUID userId;

        /**
         * User's fitness goals (e.g., BLOOD_SUGAR_CONTROL, BUILD_MUSCLE, FAT_LOSS)
         */
        List<String> goals;

        /**
         * Ingredients to exclude from recipe recommendations
         */
        List<String> excludedIngredients;
    }
}
