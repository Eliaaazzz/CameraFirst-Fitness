package com.fitnessapp.backend.goals.controller;

import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse;
import com.fitnessapp.backend.goals.service.GoalGenerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for AI-powered fitness goal generation.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalGenerationController {

    private final GoalGenerationService goalGenerationService;

    /**
     * Generate personalized fitness goals based on user profile.
     * Uses Gemini AI for intelligent recommendations, with fallback to calculations.
     *
     * @param request User profile and goal preferences
     * @return Generated fitness goals with calories, macros, activity plan, and milestones
     */
    @PostMapping("/generate")
    public ResponseEntity<GenerateGoalsResponse> generateGoals(
            @Valid @RequestBody GenerateGoalsRequest request
    ) {
        log.info("Generating goals for user: sex={}, height={}cm, weight={}kg, goal={}",
                request.getSex(), request.getHeightCm(), request.getWeightKg(), request.getGoalType());

        GenerateGoalsResponse response = goalGenerationService.generateGoals(request);

        log.info("Goals generated successfully: {} kcal target, {}g protein",
                response.getDailyCalories().getTarget(),
                response.getMacrosGrams().getProteinG());

        return ResponseEntity.ok(response);
    }
}
