package com.fitnessapp.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
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
        AtomicInteger intermediateCoreCounter = new AtomicInteger();
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
                List<String> enhancedBodyParts = enhanceBodyParts(seed.bodyParts(), seed.title());
                List<String> enhancedEquipment = enhanceEquipment(seed.equipment(), enhancedBodyParts, seed.title());
                int normalizedDuration = normalizeDuration(seed, enhancedBodyParts, intermediateCoreCounter);

                WorkoutVideo entity = WorkoutVideo.builder()
                        .youtubeId(seed.youtubeId())
                        .title(StringUtils.hasText(seed.title()) ? seed.title() : seed.youtubeId())
                        .durationMinutes(normalizedDuration)
                        .level(normalizeOrDefault(seed.level(), "beginner"))
                        .equipment(enhancedEquipment)
                        .bodyPart(enhancedBodyParts)
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
        long existing = recipeRepository.countActual();
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
            List<RecipeSeed> seeds = augmentRecipeSeeds(document.recipes());
            for (RecipeSeed seed : seeds) {
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

    private Recipe persistRecipe(RecipeSeed seed) {
        Recipe recipe = Recipe.builder()
                .title(seed.title())
                .imageUrl(seed.imageUrl())
                .timeMinutes(Optional.ofNullable(seed.timeMinutes()).orElse(25))
                .difficulty(normalizeOrDefault(seed.difficulty(), "easy"))
                .steps(toStepsJson(seed.steps()))
                .swaps(objectMapper.createArrayNode())
                .nutritionSummary(toNutritionJson(seed))
                .build();

        recipe = recipeRepository.save(recipe);
        attachIngredients(recipe, seed.ingredients(), seed.primaryIngredient());
        return recipeRepository.save(recipe);
    }

    private List<RecipeSeed> augmentRecipeSeeds(List<RecipeSeed> existing) {
        List<RecipeSeed> augmented = new ArrayList<>();
        if (!CollectionUtils.isEmpty(existing)) {
            augmented.addAll(existing);
        }
        Set<String> existingTitles = new LinkedHashSet<>();
        for (RecipeSeed seed : augmented) {
            if (seed != null && StringUtils.hasText(seed.title())) {
                existingTitles.add(seed.title().toLowerCase(Locale.ROOT));
            }
        }
        for (RecipeSeed coverage : coverageRecipes()) {
            String key = coverage.title().toLowerCase(Locale.ROOT);
            if (!existingTitles.contains(key)) {
                augmented.add(coverage);
                existingTitles.add(key);
            }
        }
        return augmented;
    }

    private List<RecipeSeed> coverageRecipes() {
        return List.of(
                createRecipeSeed(
                        "Citrus Herb Chicken Bowls",
                        "chicken",
                        32,
                        "easy",
                        Arrays.asList("chicken", "lemon", "quinoa", "broccoli"),
                        new NutritionSeed(420, 36, 38, 12)
                ),
                createRecipeSeed(
                        "Smoky Sheet-Pan Salmon",
                        "salmon",
                        28,
                        "medium",
                        Arrays.asList("salmon", "sweet potato", "green beans", "paprika"),
                        new NutritionSeed(390, 34, 28, 14)
                ),
                createRecipeSeed(
                        "Sesame Tofu Stir Fry",
                        "tofu",
                        24,
                        "easy",
                        Arrays.asList("tofu", "broccoli", "snap peas", "sesame"),
                        new NutritionSeed(360, 22, 32, 14)
                ),
                createRecipeSeed(
                        "Garlic Shrimp Zoodles",
                        "shrimp",
                        20,
                        "easy",
                        Arrays.asList("shrimp", "zucchini", "garlic", "chili flakes"),
                        new NutritionSeed(310, 28, 16, 12)
                ),
                createRecipeSeed(
                        "Garden Veggie Primavera",
                        "pasta",
                        30,
                        "medium",
                        Arrays.asList("pasta", "tomato", "spinach", "parmesan"),
                        new NutritionSeed(440, 18, 58, 14)
                ),
                createRecipeSeed(
                        "Spinach Mushroom Omelette",
                        "eggs",
                        18,
                        "easy",
                        Arrays.asList("eggs", "spinach", "mushroom", "feta"),
                        new NutritionSeed(290, 20, 10, 18)
                )
        );
    }

    private RecipeSeed createRecipeSeed(String title,
                                        String primaryIngredient,
                                        int timeMinutes,
                                        String difficulty,
                                        List<String> ingredients,
                                        NutritionSeed nutrition) {
        List<String> steps = List.of(
                "Prepare and season all ingredients.",
                "Cook using a single pan until the protein is done.",
                "Finish with fresh herbs and serve warm."
        );
        String imageUrl = "https://img.camera-first.dev/recipes/" + slugify(title) + ".jpg";
        return new RecipeSeed(
                title,
                primaryIngredient,
                timeMinutes,
                difficulty,
                imageUrl,
                ingredients,
                steps,
                nutrition
        );
    }

    private String slugify(String value) {
        if (!StringUtils.hasText(value)) {
            return "recipe";
        }
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
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

    private JsonNode toStepsJson(List<String> steps) {
        if (CollectionUtils.isEmpty(steps)) {
            return objectMapper.createArrayNode();
        }
        ArrayNode serialized = objectMapper.createArrayNode();
        int index = 1;
        for (String instruction : steps) {
            if (!StringUtils.hasText(instruction)) {
                continue;
            }
            ObjectNode entry = objectMapper.createObjectNode();
            entry.put("step", index++);
            entry.put("instruction", instruction);
            serialized.add(entry);
        }
        return serialized;
    }

    private JsonNode toNutritionJson(RecipeSeed seed) {
        ObjectNode nutrition = objectMapper.createObjectNode();
        if (StringUtils.hasText(seed.primaryIngredient())) {
            nutrition.put("primaryIngredient", seed.primaryIngredient());
        }
        nutrition.put("readyInMinutes", Optional.ofNullable(seed.timeMinutes()).orElse(25));
        nutrition.put("aggregateLikes", 180);
        nutrition.put("healthScore", 65);

        ObjectNode macros = objectMapper.createObjectNode();
        if (seed.nutrition() != null) {
            macroEntry(seed.nutrition().calories(), "kcal").ifPresent(node -> macros.set("calories", node));
            macroEntry(seed.nutrition().protein(), "g").ifPresent(node -> macros.set("protein", node));
            macroEntry(seed.nutrition().carbs(), "g").ifPresent(node -> macros.set("carbs", node));
            macroEntry(seed.nutrition().fat(), "g").ifPresent(node -> macros.set("fat", node));
        }
        if (!macros.isEmpty()) {
            nutrition.set("macros", macros);
        }

        return nutrition;
    }

    private Optional<ObjectNode> macroEntry(Number amount, String unit) {
        if (amount == null) {
            return Optional.empty();
        }
        ObjectNode entry = objectMapper.createObjectNode();
        entry.put("amount", amount.doubleValue());
        entry.put("unit", unit);
        return Optional.of(entry);
    }

    private List<String> enhanceEquipment(List<String> equipment, List<String> bodyParts, String title) {
        Set<String> normalized = new LinkedHashSet<>();
        if (!CollectionUtils.isEmpty(equipment)) {
            equipment.stream()
                    .filter(StringUtils::hasText)
                    .map(value -> value.toLowerCase(Locale.ROOT).trim())
                    .forEach(normalized::add);
        }
        String normalizedTitle = StringUtils.hasText(title) ? title.toLowerCase(Locale.ROOT) : "";
        boolean coreFocus = !CollectionUtils.isEmpty(bodyParts) && bodyParts.stream()
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains("core") || value.contains("abs") || value.contains("balance"));
        if (coreFocus || normalizedTitle.contains("yoga") || normalizedTitle.contains("pilates") || normalizedTitle.contains("stretch") || normalizedTitle.contains("mobility")) {
            normalized.add("mat");
        }
        if (normalized.isEmpty()) {
            normalized.add("bodyweight");
        }
        return new ArrayList<>(normalized);
    }

    private List<String> enhanceBodyParts(List<String> originalParts, String title) {
        Set<String> normalized = new LinkedHashSet<>();
        if (!CollectionUtils.isEmpty(originalParts)) {
            for (String part : originalParts) {
                if (!StringUtils.hasText(part)) {
                    continue;
                }
                switch (part.toLowerCase(Locale.ROOT)) {
                    case "upper_body":
                        normalized.add("chest");
                        normalized.add("shoulders");
                        normalized.add("arms");
                        break;
                    case "full_body":
                        normalized.add("full_body");
                        normalized.add("legs");
                        normalized.add("glutes");
                        normalized.add("cardio");
                        break;
                    case "core":
                        normalized.add("core");
                        normalized.add("abs");
                        normalized.add("balance");
                        break;
                    case "cardio":
                        normalized.add("cardio");
                        normalized.add("legs");
                        normalized.add("glutes");
                        break;
                    default:
                        normalized.add(part.toLowerCase(Locale.ROOT));
                }
            }
        }
        String normalizedTitle = StringUtils.hasText(title) ? title.toLowerCase(Locale.ROOT) : "";
        if (normalizedTitle.contains("leg")) {
            normalized.add("legs");
        }
        if (normalizedTitle.contains("glute") || normalizedTitle.contains("booty")) {
            normalized.add("glutes");
        }
        if (normalizedTitle.contains("core") || normalizedTitle.contains("abs")) {
            normalized.add("core");
            normalized.add("abs");
        }
        if (normalizedTitle.contains("arm")) {
            normalized.add("arms");
        }
        if (normalizedTitle.contains("shoulder")) {
            normalized.add("shoulders");
        }
        if (normalizedTitle.contains("chest")) {
            normalized.add("chest");
        }
        if (normalized.isEmpty()) {
            normalized.add("full_body");
        }
        return new ArrayList<>(normalized);
    }

    private int normalizeDuration(WorkoutSeed seed, List<String> enhancedBodyParts, AtomicInteger intermediateCoreCounter) {
        int duration = Optional.ofNullable(seed.durationMinutes()).orElse(20);
        String level = normalizeOrDefault(seed.level(), "beginner");
        boolean isIntermediate = "intermediate".equals(level);
        boolean focusesCore = !CollectionUtils.isEmpty(enhancedBodyParts) && enhancedBodyParts.stream()
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains("core") || value.contains("abs"));
        if (isIntermediate && focusesCore && (duration < 25 || duration > 35)) {
            int offset = intermediateCoreCounter.getAndIncrement();
            duration = 26 + (offset % 6);
        }
        if (duration <= 0) {
            duration = 20;
        }
        return duration;
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
