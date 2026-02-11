package com.fitnessapp.backend.retrieval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.recipe.entity.Ingredient;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.entity.RecipeIngredient;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.RecipeIngredientDto;
import com.fitnessapp.backend.retrieval.dto.RecipeStep;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeRetrievalService {

    private static final int DEFAULT_RESULT_LIMIT = 3;
    private static final int DEFAULT_FALLBACK_TIME_MINUTES = 20;
    private static final String DEFAULT_FALLBACK_DIFFICULTY = "easy";

    private final RecipeRepository repository;
    private final ObjectMapper objectMapper;

    @Cacheable(value = "recipeSearch",
               key = "#detectedIngredients.toString() + '_' + #maxTime",
               unless = "#result.isEmpty()")
    @Transactional(readOnly = true)
    public List<RecipeCard> findRecipes(List<String> detectedIngredients, int maxTime) {
        log.debug("Cache miss - querying database for ingredients: {}, maxTime: {}", detectedIngredients, maxTime);
        List<String> normalizedDetected = normalizeDetected(detectedIngredients);
        int effectiveMaxTime = maxTime > 0 ? maxTime : Integer.MAX_VALUE;

        if (normalizedDetected.isEmpty()) {
            return repository.findByTimeMinutesLessThanEqualAndDifficultyIgnoreCase(DEFAULT_FALLBACK_TIME_MINUTES, DEFAULT_FALLBACK_DIFFICULTY)
                    .stream()
                    .sorted(Comparator.comparing(Recipe::getTimeMinutes))
                    .limit(DEFAULT_RESULT_LIMIT)
                    .map(this::toCard)
                    .collect(Collectors.toList());
        }

        List<Recipe> matches = repository.findByIngredientsContainingAny(normalizedDetected);

        // Batch fetch ingredients to avoid N+1 queries
        List<UUID> matchIds = matches.stream()
                .map(Recipe::getId)
                .collect(Collectors.toList());

        // Fetch recipes with ingredients in one query
        Map<UUID, Recipe> recipesWithIngredients = repository.findByIdInWithIngredients(matchIds)
                .stream()
                .collect(Collectors.toMap(Recipe::getId, r -> r));

        List<ScoredRecipe> scoredRecipes = matches.stream()
                .map(recipe -> recipesWithIngredients.get(recipe.getId())) // Use fully loaded recipe
                .filter(recipe -> recipe != null && recipe.getTimeMinutes() != null && recipe.getTimeMinutes() <= effectiveMaxTime)
                .map(recipe -> new ScoredRecipe(recipe, countMatchingIngredients(recipe, normalizedDetected)))
                .filter(scored -> scored.getMatchCount() > 0)
                .sorted(Comparator
                        .comparingInt(ScoredRecipe::getMatchCount).reversed()
                        .thenComparing(scored -> scored.getRecipe().getTimeMinutes())
                        .thenComparing(scored -> safeDifficulty(scored.getRecipe().getDifficulty())))
                .limit(DEFAULT_RESULT_LIMIT)
                .collect(Collectors.toList());

        List<Recipe> orderedRecipes = new ArrayList<>();
        Set<String> seenRecipeIds = new HashSet<>();

        scoredRecipes.forEach(scored -> addIfUnique(orderedRecipes, seenRecipeIds, scored.getRecipe()));

        if (orderedRecipes.size() < DEFAULT_RESULT_LIMIT) {
            repository.findByTimeMinutesLessThanEqualAndDifficultyIgnoreCase(DEFAULT_FALLBACK_TIME_MINUTES, DEFAULT_FALLBACK_DIFFICULTY)
                    .forEach(recipe -> addIfUnique(orderedRecipes, seenRecipeIds, recipe));
        }

        return orderedRecipes.stream()
                .limit(DEFAULT_RESULT_LIMIT)
                .map(this::toCard)
                .collect(Collectors.toList());
    }

    private List<String> normalizeDetected(List<String> detectedIngredients) {
        if (CollectionUtils.isEmpty(detectedIngredients)) {
            return List.of();
        }
        return detectedIngredients.stream()
                .filter(StringUtils::hasText)
                .map(value -> value.toLowerCase(Locale.ROOT).trim())
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    private int countMatchingIngredients(Recipe recipe, List<String> detected) {
        if (CollectionUtils.isEmpty(recipe.getIngredients())) {
            return 0;
        }
        Set<String> detectedSet = detected.stream()
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        return (int) recipe.getIngredients().stream()
                .map(RecipeIngredient::getIngredient)
                .filter(Objects::nonNull)
                .map(Ingredient::getName)
                .filter(StringUtils::hasText)
                .map(name -> name.toLowerCase(Locale.ROOT))
                .filter(detectedSet::contains)
                .count();
    }

    private String safeDifficulty(String difficulty) {
        return StringUtils.hasText(difficulty) ? difficulty.toLowerCase(Locale.ROOT) : "";
    }

    /**
     * Convert Recipe entity to RecipeCard DTO
     * Public method to allow other services to use this conversion
     */
    public RecipeCard toCard(Recipe recipe) {
        List<RecipeStep> steps = parseSteps(recipe);
        Map<String, Object> nutrition = parseNutrition(recipe);
        List<RecipeIngredientDto> ingredients = extractIngredients(recipe);

        // ALWAYS provide nutrition - use defaults if missing
        if (nutrition.isEmpty()) {
            nutrition = createDefaultNutritionMap();
        }

        return RecipeCard.builder()
                .id(recipe.getId() != null ? recipe.getId().toString() : null)
                .title(recipe.getTitle())
                .timeMinutes(recipe.getTimeMinutes())
                .difficulty(recipe.getDifficulty())
                .imageUrl(recipe.getImageUrl())
                .steps(steps)
                .nutrition(nutrition)
                .ingredients(ingredients)
                .build();
    }

    @Value
    private static class ScoredRecipe {
        Recipe recipe;
        int matchCount;
    }

    private void addIfUnique(List<Recipe> orderedRecipes, Set<String> seenRecipeIds, Recipe recipe) {
        if (recipe == null) {
            return;
        }
        String id = recipe.getId() != null ? recipe.getId().toString() : recipe.getTitle();
        if (id == null || seenRecipeIds.contains(id)) {
            return;
        }
        orderedRecipes.add(recipe);
        seenRecipeIds.add(id);
    }

    private List<RecipeStep> parseSteps(Recipe recipe) {
        JsonNode stepsNode = recipe.getSteps();
        if (stepsNode == null || stepsNode.isEmpty()) {
            return List.of();
        }
        try {
            return objectMapper.convertValue(stepsNode, new TypeReference<List<RecipeStep>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse steps for recipe {} ({}): {}", recipe.getTitle(), recipe.getId(), ex.getMessage());
            return List.of();
        }
    }

    private Map<String, Object> parseNutrition(Recipe recipe) {
        JsonNode nutritionNode = recipe.getNutritionSummary();
        if (nutritionNode == null || nutritionNode.isEmpty()) {
            return Map.of();
        }
        try {
            Map<String, Object> nutrition = objectMapper.convertValue(nutritionNode, new TypeReference<LinkedHashMap<String, Object>>() {});
            return nutrition != null ? nutrition : Map.of();
        } catch (Exception ex) {
            log.warn("Failed to parse nutrition for recipe {} ({}): {}", recipe.getTitle(), recipe.getId(), ex.getMessage());
            return Map.of();
        }
    }

    /**
     * Extract ingredients with full details (name, quantity, unit) from recipe
     */
    private List<RecipeIngredientDto> extractIngredients(Recipe recipe) {
        if (CollectionUtils.isEmpty(recipe.getIngredients())) {
            return List.of();
        }
        return recipe.getIngredients().stream()
                .filter(ri -> ri.getIngredient() != null && StringUtils.hasText(ri.getIngredient().getName()))
                .map(ri -> RecipeIngredientDto.builder()
                        .name(ri.getIngredient().getName())
                        .quantity(ri.getQuantity())
                        .unit(ri.getUnit())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Create default nutrition values when data is missing
     * Ensures users ALWAYS see nutrition information
     */
    private Map<String, Object> createDefaultNutritionMap() {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("calories", 350);
        defaults.put("protein", 20.0);
        defaults.put("carbs", 40.0);
        defaults.put("fat", 12.0);
        defaults.put("servings", 1);
        log.debug("Using default nutrition values");
        return defaults;
    }

    /**
     * Get a single recipe by ID with caching
     * Uses optimized query with @EntityGraph to avoid N+1
     */
    @Cacheable(value = "recipes", key = "#recipeId")
    @Transactional(readOnly = true)
    public RecipeCard getRecipeById(UUID recipeId) {
        log.debug("Cache miss - fetching recipe from database: {}", recipeId);
        Recipe recipe = repository.findByIdWithIngredients(recipeId)
            .orElseThrow(() -> new RuntimeException("Recipe not found: " + recipeId));
        return toCard(recipe);
    }

    /**
     * Clear all recipe caches (use when recipes are updated/imported)
     */
    @CacheEvict(value = {"recipes", "recipeSearch"}, allEntries = true)
    public void clearRecipeCache() {
        log.info("Recipe cache cleared - all recipe-related caches evicted");
    }
}
