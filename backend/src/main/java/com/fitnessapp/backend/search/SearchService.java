package com.fitnessapp.backend.search;

import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service layer for text-based search with Caffeine caching.
 * Eliminates redundant database hits for repeated queries.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SearchService {

    private final RecipeRepository recipeRepository;
    private final ExerciseVideoRepository exerciseVideoRepository;

    /**
     * Cached recipe text search.
     * Cache key includes normalized query + limit for precise cache hits.
     */
    @Cacheable(
            value = "recipeSearch",
            key = "'textSearch_' + #query.toLowerCase().trim() + '_' + #limit",
            unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<Recipe> searchRecipes(String query, int limit) {
        log.debug("Cache miss - searching recipes: query='{}', limit={}", query, limit);
        return recipeRepository.searchByText(query.trim(), Math.min(limit, 50));
    }

    /**
     * Cached workout text search.
     * Cache key includes normalized query + limit for precise cache hits.
     */
    @Cacheable(
            value = "workoutSearch",
            key = "'textSearch_' + #query.toLowerCase().trim() + '_' + #limit",
            unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<ExerciseVideo> searchWorkouts(String query, int limit) {
        log.debug("Cache miss - searching workouts: query='{}', limit={}", query, limit);
        return exerciseVideoRepository.searchByKeyword(query.trim(), Math.min(limit, 50));
    }
}
