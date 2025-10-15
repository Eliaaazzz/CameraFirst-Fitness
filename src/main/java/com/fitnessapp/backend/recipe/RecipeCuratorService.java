package com.fitnessapp.backend.recipe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.RecipeIngredientId;
import com.fitnessapp.backend.recipe.dto.RecipeCurationResult;
import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@Slf4j
public class RecipeCuratorService {

    private static final List<String> CURATED_INGREDIENTS = List.of("chicken", "pasta", "eggs", "beef", "salmon", "tofu");
    private static final int MAX_READY_TIME_MINUTES = 45;
    private static final int MIN_STEP_COUNT = 5;
    private static final int MAX_STEP_COUNT = 8;
    private static final int MAX_RECIPES_PER_INGREDIENT = 10;
    private static final int TARGET_TOTAL_RECIPES = 60;
    private static final int SEARCH_BATCH_SIZE = 30;
    private static final int MIN_AGGREGATE_LIKES = 20;

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${app.spoonacular.api-key:}")
    private String spoonacularApiKey;

    public RecipeCuratorService(RecipeRepository recipeRepository,
                                IngredientRepository ingredientRepository,
                                ObjectMapper objectMapper,
                                RestTemplateBuilder restTemplateBuilder) {
        this.recipeRepository = recipeRepository;
        this.ingredientRepository = ingredientRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .additionalMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    public RecipeCurationResult curateTopRecipes() {
        if (!StringUtils.hasText(spoonacularApiKey)) {
            throw new IllegalStateException("Spoonacular API key is not configured");
        }

        int curated = 0;
        int skipped = 0;
        int rejected = 0;
        int inspected = 0;
        List<String> reviewNotes = new ArrayList<>();

        for (String ingredient : CURATED_INGREDIENTS) {
            if (curated >= TARGET_TOTAL_RECIPES) {
                break;
            }

            List<SearchResult> results = fetchRecipesForIngredient(ingredient);
            int importedForIngredient = 0;

            for (SearchResult result : results) {
                if (curated >= TARGET_TOTAL_RECIPES || importedForIngredient >= MAX_RECIPES_PER_INGREDIENT) {
                    break;
                }

                inspected++;
                Optional<String> qualityIssue = evaluateQuality(result);
                if (qualityIssue.isPresent()) {
                    rejected++;
                    reviewNotes.add(result.id() + ":" + qualityIssue.get());
                    continue;
                }

                if (recipeRepository.existsByTitleIgnoreCase(result.title())) {
                    skipped++;
                    continue;
                }

                try {
                    persistRecipe(result, ingredient);
                    curated++;
                    importedForIngredient++;
                } catch (Exception ex) {
                    rejected++;
                    reviewNotes.add(result.id() + ":persist_failed");
                    log.warn("Failed to persist recipe {} ({}): {}", result.title(), result.id(), ex.getMessage());
                }
            }
        }

        return RecipeCurationResult.builder()
                .targetRecipes(TARGET_TOTAL_RECIPES)
                .curatedCount(curated)
                .skippedExisting(skipped)
                .rejectedCount(rejected)
                .inspectedCount(inspected)
                .reviewNotes(reviewNotes.stream().limit(25).collect(Collectors.toList()))
                .build();
    }

    private List<SearchResult> fetchRecipesForIngredient(String ingredient) {
        String url = UriComponentsBuilder.fromHttpUrl("https://api.spoonacular.com/recipes/complexSearch")
                .queryParam("query", ingredient)
                .queryParam("number", SEARCH_BATCH_SIZE)
                .queryParam("sort", "popularity")
                .queryParam("instructionsRequired", true)
                .queryParam("maxReadyTime", MAX_READY_TIME_MINUTES)
                .queryParam("addRecipeInformation", true)
                .queryParam("fillIngredients", true)
                .queryParam("apiKey", spoonacularApiKey)
                .build()
                .toUriString();
        try {
            ComplexSearchResponse response = restTemplate.getForObject(url, ComplexSearchResponse.class);
            if (response == null || CollectionUtils.isEmpty(response.results())) {
                return List.of();
            }
            return response.results();
        } catch (Exception ex) {
            log.warn("Failed complex search for {}: {}", ingredient, ex.getMessage());
            return List.of();
        }
    }

    private Optional<String> evaluateQuality(SearchResult result) {
        if (result.readyInMinutes() == null || result.readyInMinutes() > MAX_READY_TIME_MINUTES) {
            return Optional.of("ready_time_exceeds_limit");
        }
        if (!StringUtils.hasText(result.title()) || !StringUtils.hasText(result.image())) {
            return Optional.of("missing_title_or_image");
        }
        int stepCount = extractSteps(result).size();
        if (stepCount < MIN_STEP_COUNT) {
            return Optional.of("too_few_steps");
        }
        if (stepCount > MAX_STEP_COUNT) {
            return Optional.of("too_many_steps");
        }
        if (result.aggregateLikes() == null || result.aggregateLikes() < MIN_AGGREGATE_LIKES) {
            return Optional.of("likes_too_low");
        }
        return Optional.empty();
    }

    private void persistRecipe(SearchResult summary, String primaryIngredient) throws JsonProcessingException {
        String stepsJson = toStepsJson(summary);
        String nutritionJson = toNutritionJson(summary, primaryIngredient);

        Recipe recipe = Recipe.builder()
                .title(summary.title())
                .imageUrl(summary.image())
                .timeMinutes(summary.readyInMinutes())
                .difficulty("easy")
                .steps(stepsJson)
                .swaps("[]")
                .nutritionSummary(nutritionJson)
                .build();

        recipe = recipeRepository.save(recipe);
        attachIngredients(recipe, summary.extendedIngredients(), primaryIngredient);
        recipeRepository.save(recipe);
    }

    private void attachIngredients(Recipe recipe,
                                   List<ExtendedIngredient> extendedIngredients,
                                   String primaryIngredient) {
        Set<String> names = new LinkedHashSet<>();
        if (StringUtils.hasText(primaryIngredient)) {
            names.add(normalizeIngredient(primaryIngredient));
        }
        if (!CollectionUtils.isEmpty(extendedIngredients)) {
            extendedIngredients.stream()
                    .map(ExtendedIngredient::name)
                    .filter(StringUtils::hasText)
                    .map(this::normalizeIngredient)
                    .limit(5)
                    .forEach(names::add);
        }

        for (String name : names) {
            Ingredient ingredient = ingredientRepository.findByName(name)
                    .orElseGet(() -> ingredientRepository.save(Ingredient.builder().name(name).build()));
            RecipeIngredient relation = RecipeIngredient.builder()
                    .id(new RecipeIngredientId(recipe.getId(), ingredient.getId()))
                    .recipe(recipe)
                    .ingredient(ingredient)
                    .quantity(null)
                    .unit(null)
                    .build();
            recipe.getIngredients().add(relation);
        }
    }

    private String normalizeIngredient(String value) {
        return value.toLowerCase(Locale.ROOT).trim();
    }

    private String toStepsJson(SearchResult summary) throws JsonProcessingException {
        List<InstructionStep> steps = extractSteps(summary);
        List<Map<String, Object>> serialized = new ArrayList<>();
        int fallbackNumber = 1;
        for (InstructionStep step : steps) {
            Map<String, Object> entry = new LinkedHashMap<>();
            int number = step.number() != null && step.number() > 0 ? step.number() : fallbackNumber++;
            entry.put("step", number);
            entry.put("instruction", step.step());
            serialized.add(entry);
        }
        return objectMapper.writeValueAsString(serialized);
    }

    private String toNutritionJson(SearchResult summary, String primaryIngredient) throws JsonProcessingException {
        Map<String, Object> nutrition = new LinkedHashMap<>();
        if (StringUtils.hasText(primaryIngredient)) {
            nutrition.put("primaryIngredient", primaryIngredient);
        }
        if (summary.aggregateLikes() != null) {
            nutrition.put("aggregateLikes", summary.aggregateLikes());
        }
        if (summary.healthScore() != null) {
            nutrition.put("healthScore", summary.healthScore());
        }
        if (summary.readyInMinutes() != null) {
            nutrition.put("readyInMinutes", summary.readyInMinutes());
        }
        if (nutrition.isEmpty()) {
            return null;
        }
        return objectMapper.writeValueAsString(nutrition);
    }

    private List<InstructionStep> extractSteps(SearchResult summary) {
        if (CollectionUtils.isEmpty(summary.analyzedInstructions())) {
            return List.of();
        }
        return summary.analyzedInstructions().stream()
                .filter(instruction -> !CollectionUtils.isEmpty(instruction.steps()))
                .findFirst()
                .map(Instruction::steps)
                .orElse(List.of());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ComplexSearchResponse(List<SearchResult> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record SearchResult(
            int id,
            String title,
            String image,
            Integer readyInMinutes,
            Integer aggregateLikes,
            Double healthScore,
            List<Instruction> analyzedInstructions,
            List<ExtendedIngredient> extendedIngredients) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Instruction(List<InstructionStep> steps) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record InstructionStep(Integer number, String step) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ExtendedIngredient(String name) {
    }
}
