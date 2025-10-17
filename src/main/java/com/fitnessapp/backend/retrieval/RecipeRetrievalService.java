package com.fitnessapp.backend.retrieval;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.RecipeStep;
import com.fitnessapp.backend.repository.RecipeRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
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

    public List<RecipeCard> findRecipes(List<String> detectedIngredients, int maxTime) {
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

        List<ScoredRecipe> scoredRecipes = matches.stream()
                .filter(recipe -> recipe.getTimeMinutes() != null && recipe.getTimeMinutes() <= effectiveMaxTime)
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

    private RecipeCard toCard(Recipe recipe) {
        List<RecipeStep> steps = parseSteps(recipe);
        Map<String, Object> nutrition = parseNutrition(recipe);

        return RecipeCard.builder()
                .id(recipe.getId() != null ? recipe.getId().toString() : null)
                .title(recipe.getTitle())
                .timeMinutes(recipe.getTimeMinutes())
                .difficulty(recipe.getDifficulty())
                .imageUrl(recipe.getImageUrl())
                .steps(steps)
                .nutrition(nutrition.isEmpty() ? null : nutrition)
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
        String stepsJson = recipe.getSteps();
        if (!StringUtils.hasText(stepsJson)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(stepsJson, new TypeReference<List<RecipeStep>>() {});
        } catch (Exception ex) {
            log.warn("Failed to parse steps for recipe {} ({}): {}", recipe.getTitle(), recipe.getId(), ex.getMessage());
            return List.of();
        }
    }

    private Map<String, Object> parseNutrition(Recipe recipe) {
        String nutritionJson = recipe.getNutritionSummary();
        if (!StringUtils.hasText(nutritionJson)) {
            return Map.of();
        }
        try {
            Map<String, Object> nutrition = objectMapper.readValue(nutritionJson, new TypeReference<LinkedHashMap<String, Object>>() {});
            return nutrition != null ? nutrition : Map.of();
        } catch (Exception ex) {
            log.warn("Failed to parse nutrition for recipe {} ({}): {}", recipe.getTitle(), recipe.getId(), ex.getMessage());
            return Map.of();
        }
    }
}
