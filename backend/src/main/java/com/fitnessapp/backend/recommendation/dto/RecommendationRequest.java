package com.fitnessapp.backend.recommendation.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for generating personalized recommendations.
 *
 * Example:
 * {
 *   "userProfile": {
 *     "userId": 10086,
 *     "goals": ["BLOOD_SUGAR_CONTROL", "BUILD_MUSCLE"],
 *     "metrics": { "weightKg": 75.5, "heightCm": 180, "activityLevel": "MODERATE" },
 *     "preferences": { "excludedIngredients": ["peanuts"], "dietaryTag": "VEGETARIAN" }
 *   },
 *   "limit": 5
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequest {

    @NotNull(message = "userProfile is required")
    @Valid
    private UserProfile userProfile;

    @Min(value = 1, message = "limit must be at least 1")
    @Max(value = 20, message = "limit cannot exceed 20")
    @Builder.Default
    private int limit = 5;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfile {
        private Long userId;

        @NotNull(message = "goals is required")
        private List<String> goals;

        @Valid
        private Metrics metrics;

        @Valid
        private Preferences preferences;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metrics {
        @Min(value = 20, message = "weightKg must be at least 20")
        @Max(value = 300, message = "weightKg cannot exceed 300")
        private Double weightKg;

        @Min(value = 100, message = "heightCm must be at least 100")
        @Max(value = 250, message = "heightCm cannot exceed 250")
        private Integer heightCm;

        /**
         * Activity level: SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE
         */
        private String activityLevel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Preferences {
        private List<String> excludedIngredients;

        /**
         * Dietary tag: VEGETARIAN, VEGAN, KETO, PALEO, etc.
         */
        private String dietaryTag;
    }
}
