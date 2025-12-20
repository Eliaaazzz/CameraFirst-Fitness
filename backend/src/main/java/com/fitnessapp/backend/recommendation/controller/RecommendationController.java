package com.fitnessapp.backend.recommendation.controller;

import com.fitnessapp.backend.recommendation.dto.RecipeRecommendation;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.WorkoutRecommendation;
import com.fitnessapp.backend.recommendation.service.RecipeRecommendationService;
import com.fitnessapp.backend.recommendation.service.WorkoutRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for content-based recommendations.
 * Provides personalized recipe and workout recommendations based on user goals.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "Content-based personalized recommendations for recipes and workouts")
public class RecommendationController {

    private final RecipeRecommendationService recipeRecommendationService;
    private final WorkoutRecommendationService workoutRecommendationService;

    /**
     * Get personalized recipe recommendations based on user's active goal.
     */
    @Operation(
            summary = "Get recipe recommendations",
            description = "Returns recipes that match the user's nutritional goals. " +
                    "Recipes are scored based on how well they fit the user's calorie and macro targets."
    )
    @GetMapping("/recipes")
    public ResponseEntity<RecommendationResponse<RecipeRecommendation>> getRecipeRecommendations(
            @Parameter(description = "User ID", required = true)
            @RequestParam UUID userId,

            @Parameter(description = "Maximum number of recommendations (default: 10)")
            @RequestParam(defaultValue = "10") Integer limit,

            @Parameter(description = "Maximum preparation time in minutes")
            @RequestParam(required = false) Integer maxTime,

            @Parameter(description = "Difficulty filter: easy, medium, hard")
            @RequestParam(required = false) String difficulty,

            @Parameter(description = "Category filter (e.g., breakfast, lunch, dinner)")
            @RequestParam(required = false) String category
    ) {
        log.info("Getting recipe recommendations for user: {}, limit: {}", userId, limit);

        RecommendationRequest request = RecommendationRequest.builder()
                .limit(limit)
                .maxTime(maxTime)
                .difficulty(difficulty)
                .category(category)
                .build();

        List<RecipeRecommendation> recommendations = recipeRecommendationService.getRecommendations(userId, request);

        log.info("Returning {} recipe recommendations for user: {}", recommendations.size(), userId);
        return ResponseEntity.ok(new RecommendationResponse<>(
                "recipes",
                recommendations.size(),
                recommendations
        ));
    }

    /**
     * Get personalized workout recommendations based on user's active goal.
     */
    @Operation(
            summary = "Get workout recommendations",
            description = "Returns workout videos that match the user's fitness goals. " +
                    "Workouts are scored based on goal type (fat loss, muscle gain, etc.) and activity plan."
    )
    @GetMapping("/workouts")
    public ResponseEntity<RecommendationResponse<WorkoutRecommendation>> getWorkoutRecommendations(
            @Parameter(description = "User ID", required = true)
            @RequestParam UUID userId,

            @Parameter(description = "Maximum number of recommendations (default: 10)")
            @RequestParam(defaultValue = "10") Integer limit,

            @Parameter(description = "Body part/category filter (e.g., Chest, Back, Legs, Core)")
            @RequestParam(required = false) String category
    ) {
        log.info("Getting workout recommendations for user: {}, limit: {}, category: {}", userId, limit, category);

        RecommendationRequest request = RecommendationRequest.builder()
                .limit(limit)
                .category(category)
                .build();

        List<WorkoutRecommendation> recommendations = workoutRecommendationService.getRecommendations(userId, request);

        log.info("Returning {} workout recommendations for user: {}", recommendations.size(), userId);
        return ResponseEntity.ok(new RecommendationResponse<>(
                "workouts",
                recommendations.size(),
                recommendations
        ));
    }

    /**
     * Get workout recommendations for a specific body part.
     */
    @Operation(
            summary = "Get workouts by body part",
            description = "Returns workout videos targeting a specific body part, personalized to user's goals."
    )
    @GetMapping("/workouts/body-part/{bodyPart}")
    public ResponseEntity<RecommendationResponse<WorkoutRecommendation>> getWorkoutsByBodyPart(
            @Parameter(description = "User ID", required = true)
            @RequestParam UUID userId,

            @Parameter(description = "Target body part (e.g., Chest, Back, Legs, Core, Arms, Shoulders)")
            @PathVariable String bodyPart,

            @Parameter(description = "Maximum number of recommendations (default: 8)")
            @RequestParam(defaultValue = "8") Integer limit
    ) {
        log.info("Getting {} workout recommendations for user: {}", bodyPart, userId);

        List<WorkoutRecommendation> recommendations =
                workoutRecommendationService.getRecommendationsByCategory(userId, bodyPart, limit);

        return ResponseEntity.ok(new RecommendationResponse<>(
                "workouts",
                recommendations.size(),
                recommendations
        ));
    }

    /**
     * Get combined recommendations (both recipes and workouts).
     */
    @Operation(
            summary = "Get combined recommendations",
            description = "Returns both recipe and workout recommendations in a single response."
    )
    @GetMapping("/combined")
    public ResponseEntity<CombinedRecommendationResponse> getCombinedRecommendations(
            @Parameter(description = "User ID", required = true)
            @RequestParam UUID userId,

            @Parameter(description = "Number of recipe recommendations (default: 5)")
            @RequestParam(defaultValue = "5") Integer recipeLimit,

            @Parameter(description = "Number of workout recommendations (default: 5)")
            @RequestParam(defaultValue = "5") Integer workoutLimit
    ) {
        log.info("Getting combined recommendations for user: {}", userId);

        RecommendationRequest recipeRequest = RecommendationRequest.builder()
                .limit(recipeLimit)
                .build();
        RecommendationRequest workoutRequest = RecommendationRequest.builder()
                .limit(workoutLimit)
                .build();

        List<RecipeRecommendation> recipes = recipeRecommendationService.getRecommendations(userId, recipeRequest);
        List<WorkoutRecommendation> workouts = workoutRecommendationService.getRecommendations(userId, workoutRequest);

        return ResponseEntity.ok(new CombinedRecommendationResponse(recipes, workouts));
    }

    /**
     * Generic response wrapper for recommendations.
     */
    public record RecommendationResponse<T>(
            String type,
            int count,
            List<T> recommendations
    ) {}

    /**
     * Combined response with both recipes and workouts.
     */
    public record CombinedRecommendationResponse(
            List<RecipeRecommendation> recipes,
            List<WorkoutRecommendation> workouts
    ) {}
}
