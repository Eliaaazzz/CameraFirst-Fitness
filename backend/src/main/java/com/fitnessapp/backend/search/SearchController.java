package com.fitnessapp.backend.search;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Search API for recipes and workouts.
 * Provides text-based search functionality across content.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Search", description = "Search for recipes and workouts")
public class SearchController {

    private final RecipeRepository recipeRepository;
    private final ExerciseVideoRepository exerciseVideoRepository;

    /**
     * Search recipes by title, description, or dietary tags.
     *
     * @param query Search query string
     * @param limit Maximum results (default 20)
     * @return List of matching recipes
     */
    @GetMapping("/recipes")
    @Operation(
        summary = "Search recipes",
        description = "Search recipes by title, description, or dietary tags"
    )
    public ResponseEntity<List<RecipeSearchResult>> searchRecipes(
            @Parameter(description = "Search query", example = "chicken")
            @RequestParam("query") String query,
            @Parameter(description = "Max results", example = "20")
            @RequestParam(value = "limit", defaultValue = "20") int limit) {

        log.info("Searching recipes with query: '{}', limit: {}", query, limit);

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<Recipe> recipes = recipeRepository.searchByText(query.trim(), Math.min(limit, 50));

        List<RecipeSearchResult> results = recipes.stream()
            .map(RecipeSearchResult::fromEntity)
            .toList();

        log.info("Found {} recipes for query '{}'", results.size(), query);
        return ResponseEntity.ok(results);
    }

    /**
     * Search workouts/exercises by name, category, or slug.
     *
     * @param query Search query string
     * @param limit Maximum results (default 20)
     * @return List of matching exercise videos
     */
    @GetMapping("/workouts")
    @Operation(
        summary = "Search workouts",
        description = "Search exercise videos by name, category, or exercise type"
    )
    public ResponseEntity<List<WorkoutSearchResult>> searchWorkouts(
            @Parameter(description = "Search query", example = "squat")
            @RequestParam("query") String query,
            @Parameter(description = "Max results", example = "20")
            @RequestParam(value = "limit", defaultValue = "20") int limit) {

        log.info("Searching workouts with query: '{}', limit: {}", query, limit);

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<ExerciseVideo> videos = exerciseVideoRepository.searchByKeyword(query.trim(), Math.min(limit, 50));

        List<WorkoutSearchResult> results = videos.stream()
            .map(WorkoutSearchResult::fromEntity)
            .toList();

        log.info("Found {} workouts for query '{}'", results.size(), query);
        return ResponseEntity.ok(results);
    }

    /**
     * Recipe search result DTO.
     */
    public record RecipeSearchResult(
        String id,
        String title,
        String imageUrl,
        Integer timeMinutes,
        String difficulty,
        Integer calories,
        Double protein,
        List<String> targetGoal
    ) {
        public static RecipeSearchResult fromEntity(Recipe recipe) {
            return new RecipeSearchResult(
                recipe.getId().toString(),
                recipe.getTitle(),
                recipe.getImageUrl(),
                recipe.getTimeMinutes(),
                recipe.getDifficulty(),
                recipe.getCalories(),
                recipe.getProtein(),
                recipe.getTargetGoal()
            );
        }
    }

    /**
     * Workout search result DTO.
     */
    public record WorkoutSearchResult(
        String id,
        String exerciseName,
        String exerciseSlug,
        String primaryCategory,
        String youtubeId,
        String thumbnailUrl,
        List<String> targetGoal
    ) {
        public static WorkoutSearchResult fromEntity(ExerciseVideo video) {
            return new WorkoutSearchResult(
                video.getId().toString(),
                video.getExerciseName(),
                video.getExerciseSlug(),
                video.getPrimaryCategory(),
                video.getYoutubeId(),
                video.getThumbnailUrl(),
                video.getTargetGoal()
            );
        }
    }
}
