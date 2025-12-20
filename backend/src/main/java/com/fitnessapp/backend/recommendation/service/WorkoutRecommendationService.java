package com.fitnessapp.backend.recommendation.service;

import com.fitnessapp.backend.goals.entity.UserGoal;
import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.WorkoutRecommendation;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Content-based recommendation service for workout videos.
 * Recommends workouts based on user's fitness goals and activity preferences.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkoutRecommendationService {

    private final ExerciseVideoRepository exerciseVideoRepository;
    private final UserGoalRepository userGoalRepository;

    // Goal type to workout category mappings
    private static final Map<String, List<String>> GOAL_TO_WORKOUT_TYPES = Map.of(
            "fat_loss", List.of("Cardio", "HIIT", "Full Body", "Core"),
            "weight_loss", List.of("Cardio", "HIIT", "Full Body", "Core"),
            "muscle_gain", List.of("Chest", "Back", "Shoulders", "Arms", "Legs"),
            "build_muscle", List.of("Chest", "Back", "Shoulders", "Arms", "Legs"),
            "maintenance", List.of("Full Body", "Core", "Back", "Chest", "Legs"),
            "maintain_weight", List.of("Full Body", "Core", "Back", "Chest", "Legs"),
            "general_fitness", List.of("Full Body", "Core", "Cardio", "Legs", "Back")
    );

    // Priority body parts for each goal type
    private static final Map<String, List<String>> GOAL_PRIORITY_BODY_PARTS = Map.of(
            "fat_loss", List.of("Core", "Legs", "Full Body"),
            "weight_loss", List.of("Core", "Legs", "Full Body"),
            "muscle_gain", List.of("Chest", "Back", "Shoulders", "Arms", "Legs"),
            "build_muscle", List.of("Chest", "Back", "Shoulders", "Arms", "Legs"),
            "maintenance", List.of("Core", "Full Body", "Legs"),
            "maintain_weight", List.of("Core", "Full Body", "Legs"),
            "general_fitness", List.of("Full Body", "Core", "Legs")
    );

    /**
     * Get workout recommendations based on user's active goal.
     * Uses content-based filtering to match workouts to fitness goals.
     */
    public List<WorkoutRecommendation> getRecommendations(UUID userId, RecommendationRequest request) {
        Optional<UserGoal> activeGoal = userGoalRepository.findActiveByUserId(userId);

        if (activeGoal.isEmpty()) {
            log.info("No active goal found for user {}, returning default workout recommendations", userId);
            return getDefaultRecommendations(request);
        }

        UserGoal goal = activeGoal.get();
        log.info("Generating workout recommendations for user {} with goal type: {}", userId, goal.getGoalType());

        // Determine workout focus based on goal
        String goalType = goal.getGoalType().toLowerCase();
        List<String> targetCategories = GOAL_TO_WORKOUT_TYPES.getOrDefault(goalType,
                List.of("Full Body", "Core", "Legs", "Back", "Chest"));

        // Apply category filter if provided
        if (StringUtils.hasText(request.getCategory())) {
            targetCategories = List.of(request.getCategory());
        }

        // Calculate weekly activity targets
        int strengthSessionsPerWeek = goal.getStrengthSessionsPerWeek();
        int cardioMinutesPerWeek = goal.getCardioMinutesPerWeek();
        boolean prioritizeStrength = strengthSessionsPerWeek >= 3;
        boolean prioritizeCardio = cardioMinutesPerWeek >= 150;

        // Fetch and score workouts
        List<WorkoutRecommendation> recommendations = new ArrayList<>();
        Set<String> addedYoutubeIds = new HashSet<>();

        for (String category : targetCategories) {
            List<ExerciseVideo> videos = exerciseVideoRepository.findByCategory(category, request.getLimit() * 2);

            for (ExerciseVideo video : videos) {
                if (recommendations.size() >= request.getLimit()) break;
                if (addedYoutubeIds.contains(video.getYoutubeId())) continue;

                WorkoutRecommendation rec = scoreWorkout(video, goal, category,
                        prioritizeStrength, prioritizeCardio);

                if (rec.getMatchScore() > 0.3) {
                    recommendations.add(rec);
                    addedYoutubeIds.add(video.getYoutubeId());
                }
            }

            if (recommendations.size() >= request.getLimit()) break;
        }

        // Sort by match score
        recommendations.sort(Comparator.comparingDouble(WorkoutRecommendation::getMatchScore).reversed());

        log.info("Generated {} workout recommendations for user {}", recommendations.size(), userId);
        return recommendations.stream().limit(request.getLimit()).collect(Collectors.toList());
    }

    /**
     * Get workout recommendations for a specific body part/category.
     */
    public List<WorkoutRecommendation> getRecommendationsByCategory(UUID userId, String category, int limit) {
        RecommendationRequest request = RecommendationRequest.builder()
                .limit(limit)
                .category(category)
                .build();
        return getRecommendations(userId, request);
    }

    /**
     * Score a workout video based on how well it matches the user's goal.
     */
    private WorkoutRecommendation scoreWorkout(ExerciseVideo video, UserGoal goal,
                                                String targetCategory, boolean prioritizeStrength,
                                                boolean prioritizeCardio) {
        String goalType = goal.getGoalType().toLowerCase();
        double score = 0.5; // Base score
        List<String> reasons = new ArrayList<>();

        String primaryCategory = video.getPrimaryCategory();
        String secondaryCategory = video.getSecondaryCategory();

        // Category match scoring
        List<String> priorityParts = GOAL_PRIORITY_BODY_PARTS.getOrDefault(goalType,
                List.of("Full Body", "Core"));

        if (primaryCategory != null && priorityParts.contains(primaryCategory)) {
            score += 0.25;
            reasons.add("Targets " + primaryCategory + " for your goal");
        }

        if (secondaryCategory != null && priorityParts.contains(secondaryCategory)) {
            score += 0.10;
        }

        // Goal-specific scoring
        if (goalType.contains("fat_loss") || goalType.contains("weight_loss")) {
            // For fat loss, prioritize cardio-friendly exercises
            if (isCardioExercise(video)) {
                score += 0.15;
                reasons.add("Cardio for fat burning");
            }
            if (primaryCategory != null && (primaryCategory.equalsIgnoreCase("Core") ||
                    primaryCategory.equalsIgnoreCase("Legs"))) {
                score += 0.10;
                reasons.add("Large muscle group activation");
            }
        } else if (goalType.contains("muscle") || goalType.contains("build")) {
            // For muscle gain, prioritize compound movements
            if (isCompoundExercise(video)) {
                score += 0.15;
                reasons.add("Compound movement for muscle growth");
            }
            if (prioritizeStrength && isStrengthExercise(video)) {
                score += 0.10;
                reasons.add("Strength training focus");
            }
        } else {
            // For maintenance/general fitness
            if (primaryCategory != null && primaryCategory.equalsIgnoreCase("Full Body")) {
                score += 0.15;
                reasons.add("Full body workout for overall fitness");
            }
        }

        // Activity plan alignment
        if (prioritizeStrength && isStrengthExercise(video)) {
            score += 0.05;
        }
        if (prioritizeCardio && isCardioExercise(video)) {
            score += 0.05;
        }

        // Ensure score is capped at 1.0
        score = Math.min(1.0, score);

        // Add default reason if none generated
        if (reasons.isEmpty()) {
            reasons.add("Supports your " + formatGoalType(goalType) + " goal");
        }

        return buildRecommendation(video, score, reasons, determineWorkoutType(video, goalType));
    }

    /**
     * Determine if the exercise is cardio-focused.
     */
    private boolean isCardioExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";
        String category = video.getPrimaryCategory() != null ? video.getPrimaryCategory().toLowerCase() : "";

        return name.contains("cardio") || name.contains("hiit") || name.contains("run") ||
                name.contains("jump") || name.contains("burpee") ||
                category.contains("cardio") || category.contains("hiit");
    }

    /**
     * Determine if the exercise is strength-focused.
     */
    private boolean isStrengthExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";
        String category = video.getPrimaryCategory() != null ? video.getPrimaryCategory().toLowerCase() : "";

        return name.contains("press") || name.contains("curl") || name.contains("row") ||
                name.contains("squat") || name.contains("deadlift") || name.contains("lift") ||
                category.contains("chest") || category.contains("back") ||
                category.contains("arms") || category.contains("shoulders");
    }

    /**
     * Determine if the exercise is a compound movement.
     */
    private boolean isCompoundExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";

        return name.contains("squat") || name.contains("deadlift") || name.contains("press") ||
                name.contains("row") || name.contains("pull-up") || name.contains("pullup") ||
                name.contains("lunge") || name.contains("bench");
    }

    /**
     * Determine the workout type based on exercise characteristics.
     */
    private String determineWorkoutType(ExerciseVideo video, String goalType) {
        if (isCardioExercise(video)) return "cardio";
        if (isStrengthExercise(video)) return "strength";
        if (video.getPrimaryCategory() != null &&
                video.getPrimaryCategory().equalsIgnoreCase("Core")) return "core";
        return "general";
    }

    /**
     * Format goal type for display.
     */
    private String formatGoalType(String goalType) {
        return goalType.replace("_", " ");
    }

    /**
     * Get default recommendations when user has no active goal.
     */
    private List<WorkoutRecommendation> getDefaultRecommendations(RecommendationRequest request) {
        List<ExerciseVideo> videos = exerciseVideoRepository.findAllByOrderByExerciseNameAsc();

        // Select diverse workouts across categories
        List<WorkoutRecommendation> recommendations = new ArrayList<>();
        Set<String> seenCategories = new HashSet<>();
        Set<String> addedIds = new HashSet<>();

        for (ExerciseVideo video : videos) {
            if (recommendations.size() >= request.getLimit()) break;
            if (video.getYoutubeId() == null || addedIds.contains(video.getYoutubeId())) continue;

            String category = video.getPrimaryCategory();
            if (category != null && !seenCategories.contains(category.toLowerCase())) {
                seenCategories.add(category.toLowerCase());
                recommendations.add(buildRecommendation(video, 0.5,
                        List.of("Popular " + category + " exercise"), "general"));
                addedIds.add(video.getYoutubeId());
            }
        }

        // Fill remaining slots if needed
        for (ExerciseVideo video : videos) {
            if (recommendations.size() >= request.getLimit()) break;
            if (video.getYoutubeId() != null && !addedIds.contains(video.getYoutubeId())) {
                recommendations.add(buildRecommendation(video, 0.4,
                        List.of("Featured exercise"), "general"));
                addedIds.add(video.getYoutubeId());
            }
        }

        return recommendations;
    }

    /**
     * Build a WorkoutRecommendation DTO from an ExerciseVideo entity.
     */
    private WorkoutRecommendation buildRecommendation(ExerciseVideo video, double matchScore,
                                                       List<String> reasons, String workoutType) {
        String youtubeUrl = StringUtils.hasText(video.getYoutubeId())
                ? "https://www.youtube.com/watch?v=" + video.getYoutubeId()
                : null;

        String thumbnailUrl = video.getR2Key() != null
                ? "https://img.camera-first.dev/" + video.getR2Key().replace(".mp4", ".jpg")
                : null;

        List<String> bodyParts = new ArrayList<>();
        if (video.getPrimaryCategory() != null) {
            bodyParts.add(video.getPrimaryCategory());
        }
        if (video.getSecondaryCategory() != null) {
            bodyParts.add(video.getSecondaryCategory());
        }

        return WorkoutRecommendation.builder()
                .id(video.getId() != null ? video.getId().toString() : null)
                .youtubeId(video.getYoutubeId())
                .title(video.getExerciseName())
                .durationMinutes(video.getIsShort() != null && video.getIsShort() ? 1 : 5)
                .level("all")
                .equipment(List.of())
                .bodyParts(bodyParts)
                .thumbnailUrl(thumbnailUrl)
                .youtubeUrl(youtubeUrl)
                .matchScore(matchScore)
                .matchReasons(reasons)
                .workoutType(workoutType)
                .build();
    }
}
