package com.fitnessapp.backend.recommendation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for personalized content recommendations.
 * Provides dashboard recommendations based on user's fitness goal.
 */
@RestController
@RequestMapping(path = "/api/v1/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Slf4j
public class RecommendationController {

    private final DashboardRecommendationService recommendationService;

    /**
     * Get personalized dashboard recommendations based on fitness goal.
     * Returns top 5 workout videos and top 5 healthy recipes matching the goal.
     *
     * @param goal The user's fitness goal (e.g., "LOSE_WEIGHT", "GAIN_MUSCLE", "MAINTAIN", "STRENGTH",
     *             or variants like "fat_loss", "build_muscle", "blood_sugar")
     * @return DashboardRecommendationResponse with workouts and recipes
     *
     * Example: GET /api/v1/recommendations/dashboard?goal=GAIN_MUSCLE
     */
    @GetMapping("/dashboard")
    public DashboardRecommendationResponse getDashboardRecommendations(
            @RequestParam(name = "goal", defaultValue = "MAINTAIN") String goal) {
        log.info("GET /api/v1/recommendations/dashboard - goal: {}", goal);
        return recommendationService.getRecommendations(goal);
    }
}
