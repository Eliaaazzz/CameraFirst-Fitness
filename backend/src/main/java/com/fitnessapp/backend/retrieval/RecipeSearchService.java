package com.fitnessapp.backend.retrieval;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.retrieval.dto.NutritionFilter;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.RecipeSearchRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Advanced recipe search service with macro filtering and dietary tags
 * Provides intelligent recipe discovery based on nutrition criteria
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeSearchService {

    private static final int DEFAULT_LIMIT = 20;

    private final RecipeRepository repository;
    private final RecipeRetrievalService retrievalService;

    /**
     * Advanced recipe search with nutrition filters and dietary tags
     * Results are cached for 30 minutes
     */
    @Cacheable(value = "recipeSearch",
               key = "'advanced_' + #request.toString()",
               unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<RecipeCard> search(RecipeSearchRequest request) {
        log.info("Advanced search: ingredients={}, maxTime={}, nutrition={}, dietary={}",
                request.getIngredients(),
                request.getMaxTimeMinutes(),
                request.getNutrition(),
                request.getDietaryTags());

        // If no nutrition filters, use basic search
        if (request.isSimpleSearch()) {
            return retrievalService.findRecipes(
                    request.getIngredients() != null ? request.getIngredients() : List.of(),
                    request.getMaxTimeMinutes() != null ? request.getMaxTimeMinutes() : 0
            );
        }

        // Use advanced nutrition-based search with generated columns
        NutritionFilter nutrition = request.getNutrition();
        Pageable pageable = PageRequest.of(0, DEFAULT_LIMIT);

        List<Recipe> results = repository.findByNutritionCriteria(
                nutrition != null ? nutrition.getMinCalories() : null,
                nutrition != null ? nutrition.getMaxCalories() : null,
                nutrition != null ? toDouble(nutrition.getMinProtein()) : null,
                nutrition != null ? toDouble(nutrition.getMaxProtein()) : null,
                nutrition != null ? toDouble(nutrition.getMinCarbs()) : null,
                nutrition != null ? toDouble(nutrition.getMaxCarbs()) : null,
                nutrition != null ? toDouble(nutrition.getMinFat()) : null,
                nutrition != null ? toDouble(nutrition.getMaxFat()) : null,
                null, // maxSugar
                null, // minFiber
                request.getMaxTimeMinutes(),
                pageable
        );

        log.debug("Found {} recipes matching nutrition criteria", results.size());

        return results.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Find high-protein recipes (30g+ protein)
     * Perfect for muscle building and post-workout meals
     */
    @Cacheable(value = "recipeSearch", key = "'high-protein_' + #maxTime")
    @Transactional(readOnly = true)
    public List<RecipeCard> findHighProteinRecipes(Integer maxTime) {
        log.info("Finding high-protein recipes, maxTime={}", maxTime);

        Pageable pageable = PageRequest.of(0, DEFAULT_LIMIT);
        List<Recipe> recipes = repository.findHighProteinRecipes(30.0, pageable);

        // Apply time filter if specified
        if (maxTime != null && maxTime > 0) {
            recipes = recipes.stream()
                    .filter(r -> r.getTimeMinutes() != null && r.getTimeMinutes() <= maxTime)
                    .collect(Collectors.toList());
        }

        return recipes.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Find low-carb recipes (under 20g carbs)
     * Perfect for keto and low-carb diets
     */
    @Cacheable(value = "recipeSearch", key = "'low-carb_' + #maxTime")
    @Transactional(readOnly = true)
    public List<RecipeCard> findLowCarbRecipes(Integer maxTime) {
        log.info("Finding low-carb recipes, maxTime={}", maxTime);

        Pageable pageable = PageRequest.of(0, DEFAULT_LIMIT);
        List<Recipe> recipes = repository.findLowCarbRecipes(20.0, pageable);

        // Apply time filter if specified
        if (maxTime != null && maxTime > 0) {
            recipes = recipes.stream()
                    .filter(r -> r.getTimeMinutes() != null && r.getTimeMinutes() <= maxTime)
                    .collect(Collectors.toList());
        }

        return recipes.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Find low-calorie recipes (under 400 calories)
     * Perfect for weight loss and calorie-conscious users
     */
    @Cacheable(value = "recipeSearch", key = "'low-calorie_' + #maxTime")
    @Transactional(readOnly = true)
    public List<RecipeCard> findLowCalorieRecipes(Integer maxTime) {
        log.info("Finding low-calorie recipes, maxTime={}", maxTime);

        Pageable pageable = PageRequest.of(0, DEFAULT_LIMIT);
        List<Recipe> recipes = repository.findLowCalorieRecipes(400, pageable);

        // Apply time filter if specified
        if (maxTime != null && maxTime > 0) {
            recipes = recipes.stream()
                    .filter(r -> r.getTimeMinutes() != null && r.getTimeMinutes() <= maxTime)
                    .collect(Collectors.toList());
        }

        return recipes.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Find balanced recipes
     * Good protein (20g+), moderate calories (under 600)
     */
    @Cacheable(value = "recipeSearch", key = "'balanced_' + #maxTime")
    @Transactional(readOnly = true)
    public List<RecipeCard> findBalancedRecipes(Integer maxTime) {
        log.info("Finding balanced recipes, maxTime={}", maxTime);

        return search(RecipeSearchRequest.builder()
                .maxTimeMinutes(maxTime)
                .nutrition(NutritionFilter.balanced())
                .sortBy("time")
                .build());
    }

    /**
     * Find recipes by calorie range
     */
    @Cacheable(value = "recipeSearch", key = "'calories_' + #minCalories + '_' + #maxCalories")
    @Transactional(readOnly = true)
    public List<RecipeCard> findByCaloriesRange(int minCalories, int maxCalories) {
        log.info("Finding recipes with {}-{} calories", minCalories, maxCalories);

        Pageable pageable = PageRequest.of(0, DEFAULT_LIMIT);
        List<Recipe> recipes = repository.findByCaloriesRange(minCalories, maxCalories, pageable);

        return recipes.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Helper to convert Integer to Double (for nutrition values)
     */
    private Double toDouble(Integer value) {
        return value != null ? value.doubleValue() : null;
    }

    /**
     * Find recipes by fitness goal (LOSE_WEIGHT, GAIN_MUSCLE, BLOOD_SUGAR_CONTROL, etc.)
     * Returns more results for browsing (up to 50)
     */
    @Cacheable(value = "recipeSearch", key = "'goal_' + #goal + '_' + #limit")
    @Transactional(readOnly = true)
    public List<RecipeCard> findByGoal(String goal, int limit) {
        log.info("Finding recipes for goal: {}, limit: {}", goal, limit);

        String normalizedGoal = normalizeGoal(goal);
        int effectiveLimit = Math.min(limit, 50);

        List<Recipe> recipes = repository.findTopByTargetGoal(normalizedGoal, effectiveLimit);

        if (recipes.isEmpty()) {
            log.warn("No recipes found for goal {}, returning recent recipes", normalizedGoal);
            recipes = repository.findTop12ByOrderByCreatedAtDesc();
        }

        // Batch fetch with ingredients to avoid N+1 and ensure ingredients are loaded
        List<UUID> recipeIds = recipes.stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());
        List<Recipe> recipesWithIngredients = repository.findByIdInWithIngredients(recipeIds);

        return recipesWithIngredients.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }

    /**
     * Normalize goal input to standard enum values
     */
    private String normalizeGoal(String goal) {
        if (goal == null || goal.trim().isEmpty()) {
            return "MAINTAIN";
        }

        String upper = goal.toUpperCase().trim().replace(" ", "_").replace("-", "_");

        // Map common variations
        if (upper.contains("MUSCLE") || upper.contains("GAIN") || upper.contains("BUILD")) {
            return "GAIN_MUSCLE";
        }
        if (upper.contains("WEIGHT") || upper.contains("FAT") || upper.contains("LOSS") || upper.contains("LOSE")) {
            return "LOSE_WEIGHT";
        }
        if (upper.contains("BLOOD") || upper.contains("SUGAR") || upper.contains("DIABETES") || upper.contains("GLYCEMIC")) {
            return "MAINTAIN"; // Blood sugar control maps to maintain with low-carb focus
        }
        if (upper.contains("STRENGTH") || upper.contains("POWER")) {
            return "STRENGTH";
        }
        if (upper.contains("MAINTAIN") || upper.contains("HEALTH")) {
            return "MAINTAIN";
        }

        return upper;
    }

    /**
     * Text-based recipe search by title or tags
     */
    @Transactional(readOnly = true)
    public List<RecipeCard> searchByText(String query, Integer maxTime) {
        log.info("Text search: query={}, maxTime={}", query, maxTime);

        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        List<Recipe> recipes = repository.searchByText(query.trim(), DEFAULT_LIMIT);

        // Apply time filter if specified
        if (maxTime != null && maxTime > 0) {
            recipes = recipes.stream()
                    .filter(r -> r.getTimeMinutes() != null && r.getTimeMinutes() <= maxTime)
                    .collect(Collectors.toList());
        }

        return recipes.stream()
                .map(retrievalService::toCard)
                .collect(Collectors.toList());
    }
}
