package com.fitnessapp.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.RecipeIngredientId;
import com.fitnessapp.backend.domain.WorkoutVideo;
import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import java.io.IOException;
import java.io.InputStream;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeedDataLoader implements ApplicationRunner {

    private static final int REQUIRED_WORKOUT_COUNT = 120;
    private static final int REQUIRED_RECIPE_COUNT = 60;

    private final WorkoutVideoRepository workoutVideoRepository;
    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            log.info("Seed data loader disabled (app.seed.enabled=false)");
            return;
        }
        seedWorkouts();
        seedRecipes();
    }

    private void seedWorkouts() {
        long existing = workoutVideoRepository.count();
        log.info("📹 Current workout count in database: {}", existing);
        if (existing >= REQUIRED_WORKOUT_COUNT) {
            log.info("Workout library already satisfies target ({} entries).", existing);
            return;
        }

        Resource resource = resourceLoader.getResource("classpath:seed/workouts.json");
        if (!resource.exists()) {
            log.warn("Workout seed resource not found; skipping workout seeding.");
            return;
        }

        int created = 0;
        try (InputStream inputStream = resource.getInputStream()) {
            WorkoutSeedDocument document = objectMapper.readValue(inputStream, WorkoutSeedDocument.class);
            if (document == null || CollectionUtils.isEmpty(document.workouts())) {
                log.warn("Workout seed resource is empty; skipping workout seeding.");
                return;
            }
            for (WorkoutSeed seed : document.workouts()) {
                if (seed == null || !StringUtils.hasText(seed.youtubeId())) {
                    continue;
                }
                if (workoutVideoRepository.findByYoutubeId(seed.youtubeId()).isPresent()) {
                    continue;
                }
                WorkoutVideo entity = WorkoutVideo.builder()
                        .youtubeId(seed.youtubeId())
                        .title(StringUtils.hasText(seed.title()) ? seed.title() : seed.youtubeId())
                        .durationMinutes(Optional.ofNullable(seed.durationMinutes()).orElse(20))
                        .level(normalizeOrDefault(seed.level(), "beginner"))
                        .equipment(toMutableList(seed.equipment()))
                        .bodyPart(toMutableList(seed.bodyParts()))
                        .thumbnailUrl(seed.thumbnailUrl())
                        .channelId("seed-library")
                        .channelTitle("Camera First Library")
                        .channelSubscriberCount(250_000L)
                        .viewCount(Optional.ofNullable(seed.viewCount()).orElse(75_000L))
                        .lastValidatedAt(OffsetDateTime.now())
                        .build();
                workoutVideoRepository.save(entity);
                created++;
            }
        } catch (IOException ex) {
            log.error("Failed to seed workout videos", ex);
            return;
        }

        log.info("Seeded {} workout videos ({} existing before seeding).", created, existing);
    }

    private void seedRecipes() {
        long existing = recipeRepository.count();
        log.info("🍽️  Current recipe count in database: {}", existing);
        if (existing >= REQUIRED_RECIPE_COUNT) {
            log.info("Recipe library already satisfies target ({} entries).", existing);
            return;
        }

        log.info("📥 Need to seed {} more recipes (current: {}, target: {})", 
                 REQUIRED_RECIPE_COUNT - existing, existing, REQUIRED_RECIPE_COUNT);

        Resource resource = resourceLoader.getResource("classpath:seed/recipes.json");
        if (!resource.exists()) {
            log.warn("Recipe seed resource not found; skipping recipe seeding.");
            return;
        }

        int created = 0;
        try (InputStream inputStream = resource.getInputStream()) {
            RecipeSeedDocument document = objectMapper.readValue(inputStream, RecipeSeedDocument.class);
            if (document == null || CollectionUtils.isEmpty(document.recipes())) {
                log.warn("Recipe seed resource is empty; skipping recipe seeding.");
                return;
            }
            for (RecipeSeed seed : document.recipes()) {
                if (seed == null || !StringUtils.hasText(seed.title())) {
                    continue;
                }
                if (recipeRepository.existsByTitleIgnoreCase(seed.title())) {
                    continue;
                }
                try {
                    Recipe recipe = persistRecipe(seed);
                    if (recipe != null) {
                        created++;
                    }
                } catch (Exception ex) {
                    log.warn("Failed to persist seeded recipe '{}': {}", seed.title(), ex.getMessage());
                }
            }
        } catch (IOException ex) {
            log.error("Failed to seed recipes", ex);
            return;
        }

        log.info("Seeded {} recipes ({} existing before seeding).", created, existing);
    }

    private Recipe persistRecipe(RecipeSeed seed) throws IOException {
        Recipe recipe = Recipe.builder()
                .title(seed.title())
                .imageUrl(seed.imageUrl())
                .timeMinutes(Optional.ofNullable(seed.timeMinutes()).orElse(25))
                .difficulty(normalizeOrDefault(seed.difficulty(), "easy"))
                .steps(toStepsJson(seed.steps()))
                .swaps("[]")
                .nutritionSummary(toNutritionJson(seed))
                .build();

        recipe = recipeRepository.save(recipe);
        attachIngredients(recipe, seed.ingredients(), seed.primaryIngredient());
        return recipeRepository.save(recipe);
    }

    private void attachIngredients(Recipe recipe, List<String> ingredientNames, String primaryIngredient) {
        Set<String> names = new LinkedHashSet<>();
        if (StringUtils.hasText(primaryIngredient)) {
            names.add(normalizeIngredient(primaryIngredient));
        }
        if (!CollectionUtils.isEmpty(ingredientNames)) {
            ingredientNames.stream()
                    .filter(StringUtils::hasText)
                    .map(this::normalizeIngredient)
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

    private String toStepsJson(List<String> steps) throws IOException {
        if (CollectionUtils.isEmpty(steps)) {
            return "[]";
        }
        List<Map<String, Object>> serialized = new ArrayList<>();
        int index = 1;
        for (String instruction : steps) {
            if (!StringUtils.hasText(instruction)) {
                continue;
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("step", index++);
            entry.put("instruction", instruction);
            serialized.add(entry);
        }
        if (serialized.isEmpty()) {
            return "[]";
        }
        return objectMapper.writeValueAsString(serialized);
    }

    private String toNutritionJson(RecipeSeed seed) throws IOException {
        Map<String, Object> nutrition = new LinkedHashMap<>();
        if (StringUtils.hasText(seed.primaryIngredient())) {
            nutrition.put("primaryIngredient", seed.primaryIngredient());
        }
        nutrition.put("readyInMinutes", Optional.ofNullable(seed.timeMinutes()).orElse(25));
        nutrition.put("aggregateLikes", 180);
        nutrition.put("healthScore", 65);

        Map<String, Object> macros = new LinkedHashMap<>();
        if (seed.nutrition() != null) {
            macros.put("calories", macroEntry(seed.nutrition().calories(), "kcal"));
            macros.put("protein", macroEntry(seed.nutrition().protein(), "g"));
            macros.put("carbs", macroEntry(seed.nutrition().carbs(), "g"));
            macros.put("fat", macroEntry(seed.nutrition().fat(), "g"));
        }
        macros.entrySet().removeIf(entry -> entry.getValue() == null);
        if (!macros.isEmpty()) {
            nutrition.put("macros", macros);
        }

        return objectMapper.writeValueAsString(nutrition);
    }

    private Map<String, Object> macroEntry(Number amount, String unit) {
        if (amount == null) {
            return null;
        }
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("amount", amount);
        entry.put("unit", unit);
        return entry;
    }

    private List<String> toMutableList(List<String> source) {
        if (CollectionUtils.isEmpty(source)) {
            return new ArrayList<>();
        }
        return new ArrayList<>(source);
    }

    private String normalizeOrDefault(String value, String defaultValue) {
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeIngredient(String value) {
        return value.toLowerCase(Locale.ROOT).trim();
    }

    private record WorkoutSeedDocument(List<WorkoutSeed> workouts) {
    }

    private record WorkoutSeed(
            String youtubeId,
            String title,
            Integer durationMinutes,
            String level,
            List<String> equipment,
            List<String> bodyParts,
            String thumbnailUrl,
            Long viewCount) {
    }

    private record RecipeSeedDocument(List<RecipeSeed> recipes) {
    }

    private record RecipeSeed(
            String title,
            String primaryIngredient,
            Integer timeMinutes,
            String difficulty,
            String imageUrl,
            List<String> ingredients,
            List<String> steps,
            NutritionSeed nutrition) {
    }

    private record NutritionSeed(Integer calories, Integer protein, Integer carbs, Integer fat) {
    }
}
