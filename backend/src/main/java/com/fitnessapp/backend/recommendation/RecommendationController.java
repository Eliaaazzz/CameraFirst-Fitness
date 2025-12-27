package com.fitnessapp.backend.recommendation;

import com.fitnessapp.backend.api.common.ApiEnvelope;
import com.fitnessapp.backend.api.common.ErrorCode;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse;
import com.fitnessapp.backend.recommendation.exception.RecommendationException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for personalized content recommendations.
 *
 * <p>Provides AI-powered recommendations for recipes and workouts based on
 * user fitness goals using hybrid search (SQL filters + vector similarity).
 *
 * @see ContentRecommendationService
 */
@RestController
@RequestMapping(path = "/api/v1/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Recommendations", description = "Personalized content recommendation APIs")
public class RecommendationController {

    private final ContentRecommendationService recommendationService;
    private final DashboardRecommendationService dashboardRecommendationService;

    /**
     * Generate personalized recommendations based on user profile and goals.
     *
     * <p>Uses hybrid search combining:
     * <ul>
     *   <li>SQL hard filters (dietary restrictions, nutritional constraints)</li>
     *   <li>pgvector semantic search (goal-based similarity ranking)</li>
     * </ul>
     *
     * @param request The recommendation request with user profile and preferences
     * @return ApiEnvelope containing recipes and workout recommendations
     */
    @Operation(
            summary = "Generate personalized recommendations",
            description = """
                    Generates AI-powered recommendations for recipes and workouts based on user's
                    fitness goals, body metrics, and dietary preferences.

                    **Supported Goals:**
                    - BLOOD_SUGAR_CONTROL
                    - BUILD_MUSCLE
                    - FAT_LOSS
                    - GENERAL_FITNESS

                    **Activity Levels:**
                    - SEDENTARY
                    - LIGHT
                    - MODERATE
                    - ACTIVE
                    - VERY_ACTIVE
                    """
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Recommendations generated successfully",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = RecommendationResponse.class),
                            examples = @ExampleObject(
                                    name = "Success Response",
                                    value = """
                                            {
                                              "success": true,
                                              "code": 200,
                                              "message": "Success",
                                              "data": {
                                                "recommendationId": "rec_abc123",
                                                "aiAdvice": "Based on your blood sugar control goal...",
                                                "recipes": [
                                                  {
                                                    "id": "1",
                                                    "title": "Grilled Salmon with Vegetables",
                                                    "imageUrl": "https://...",
                                                    "nutrition": {"calories": 450, "protein": 35.0, "sugar": 3.0},
                                                    "tags": ["HIGH_PROTEIN", "LOW_SUGAR"],
                                                    "matchScore": 0.92
                                                  }
                                                ],
                                                "workouts": [
                                                  {
                                                    "id": "w1",
                                                    "title": "HIIT Cardio",
                                                    "type": "CARDIO",
                                                    "durationMin": 30,
                                                    "difficulty": "INTERMEDIATE",
                                                    "matchScore": 0.88
                                                  }
                                                ]
                                              },
                                              "timestamp": 1703666000000
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Validation error or missing required fields",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "Validation Error",
                                    value = """
                                            {
                                              "success": false,
                                              "code": 5001,
                                              "message": "Validation failed",
                                              "errors": {
                                                "userProfile.goals": "goals is required"
                                              },
                                              "path": "/api/v1/recommendations/generate",
                                              "timestamp": 1703666000000
                                            }
                                            """
                            )
                    )
            ),
            @ApiResponse(
                    responseCode = "503",
                    description = "Recommendation service unavailable",
                    content = @Content(
                            mediaType = MediaType.APPLICATION_JSON_VALUE,
                            examples = @ExampleObject(
                                    name = "Service Error",
                                    value = """
                                            {
                                              "success": false,
                                              "code": 6003,
                                              "message": "Recommendation service temporarily unavailable",
                                              "path": "/api/v1/recommendations/generate",
                                              "timestamp": 1703666000000
                                            }
                                            """
                            )
                    )
            )
    })
    @PostMapping("/generate")
    public ApiEnvelope<RecommendationResponse> generateRecommendations(
            @Valid @RequestBody RecommendationRequest request) {

        log.info("POST /api/v1/recommendations/generate - userId: {}, goals: {}, limit: {}",
                request.getUserProfile().getUserId(),
                request.getUserProfile().getGoals(),
                request.getLimit());

        // Validate goals are present
        if (request.getUserProfile().getGoals() == null ||
                request.getUserProfile().getGoals().isEmpty()) {
            throw RecommendationException.goalsMissing();
        }

        RecommendationResponse response = recommendationService.generateRecommendations(request);

        log.info("Recommendations generated - id: {}, recipes: {}, workouts: {}",
                response.getRecommendationId(),
                response.getRecipes() != null ? response.getRecipes().size() : 0,
                response.getWorkouts() != null ? response.getWorkouts().size() : 0);

        return ApiEnvelope.success(response);
    }

    /**
     * Fetch dashboard recommendations for a fitness goal.
     * GET /api/v1/recommendations/dashboard?goal=GAIN_MUSCLE
     */
    @GetMapping("/dashboard")
    public ApiEnvelope<DashboardRecommendationResponse> getDashboardRecommendations(
            @RequestParam String goal) {
        DashboardRecommendationResponse response = dashboardRecommendationService.getRecommendations(goal);
        return ApiEnvelope.success(response);
    }
}
