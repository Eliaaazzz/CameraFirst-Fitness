package com.fitnessapp.backend.recommendation.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for personalized recommendations.
 *
 * Wrapped in ApiResponse:
 * {
 *   "code": 200,
 *   "message": "success",
 *   "data": { RecommendationResponse },
 *   "timestamp": 1703666123
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponse {

    /**
     * Unique ID for tracking (analytics/埋点)
     */
    private String recommendationId;

    /**
     * AI-generated advice text explaining the recommendations
     */
    private String aiAdvice;

    /**
     * Recommended recipes matching user's goals
     */
    private List<RecipeRecommendation> recipes;

    /**
     * Recommended workouts matching user's goals
     */
    private List<WorkoutRecommendation> workouts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecipeRecommendation {
        private String id;
        private String title;
        private String imageUrl;
        private NutritionInfo nutrition;
        private List<String> tags;
        private Double matchScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NutritionInfo {
        private Integer calories;
        private Double protein;
        private Double sugar;
        private Double carbs;
        private Double fat;
        private Double fiber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkoutRecommendation {
        private String id;
        private String title;
        private String type;
        private Integer durationMin;
        private String difficulty;
        private String thumbnailUrl;
        private String videoUrl;
        private Double matchScore;
    }
}
