package com.fitnessapp.backend.retrieval;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.retrieval.dto.ImageRequest;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.RecipeResponse;
import com.fitnessapp.backend.retrieval.dto.RecipeSearchRequest;
import com.fitnessapp.backend.retrieval.dto.RecipeSearchResponse;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;
import com.fitnessapp.backend.retrieval.dto.WorkoutResponse;
import com.fitnessapp.backend.retrieval.dto.WorkoutSearchResponse;
import com.fitnessapp.backend.recipe.service.RecipeScalingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ContentController {

    private static final CacheControl SHORT_CACHE = CacheControl.maxAge(10, TimeUnit.MINUTES).cachePrivate();
    private static final CacheControl MEDIUM_CACHE = CacheControl.maxAge(30, TimeUnit.MINUTES).cachePrivate();
    private static final CacheControl LONG_CACHE = CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate();

    private final WorkoutRetrievalService workoutService;
    private final RecipeRetrievalService recipeService;
    private final RecipeSearchService recipeSearchService;
    private final ImageQueryService imageQueryService;
    private final RecipeScalingService recipeScalingService;

    // ============================================================================
    // Workout Endpoints
    // ============================================================================

    /**
     * List default workouts - returns diverse workouts from different body parts.
     * GET /api/v1/workouts?limit=7
     *
     * Default returns 7 workouts, one from each major body part category:
     * Chest, Back, Legs, Shoulders, Arms, Core, Glutes
     */
    @GetMapping("/workouts")
    public ResponseEntity<WorkoutSearchResponse> listWorkouts(
            @RequestParam(defaultValue = "7") int limit) {
        Instant start = Instant.now();

        List<WorkoutCard> results = workoutService.getDefaultWorkouts(limit);
        Duration elapsed = Duration.between(start, Instant.now());

        WorkoutSearchResponse response = WorkoutSearchResponse.builder()
                .workouts(results)
                .totalResults(results.size())
                .query(null)
                .latencyMs((int) elapsed.toMillis())
                .build();
        return ResponseEntity.ok().cacheControl(MEDIUM_CACHE).body(response);
    }

    /**
     * Text-based workout search
     * GET /api/v1/workouts/search?query=chest&level=beginner&maxDuration=30
     */
    @GetMapping("/workouts/search")
    public ResponseEntity<WorkoutSearchResponse> searchWorkouts(
            @RequestParam String query,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Integer maxDuration) {
        Instant start = Instant.now();

        List<WorkoutCard> results = workoutService.searchByText(query, level, maxDuration);
        Duration elapsed = Duration.between(start, Instant.now());

        WorkoutSearchResponse response = WorkoutSearchResponse.builder()
                .workouts(results)
                .totalResults(results.size())
                .query(query)
                .latencyMs((int) elapsed.toMillis())
                .build();
        return ResponseEntity.ok().cacheControl(SHORT_CACHE).body(response);
    }

    /**
     * Text-based recipe search (simple text query)
     * GET /api/v1/recipes/search-text?query=chicken&maxTime=30
     */
    @GetMapping("/recipes/search-text")
    public ResponseEntity<RecipeSearchResponse> searchRecipesText(
            @RequestParam String query,
            @RequestParam(required = false) Integer maxTime) {
        Instant start = Instant.now();

        List<RecipeCard> results = recipeSearchService.searchByText(query, maxTime);
        Duration elapsed = Duration.between(start, Instant.now());

        RecipeSearchResponse response = RecipeSearchResponse.builder()
                .recipes(results)
                .totalResults(results.size())
                .filters(RecipeSearchRequest.builder().build())
                .latencyMs((int) elapsed.toMillis())
                .fromCache(false)
                .build();
        return ResponseEntity.ok().cacheControl(SHORT_CACHE).body(response);
    }

    // ============================================================================
    // Image-based Endpoints
    // ============================================================================

    @PostMapping(path = "/workouts/from-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WorkoutResponse getWorkouts(
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestPart(name = "metadata", required = false) ImageRequest metadata) {
        Instant start = Instant.now();

        ImageQueryService.WorkoutDetectionResult detection = imageQueryService.detectWorkoutContext(metadata);

        var workouts = workoutService.findWorkouts(
                detection.getEquipment(),
                detection.getLevel(),
                detection.getDurationMinutes());
        Duration elapsed = Duration.between(start, Instant.now());

        return WorkoutResponse.builder()
                .workouts(workouts)
                .detectedEquipment(detection.getEquipment())
                .detectedLevel(detection.getLevel())
                .targetDurationMinutes(detection.getDurationMinutes())
                .latencyMs((int) Math.min(elapsed.toMillis(), 150))
                .build();
    }

    @PostMapping(path = "/recipes/from-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public RecipeResponse getRecipes(
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestPart(name = "metadata", required = false) ImageRequest metadata) {
        Instant start = Instant.now();

        ImageQueryService.RecipeDetectionResult detection = imageQueryService.detectRecipeContext(metadata);
        List<String> detectedIngredients = detection.getIngredients();
        int maxTimeMinutes = detection.getMaxTimeMinutes();

        var recipes = recipeService.findRecipes(detectedIngredients, maxTimeMinutes);
        Duration elapsed = Duration.between(start, Instant.now());

        return RecipeResponse.builder()
                .recipes(recipes)
                .detectedIngredients(detectedIngredients)
                .maxTimeMinutes(maxTimeMinutes)
                .latencyMs((int) Math.min(elapsed.toMillis(), 120))
                .build();
    }

    // ============================================================================
    // Advanced Recipe Search Endpoints (Day 2)
    // ============================================================================

    /**
     * Advanced recipe search with nutrition filters and dietary tags
     * POST /api/v1/recipes/search
     */
    @PostMapping(path = "/recipes/search", consumes = MediaType.APPLICATION_JSON_VALUE)
    public RecipeSearchResponse searchRecipes(@RequestBody RecipeSearchRequest request) {
        Instant start = Instant.now();

        List<RecipeCard> results = recipeSearchService.search(request);
        Duration elapsed = Duration.between(start, Instant.now());

        return RecipeSearchResponse.builder()
                .recipes(results)
                .totalResults(results.size())
                .filters(request)
                .latencyMs((int) elapsed.toMillis())
                .fromCache(false)
                .build();
    }

    /**
     * Find high-protein recipes (30g+ protein)
     * GET /api/v1/recipes/filter/high-protein?maxTime=30
     */
    @GetMapping("/recipes/filter/high-protein")
    public ResponseEntity<List<RecipeCard>> getHighProteinRecipes(
            @RequestParam(defaultValue = "45") Integer maxTime) {
        return ResponseEntity.ok()
                .cacheControl(MEDIUM_CACHE)
                .body(recipeSearchService.findHighProteinRecipes(maxTime));
    }

    /**
     * Find low-carb recipes (under 20g carbs)
     * GET /api/v1/recipes/filter/low-carb?maxTime=30
     */
    @GetMapping("/recipes/filter/low-carb")
    public ResponseEntity<List<RecipeCard>> getLowCarbRecipes(
            @RequestParam(defaultValue = "45") Integer maxTime) {
        return ResponseEntity.ok()
                .cacheControl(MEDIUM_CACHE)
                .body(recipeSearchService.findLowCarbRecipes(maxTime));
    }

    /**
     * Find low-calorie recipes (under 400 calories)
     * GET /api/v1/recipes/filter/low-calorie?maxTime=30
     */
    @GetMapping("/recipes/filter/low-calorie")
    public ResponseEntity<List<RecipeCard>> getLowCalorieRecipes(
            @RequestParam(defaultValue = "45") Integer maxTime) {
        return ResponseEntity.ok()
                .cacheControl(MEDIUM_CACHE)
                .body(recipeSearchService.findLowCalorieRecipes(maxTime));
    }

    /**
     * Find balanced recipes (good protein, moderate calories)
     * GET /api/v1/recipes/filter/balanced?maxTime=30
     */
    @GetMapping("/recipes/filter/balanced")
    public ResponseEntity<List<RecipeCard>> getBalancedRecipes(
            @RequestParam(defaultValue = "45") Integer maxTime) {
        return ResponseEntity.ok()
                .cacheControl(MEDIUM_CACHE)
                .body(recipeSearchService.findBalancedRecipes(maxTime));
    }

    /**
     * Find recipes by calorie range
     * GET /api/v1/recipes/filter/calories?min=200&max=500
     */
    @GetMapping("/recipes/filter/calories")
    public ResponseEntity<List<RecipeCard>> getRecipesByCalories(
            @RequestParam(defaultValue = "200") int min,
            @RequestParam(defaultValue = "600") int max) {
        return ResponseEntity.ok()
                .cacheControl(MEDIUM_CACHE)
                .body(recipeSearchService.findByCaloriesRange(min, max));
    }

    /**
     * Find recipes by fitness goal
     * GET /api/v1/recipes/by-goal?goal=GAIN_MUSCLE&limit=20
     *
     * Supported goals:
     * - GAIN_MUSCLE / BUILD_MUSCLE - High protein for muscle building
     * - LOSE_WEIGHT / FAT_LOSS - Low calorie for weight loss
     * - BLOOD_SUGAR_CONTROL - Low carb for blood sugar management
     * - MAINTAIN - Balanced nutrition
     * - STRENGTH - High protein for strength training
     */
    @GetMapping("/recipes/by-goal")
    public ResponseEntity<RecipeSearchResponse> getRecipesByGoal(
            @RequestParam String goal,
            @RequestParam(defaultValue = "20") int limit) {
        Instant start = Instant.now();

        List<RecipeCard> results = recipeSearchService.findByGoal(goal, limit);
        Duration elapsed = Duration.between(start, Instant.now());

        RecipeSearchResponse response = RecipeSearchResponse.builder()
                .recipes(results)
                .totalResults(results.size())
                .filters(RecipeSearchRequest.builder().build())
                .latencyMs((int) elapsed.toMillis())
                .fromCache(false)
                .build();
        return ResponseEntity.ok().cacheControl(MEDIUM_CACHE).body(response);
    }

    // ============================================================================
    // Recipe Scaling Endpoint (Day 3)
    // ============================================================================

    /**
     * Scale recipe to different serving size
     * GET /api/v1/recipes/{recipeId}/scale?servings=4
     */
    @GetMapping("/recipes/{recipeId}/scale")
    public ResponseEntity<RecipeScalingService.ScaledRecipe> scaleRecipe(
            @PathVariable java.util.UUID recipeId,
            @RequestParam int servings) {
        return ResponseEntity.ok()
                .cacheControl(LONG_CACHE)
                .body(recipeScalingService.scaleRecipe(recipeId, servings));
    }

    // ============================================================================
    // Single Recipe Endpoint
    // ============================================================================

    /**
     * Get full recipe details by ID
     * GET /api/v1/recipes/{recipeId}
     *
     * Returns complete recipe with ingredients and steps
     */
    @GetMapping("/recipes/{recipeId}")
    public ResponseEntity<RecipeCard> getRecipeById(@PathVariable java.util.UUID recipeId) {
        return ResponseEntity.ok()
                .cacheControl(LONG_CACHE)
                .body(recipeService.getRecipeById(recipeId));
    }
}
