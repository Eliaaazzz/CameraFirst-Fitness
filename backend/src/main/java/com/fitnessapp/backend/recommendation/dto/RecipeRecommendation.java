package com.fitnessapp.backend.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.util.List;
import java.util.Map;

/**
 * DTO for a recipe recommendation with match score and reasons.
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeRecommendation {

    /**
     * Recipe ID
     */
    String id;

    /**
     * Recipe title
     */
    String title;

    /**
     * Image URL
     */
    String imageUrl;

    /**
     * Preparation/cooking time in minutes
     */
    Integer timeMinutes;

    /**
     * Difficulty level (easy, medium, hard)
     */
    String difficulty;

    /**
     * Nutrition information: calories, protein, carbs, fat, fiber, sugar
     */
    Map<String, Object> nutrition;

    /**
     * List of ingredient names
     */
    List<String> ingredients;

    /**
     * Match score (0.0 to 1.0) indicating how well this recipe matches user's goals
     */
    Double matchScore;

    /**
     * Human-readable reasons for why this recipe matches user's goals
     */
    List<String> matchReasons;
}
