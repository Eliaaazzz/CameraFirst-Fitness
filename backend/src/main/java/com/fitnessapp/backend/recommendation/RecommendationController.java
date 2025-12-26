package com.fitnessapp.backend.recommendation;

import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.recommendation.dto.ApiResponse;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller for personalized content recommendations.
 *
 * Endpoints:
 * - POST /api/v1/recommendations/generate - Generate personalized recommendations
 *
 * Uses hybrid search (SQL hard filters + pgvector semantic search) to provide
 * recommendations based on user's fitness goals.
 */
@RestController
@RequestMapping(path = "/api/v1/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Validated
@Slf4j
public class RecommendationController {

    private final ContentRecommendationService recommendationService;

    /**
     * Generate personalized recommendations based on user profile and goals.
     *
     * Request body example:
     * {
     *   "userProfile": {
     *     "userId": 10086,
     *     "goals": ["BLOOD_SUGAR_CONTROL", "BUILD_MUSCLE"],
     *     "metrics": { "weightKg": 75.5, "heightCm": 180, "activityLevel": "MODERATE" },
     *     "preferences": { "excludedIngredients": ["peanuts"], "dietaryTag": "VEGETARIAN" }
     *   },
     *   "limit": 5
     * }
     *
     * @param request The recommendation request with user profile
     * @return ApiResponse containing RecommendationResponse with recipes and workouts
     */
    @PostMapping("/generate")
    public ApiResponse<RecommendationResponse> generateRecommendations(
            @Valid @RequestBody RecommendationRequest request) {
        log.info("POST /api/v1/recommendations/generate - goals: {}, limit: {}",
                request.getUserProfile().getGoals(), request.getLimit());

        try {
            RecommendationResponse response = recommendationService.generateRecommendations(request);
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("Recommendation generation failed", e);
            return ApiResponse.error(ApiResponse.AI_SERVICE_ERROR,
                    "推荐算法服务异常，请稍后重试");
        }
    }
}
