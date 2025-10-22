package com.fitnessapp.backend.recipe;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.RecipeIngredientId;
import com.fitnessapp.backend.recipe.dto.RecipeCurationResult;
import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import jakarta.persistence.EntityManager;
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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@Slf4j
public class RecipeCuratorService {

    // Expanded ingredient list for better diversity and higher success rate
    private static final List<String> CURATED_INGREDIENTS = List.of(
            "chicken", "pasta", "eggs", "beef", "salmon", "tofu",
            "rice", "potato", "turkey", "shrimp", "broccoli", "quinoa",
            "lentils", "black beans", "chickpeas", "spinach", "kale", "mushroom",
            "zucchini", "bell pepper", "cauliflower", "sweet potato", "avocado",
            "ground turkey", "pork tenderloin", "cod", "tuna", "oats", "greek yogurt"
    );
    private static final int MAX_READY_TIME_MINUTES = 50;  // Increased from 45 to 50
    private static final int MIN_STEP_COUNT = 2;            // Further relaxed from 3 to 2
    private static final int MAX_STEP_COUNT = 15;           // Increased from 12 to 15
    private static final int MAX_RECIPES_PER_INGREDIENT = 12;
    private static final int TARGET_TOTAL_RECIPES = 90;
    private static final int SEARCH_BATCH_SIZE = 30;
    private static final int MIN_AGGREGATE_LIKES = 5;       // Further relaxed from 10 to 5

    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final TransactionTemplate transactionTemplate;
    private final ObjectProvider<EntityManager> entityManagerProvider;

    @Value("${app.spoonacular.api-key:}")
    private String spoonacularApiKey;

    public RecipeCuratorService(RecipeRepository recipeRepository,
                                IngredientRepository ingredientRepository,
                                ObjectMapper objectMapper,
                                RestTemplateBuilder restTemplateBuilder,
                                ObjectProvider<PlatformTransactionManager> transactionManagerProvider,
                                ObjectProvider<EntityManager> entityManagerProvider) {
        this.recipeRepository = recipeRepository;
        this.ingredientRepository = ingredientRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(10))
                .additionalMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
        PlatformTransactionManager txManager = transactionManagerProvider.getIfAvailable();
        this.transactionTemplate = txManager != null
                ? new TransactionTemplate(txManager)
                : new TransactionTemplate();
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.entityManagerProvider = entityManagerProvider;
    }

    @Transactional
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

            try {
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
                        transactionTemplate.executeWithoutResult(status -> {
                            persistRecipe(result, ingredient);
                            try {
                                recipeRepository.flush();
                                EntityManager em = entityManagerProvider.getIfAvailable();
                                if (em != null) {
                                    em.clear();
                                }
                            } catch (Exception flushEx) {
                                log.warn("Failed to flush persistence context after recipe {} ({}): {}",
                                        result.title(), result.id(), flushEx.getMessage());
                            }
                        });
                        curated++;
                        importedForIngredient++;
                        log.info("✅ Imported recipe: {} (ID: {})", result.title(), result.id());
                    } catch (Exception ex) {
                        rejected++;
                        reviewNotes.add(result.id() + ":persist_failed");
                        log.warn("Failed to persist recipe {} ({}): {}", result.title(), result.id(), ex.getMessage());
                    }
                }
            } catch (Exception ex) {
                // API quota exceeded or network error - log and continue with next ingredient
                log.warn("⚠️ Failed to fetch recipes for ingredient '{}': {}", ingredient, ex.getMessage());
                if (ex.getMessage() != null && ex.getMessage().contains("402")) {
                    log.warn("💳 API quota exceeded. Stopping further requests.");
                    break; // Stop processing remaining ingredients
                }
            }
        }

        log.info("📊 Curation complete: {} imported, {} skipped, {} rejected, {} inspected", 
                 curated, skipped, rejected, inspected);

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

    private void persistRecipe(SearchResult summary, String primaryIngredient) {
        JsonNode stepsJson = toStepsJson(summary);
        JsonNode nutritionJson = toNutritionJson(summary, primaryIngredient);

        Recipe recipe = Recipe.builder()
                .title(summary.title())
                .imageUrl(summary.image())
                .timeMinutes(summary.readyInMinutes())
                .difficulty("easy")
                .steps(stepsJson)
                .swaps(objectMapper.createArrayNode())
                .nutritionSummary(nutritionJson)
                .build();

        // Attach ingredients BEFORE saving to ensure cascade works properly
        Set<String> ingredientNames = collectIngredientNames(summary.extendedIngredients(), primaryIngredient);
        for (String name : ingredientNames) {
            Ingredient ingredient = ingredientRepository.findByName(name)
                    .orElseGet(() -> ingredientRepository.save(Ingredient.builder().name(name).build()));
            RecipeIngredient relation = RecipeIngredient.builder()
                    .recipe(recipe)
                    .ingredient(ingredient)
                    .quantity(null)
                    .unit(null)
                    .build();
            relation.setId(new RecipeIngredientId(null, ingredient.getId()));
            recipe.getIngredients().add(relation);
        }

        // Single save with cascaded ingredients
        recipeRepository.save(recipe);
    }

    private Set<String> collectIngredientNames(List<ExtendedIngredient> extendedIngredients, String primaryIngredient) {
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
        return names;
    }

    private String normalizeIngredient(String value) {
        return value.toLowerCase(Locale.ROOT).trim();
    }

    private JsonNode toStepsJson(SearchResult summary) {
        List<InstructionStep> steps = extractSteps(summary);
        ArrayNode serialized = objectMapper.createArrayNode();
        int fallbackNumber = 1;
        for (InstructionStep step : steps) {
            ObjectNode entry = objectMapper.createObjectNode();
            int number = step.number() != null && step.number() > 0 ? step.number() : fallbackNumber++;
            entry.put("step", number);
            entry.put("instruction", step.step());
            serialized.add(entry);
        }
        return serialized;
    }

    private JsonNode toNutritionJson(SearchResult summary, String primaryIngredient) {
        ObjectNode nutrition = objectMapper.createObjectNode();
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
        ObjectNode macros = extractMacroNutrition(summary);
        if (macros != null && !macros.isEmpty()) {
            nutrition.set("macros", macros);
        }
        return nutrition.isEmpty() ? null : nutrition;
    }

    private ObjectNode extractMacroNutrition(SearchResult summary) {
        if (summary.nutrition() == null || CollectionUtils.isEmpty(summary.nutrition().nutrients())) {
            return null;
        }

        Map<String, String> macroAlias = new LinkedHashMap<>();
        macroAlias.put("Calories", "calories");
        macroAlias.put("Protein", "protein");
        macroAlias.put("Carbohydrates", "carbs");
        macroAlias.put("Fat", "fat");

        ObjectNode macros = objectMapper.createObjectNode();
        for (Nutrient nutrient : summary.nutrition().nutrients()) {
            if (nutrient == null || !StringUtils.hasText(nutrient.name())) {
                continue;
            }
            String alias = macroAlias.get(nutrient.name());
            if (alias == null || nutrient.amount() == null) {
                continue;
            }
            ObjectNode entry = objectMapper.createObjectNode();
            entry.put("amount", nutrient.amount());
            if (StringUtils.hasText(nutrient.unit())) {
                entry.put("unit", nutrient.unit());
            }
            macros.set(alias, entry);
        }
        return macros.isEmpty() ? null : macros;
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
            Nutrition nutrition,
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Nutrition(List<Nutrient> nutrients) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Nutrient(String name, Double amount, String unit) {
    }

}
