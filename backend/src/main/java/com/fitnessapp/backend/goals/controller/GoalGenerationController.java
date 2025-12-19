package com.fitnessapp.backend.goals.controller;

import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse;
import com.fitnessapp.backend.goals.dto.SaveGoalRequest;
import com.fitnessapp.backend.goals.dto.UserGoalResponse;
import com.fitnessapp.backend.goals.service.GoalGenerationService;
import com.fitnessapp.backend.goals.service.UserGoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for AI-powered fitness goal generation and persistence.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
@Tag(name = "Goals", description = "AI-powered fitness goal generation and management")
public class GoalGenerationController {

    private final GoalGenerationService goalGenerationService;
    private final UserGoalService userGoalService;

    /**
     * Generate personalized fitness goals based on user profile.
     * Uses Gemini AI for intelligent recommendations, with fallback to calculations.
     */
    @Operation(summary = "Generate goals using AI", description = "Generate personalized fitness goals based on user profile")
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

    /**
     * Save generated goals to the database
     */
    @Operation(summary = "Save goals", description = "Persist generated goals to the database")
    @PostMapping("/save")
    public ResponseEntity<UserGoalResponse> saveGoal(@Valid @RequestBody SaveGoalRequest request) {
        log.info("Saving goal for user: {}, type: {}", request.getUserId(), request.getGoalType());
        UserGoalResponse response = userGoalService.saveGoal(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get the active goal for a user
     */
    @Operation(summary = "Get active goal", description = "Retrieve the currently active goal for a user")
    @GetMapping("/active")
    public ResponseEntity<UserGoalResponse> getActiveGoal(@RequestParam UUID userId) {
        return userGoalService.getActiveGoal(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Get goal history for a user
     */
    @Operation(summary = "Get goal history", description = "Retrieve all past goals for a user")
    @GetMapping("/history")
    public ResponseEntity<List<UserGoalResponse>> getGoalHistory(@RequestParam UUID userId) {
        List<UserGoalResponse> history = userGoalService.getGoalHistory(userId);
        return ResponseEntity.ok(history);
    }

    /**
     * Check if user has an active goal
     */
    @Operation(summary = "Check active goal", description = "Check if a user has an active goal")
    @GetMapping("/has-active")
    public ResponseEntity<HasActiveGoalResponse> hasActiveGoal(@RequestParam UUID userId) {
        boolean hasActive = userGoalService.hasActiveGoal(userId);
        return ResponseEntity.ok(new HasActiveGoalResponse(hasActive));
    }

    /**
     * Delete a specific goal
     */
    @Operation(summary = "Delete goal", description = "Delete a specific goal by ID")
    @DeleteMapping("/{goalId}")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID goalId) {
        userGoalService.deleteGoal(goalId);
        return ResponseEntity.noContent().build();
    }

    public record HasActiveGoalResponse(boolean hasActiveGoal) {}
}
