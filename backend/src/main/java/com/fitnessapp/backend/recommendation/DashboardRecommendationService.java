package com.fitnessapp.backend.recommendation;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.retrieval.RecipeRetrievalService;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Service for fetching personalized dashboard recommendations based on user's fitness goal.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardRecommendationService {

    private static final int TOP_ITEMS_LIMIT = 5;
    private static final int QUERY_LIMIT = 10; // Fetch more to ensure diversity

    private static final Map<String, String> GOAL_LABELS = Map.of(
        "LOSE_WEIGHT", "Fat Loss",
        "GAIN_MUSCLE", "Build Muscle",
        "MAINTAIN", "Maintain Health",
        "STRENGTH", "Build Strength"
    );

    private final ExerciseVideoRepository exerciseVideoRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeRetrievalService recipeRetrievalService;

    /**
     * Get dashboard recommendations for a specific fitness goal.
     * Returns top 5 workouts and top 5 recipes matching the goal.
     *
     * @param fitnessGoal The user's fitness goal (LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN, STRENGTH)
     * @return DashboardRecommendationResponse with workouts and recipes
     */
    @Cacheable(value = "dashboardRecommendations", key = "#fitnessGoal", unless = "#result == null")
    @Transactional(readOnly = true)
    public DashboardRecommendationResponse getRecommendations(String fitnessGoal) {
        Instant start = Instant.now();

        String normalizedGoal = normalizeGoal(fitnessGoal);
        log.info("Fetching dashboard recommendations for goal: {}", normalizedGoal);

        // Fetch workouts and recipes in parallel (conceptually - they're cached independently)
        List<WorkoutCard> workouts = fetchTopWorkouts(normalizedGoal);
        List<RecipeCard> recipes = fetchTopRecipes(normalizedGoal);

        Duration elapsed = Duration.between(start, Instant.now());
        log.info("Dashboard recommendations fetched in {}ms: {} workouts, {} recipes",
                elapsed.toMillis(), workouts.size(), recipes.size());

        return DashboardRecommendationResponse.builder()
                .fitnessGoal(normalizedGoal)
                .goalLabel(GOAL_LABELS.getOrDefault(normalizedGoal, "Your Goal"))
                .workouts(workouts)
                .recipes(recipes)
                .latencyMs((int) elapsed.toMillis())
                .build();
    }

    /**
     * Normalize various fitness goal formats to the enum value.
     */
    private String normalizeGoal(String fitnessGoal) {
        if (!StringUtils.hasText(fitnessGoal)) {
            return FitnessGoal.MAINTAIN.name();
        }

        String upper = fitnessGoal.toUpperCase(Locale.ROOT).trim();

        // Handle common variations
        if (upper.contains("WEIGHT") || upper.contains("FAT") || upper.contains("LOSS")) {
            return FitnessGoal.LOSE_WEIGHT.name();
        }
        if (upper.contains("MUSCLE") || upper.contains("GAIN") || upper.contains("BUILD")) {
            return FitnessGoal.GAIN_MUSCLE.name();
        }
        if (upper.contains("STRENGTH") || upper.contains("POWER")) {
            return FitnessGoal.STRENGTH.name();
        }
        if (upper.contains("MAINTAIN") || upper.contains("HEALTH") || upper.contains("BALANCE")) {
            return FitnessGoal.MAINTAIN.name();
        }

        // Try to match directly to enum
        try {
            return FitnessGoal.valueOf(upper).name();
        } catch (IllegalArgumentException e) {
            log.warn("Unknown fitness goal: {}, defaulting to MAINTAIN", fitnessGoal);
            return FitnessGoal.MAINTAIN.name();
        }
    }

    /**
     * Fetch top 5 diverse workouts matching the goal.
     */
    private List<WorkoutCard> fetchTopWorkouts(String goal) {
        List<ExerciseVideo> videos = exerciseVideoRepository.findTopByTargetGoal(goal, QUERY_LIMIT);

        if (videos.isEmpty()) {
            log.warn("No workouts found for goal {}, fetching default workouts", goal);
            videos = exerciseVideoRepository.findAllByOrderByExerciseNameAsc();
            if (videos.size() > QUERY_LIMIT) {
                videos = videos.subList(0, QUERY_LIMIT);
            }
        }

        return selectDiverseWorkouts(videos, TOP_ITEMS_LIMIT);
    }

    /**
     * Select diverse workouts from different categories for variety.
     */
    private List<WorkoutCard> selectDiverseWorkouts(List<ExerciseVideo> videos, int limit) {
        List<WorkoutCard> selected = new ArrayList<>();
        Set<String> seenCategories = new HashSet<>();
        Set<String> addedIds = new HashSet<>();

        // First pass: get one from each category
        for (ExerciseVideo video : videos) {
            if (selected.size() >= limit) break;
            String category = video.getPrimaryCategory();
            if (category != null && seenCategories.add(category.toLowerCase(Locale.ROOT))) {
                addWorkout(selected, addedIds, video);
            }
        }

        // Second pass: fill remaining slots
        for (ExerciseVideo video : videos) {
            if (selected.size() >= limit) break;
            addWorkout(selected, addedIds, video);
        }

        return selected;
    }

    private void addWorkout(List<WorkoutCard> selected, Set<String> addedIds, ExerciseVideo video) {
        String id = video.getYoutubeId();
        if (!StringUtils.hasText(id) || addedIds.contains(id)) {
            return;
        }
        selected.add(toWorkoutCard(video));
        addedIds.add(id);
    }

    private WorkoutCard toWorkoutCard(ExerciseVideo video) {
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

        return WorkoutCard.builder()
                .id(video.getId() != null ? video.getId().toString() : null)
                .youtubeId(video.getYoutubeId())
                .title(video.getExerciseName())
                .durationMinutes(video.getIsShort() ? 1 : 5)
                .level("all")
                .equipment(List.of())
                .bodyParts(bodyParts)
                .thumbnailUrl(thumbnailUrl)
                .viewCount(0L)
                .youtubeUrl(youtubeUrl)
                .build();
    }

    /**
     * Fetch top 5 recipes matching the goal.
     */
    private List<RecipeCard> fetchTopRecipes(String goal) {
        List<Recipe> recipes = recipeRepository.findTopByTargetGoal(goal, QUERY_LIMIT);

        if (recipes.isEmpty()) {
            log.warn("No recipes found for goal {}, fetching default recipes", goal);
            recipes = recipeRepository.findTop12ByOrderByCreatedAtDesc();
            if (recipes.size() > QUERY_LIMIT) {
                recipes = recipes.subList(0, QUERY_LIMIT);
            }
        }

        return recipes.stream()
                .limit(TOP_ITEMS_LIMIT)
                .map(recipeRetrievalService::toCard)
                .collect(Collectors.toList());
    }
}
