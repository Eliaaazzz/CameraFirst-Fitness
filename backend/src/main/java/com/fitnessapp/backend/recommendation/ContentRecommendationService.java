package com.fitnessapp.backend.recommendation;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.goals.entity.UserGoal;
import com.fitnessapp.backend.goals.repository.UserGoalRepository;
import com.fitnessapp.backend.recipe.repository.RecipeEmbedding;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recipe.repository.RecipeSummary;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest.UserProfileInput;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.NutritionInfo;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.RecipeRecommendation;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.WorkoutRecommendation;
import com.fitnessapp.backend.recommendation.strategy.GoalSemanticExpander;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Content-based recommendation service using TWO-STAGE FUNNEL + LATE FETCHING.
 *
 * CORE DIFFERENTIATOR: AI Semantic Search with Embeddings
 * This service preserves the AI capability while staying memory-safe on t2.micro.
 *
 * MEMORY OPTIMIZATION (AWS t2.micro, 1GB RAM):
 * - Recipe.embedding = float[1536] = ~6KB per row
 * - Naive approach: 200 candidates with embeddings = ~1.2MB (TOO HEAVY)
 * - Our approach: Late-fetch 50 embeddings = ~300KB (SAFE)
 *
 * ARCHITECTURE: TWO-STAGE FUNNEL + LATE FETCHING
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STAGE 1: COARSE SCREENING (Database Layer) - LIGHTWEIGHT              │
 * │  ─────────────────────────────────────────                              │
 * │  • Uses RecipeSummary projection (NO embedding loaded)                 │
 * │  • Uses goal-specific repository methods with B-tree indexes           │
 * │  • Fetches ~200 candidates → ~100KB memory                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STAGE 2a: INGREDIENT FILTERING (Memory Layer)                         │
 * │  ────────────────────────────────────────────                           │
 * │  • Apply ingredient exclusions on lightweight RecipeSummary            │
 * │  • Fast in-memory filtering                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STAGE 2b: PRE-SCORING (Memory Layer)                                  │
 * │  ────────────────────────────────────                                   │
 * │  • Quick nutrition-based scoring on lightweight data                   │
 * │  • Select TOP 50 candidates for AI scoring                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STAGE 2c: LATE FETCHING (Database Layer) ★ KEY OPTIMIZATION ★         │
 * │  ───────────────────────────────────────────────────────────            │
 * │  • Fetch embeddings ONLY for 50 finalist IDs                           │
 * │  • Memory: 50 * 6KB = ~300KB (SAFE for t2.micro!)                      │
 * │  • Preserves AI semantic search capability                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    ↓
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STAGE 2d: AI FINE RANKING (Memory Layer)                              │
 * │  ──────────────────────────────────────────                             │
 * │  • Generate query embedding from user goal                              │
 * │  • Compute cosine similarity for each finalist                          │
 * │  • Combined score: 60% nutrition + 40% AI similarity                   │
 * │  • Return top N results                                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentRecommendationService {

    // ========================================================================
    // Constants
    // ========================================================================

    private static final String RECOMMENDATION_ID_PREFIX = "rec_";
    private static final int MEALS_PER_DAY = 3;

    // Funnel sizes (optimized for 7 final recommendations)
    // Memory: 50 lightweight + 20 embeddings × 6KB = ~170KB total (very safe for t2.micro)
    private static final int COARSE_POOL_SIZE = 50;   // Stage 1: candidates from DB
    private static final int FINE_POOL_SIZE = 20;     // Stage 2b: finalists for AI scoring

    // Tolerance ranges for nutrition matching (percentage of target)
    private static final double CALORIE_TOLERANCE = 0.20; // 20% tolerance
    private static final double MACRO_TOLERANCE = 0.30;   // 30% tolerance

    // Scoring weights
    private static final double NUTRITION_SCORE_WEIGHT = 0.6;
    private static final double EMBEDDING_SCORE_WEIGHT = 0.4;

    // Workout constants
    private static final int DEFAULT_WORKOUT_DURATION = 5;
    private static final int SHORT_WORKOUT_DURATION = 1;
    private static final String DEFAULT_DIFFICULTY = "INTERMEDIATE";

    // ========================================================================
    // Dependencies
    // ========================================================================

    private final RecipeRepository recipeRepository;
    private final ExerciseVideoRepository exerciseVideoRepository;
    private final UserGoalRepository userGoalRepository;
    private final EmbeddingService embeddingService;
    private final GoalSemanticExpander semanticExpander;

    // ========================================================================
    // Main Entry Point
    // ========================================================================

    /**
     * Generate personalized recommendations using Two-Stage Funnel.
     *
     * Flow:
     * 1. Fetch user's active goal
     * 2. Calculate nutrition targets
     * 3. STAGE 1: Coarse screening via indexed repository methods
     * 4. STAGE 2: Fine ranking with scoring + embedding similarity
     * 5. Return top results
     */
    @Transactional(readOnly = true)
    public RecommendationResponse generateRecommendations(RecommendationRequest request) {
        String recommendationId = generateRecommendationId();
        UserProfileInput userProfile = request.getUserProfile();
        UUID userId = userProfile.getUserId();

        log.info("Generating recommendations: id={}, userId={}", recommendationId, userId);

        // Fetch user's active goal
        Optional<UserGoal> activeGoal = userGoalRepository.findActiveByUserId(userId);

        if (activeGoal.isEmpty()) {
            log.info("No active goal for user {}, returning default recommendations", userId);
            return buildDefaultRecommendations(recommendationId, request.getLimit());
        }

        UserGoal goal = activeGoal.get();
        String goalType = goal.getGoalType();
        log.info("User {} has active goal: {}", userId, goalType);

        // Calculate per-meal nutrition targets
        NutritionTargets targets = calculateNutritionTargets(goal);
        log.debug("Nutrition targets: {}", targets);

        // Get recipe recommendations using two-stage funnel
        List<RecipeRecommendation> recipes = findRecipesTwoStageFunnel(
                goal, targets, userProfile, request.getLimit());

        // Get workout recommendations
        List<WorkoutRecommendation> workouts = findWorkoutsForGoal(goal, request.getLimit());

        // Generate advice
        String aiAdvice = generateAdvice(goal, targets, recipes.size(), workouts.size());

        return RecommendationResponse.builder()
                .recommendationId(recommendationId)
                .aiAdvice(aiAdvice)
                .recipes(recipes)
                .workouts(workouts)
                .build();
    }

    // ========================================================================
    // STAGE 1: Coarse Screening (Database Layer) - LIGHTWEIGHT
    // ========================================================================

    /**
     * Fetch LIGHTWEIGHT candidate pool from database using goal-specific indexed queries.
     * This is the "funnel top" - fast DB lookups using B-tree indexes.
     *
     * MEMORY OPTIMIZATION:
     * - Uses RecipeSummary projection (excludes embedding field)
     * - Full Recipe with embedding: ~6KB per row
     * - RecipeSummary: ~500 bytes per row
     * - 200 candidates: 1.2MB → 100KB (92% reduction)
     *
     * @param goal User's active goal
     * @param targets Calculated nutrition targets
     * @return Candidate pool of lightweight recipe summaries (up to COARSE_POOL_SIZE)
     */
    private List<RecipeSummary> fetchCandidatePoolLightweight(UserGoal goal, NutritionTargets targets) {
        String goalType = normalizeGoalType(goal.getGoalType());
        Pageable pageable = PageRequest.of(0, COARSE_POOL_SIZE);

        log.info("Stage 1: Coarse screening (LIGHTWEIGHT) for goal={}, poolSize={}", goalType, COARSE_POOL_SIZE);
        long startTime = System.currentTimeMillis();

        List<RecipeSummary> candidates = switch (goalType) {
            case "FAT_LOSS", "WEIGHT_LOSS", "LOSE_WEIGHT" ->
                    fetchFatLossCandidatesLightweight(targets, pageable);

            case "MUSCLE_GAIN", "BUILD_MUSCLE", "GAIN_MUSCLE" ->
                    fetchMuscleGainCandidatesLightweight(targets, pageable);

            case "BLOOD_SUGAR_CONTROL", "DIABETES", "LOW_GI" ->
                    fetchBloodSugarCandidatesLightweight(targets, pageable);

            case "MAINTENANCE", "MAINTAIN_WEIGHT", "MAINTAIN" ->
                    fetchMaintenanceCandidatesLightweight(targets, pageable);

            default -> fetchDefaultCandidatesLightweight(pageable);
        };

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("Stage 1 complete: fetched {} LIGHTWEIGHT candidates in {}ms", candidates.size(), elapsed);

        return candidates;
    }

    /**
     * Fat Loss: Low calories + High protein (LIGHTWEIGHT)
     * Uses idx_recipe_fat_loss composite index
     */
    private List<RecipeSummary> fetchFatLossCandidatesLightweight(NutritionTargets targets, Pageable pageable) {
        int maxCalories = targets.maxCalories();
        double minProtein = Math.max(15.0, targets.minProtein() * 0.8);

        log.debug("Fat loss query (lightweight): calories <= {}, protein >= {}", maxCalories, minProtein);

        List<RecipeSummary> results = recipeRepository.findFatLossFriendlyLightweight(maxCalories, BigDecimal.valueOf(minProtein), pageable);

        // Fallback: relax constraints if too few results
        if (results.size() < 20) {
            log.warn("Too few fat loss candidates ({}), relaxing constraints", results.size());
            results = recipeRepository.findLowCalorieRecipesLightweight(
                    (int)(maxCalories * 1.2), pageable);
        }

        return results;
    }

    /**
     * Muscle Gain: High protein (LIGHTWEIGHT)
     * Uses idx_recipe_muscle_gain composite index
     */
    private List<RecipeSummary> fetchMuscleGainCandidatesLightweight(NutritionTargets targets, Pageable pageable) {
        double minProtein = Math.max(20.0, targets.minProtein());

        log.debug("Muscle gain query (lightweight): protein >= {}", minProtein);

        List<RecipeSummary> results = recipeRepository.findMuscleGainFriendlyLightweight(BigDecimal.valueOf(minProtein), pageable);

        // Fallback: lower protein threshold
        if (results.size() < 20) {
            log.warn("Too few muscle gain candidates ({}), lowering threshold", results.size());
            results = recipeRepository.findHighProteinRecipesLightweight(BigDecimal.valueOf(15.0), pageable);
        }

        return results;
    }

    /**
     * Blood Sugar Control: Low sugar + High fiber (LIGHTWEIGHT)
     * Uses idx_recipe_blood_sugar composite index
     */
    private List<RecipeSummary> fetchBloodSugarCandidatesLightweight(NutritionTargets targets, Pageable pageable) {
        double maxSugar = Math.max(5.0, targets.sugarLimit());
        double minFiber = Math.max(3.0, targets.fiberTarget() * 0.7);

        log.debug("Blood sugar query (lightweight): sugar <= {}, fiber >= {}", maxSugar, minFiber);

        List<RecipeSummary> results = recipeRepository.findBloodSugarFriendlyLightweight(BigDecimal.valueOf(maxSugar), BigDecimal.valueOf(minFiber), pageable);

        // Fallback: relax fiber requirement
        if (results.size() < 20) {
            log.warn("Too few blood sugar candidates ({}), relaxing fiber", results.size());
            results = recipeRepository.findBloodSugarFriendlyLightweight(BigDecimal.valueOf(maxSugar * 1.5), BigDecimal.valueOf(minFiber * 0.5), pageable);
        }

        return results;
    }

    /**
     * Maintenance: Calories within target range (LIGHTWEIGHT)
     * Uses idx_recipe_gen_calories B-tree index
     */
    private List<RecipeSummary> fetchMaintenanceCandidatesLightweight(NutritionTargets targets, Pageable pageable) {
        int minCalories = targets.minCalories();
        int maxCalories = targets.maxCalories();

        log.debug("Maintenance query (lightweight): calories between {} and {}", minCalories, maxCalories);

        List<RecipeSummary> results = recipeRepository.findMaintenanceFriendlyLightweight(minCalories, maxCalories, pageable);

        // Fallback: widen calorie range
        if (results.size() < 20) {
            log.warn("Too few maintenance candidates ({}), widening range", results.size());
            results = recipeRepository.findMaintenanceFriendlyLightweight(
                    (int)(minCalories * 0.7), (int)(maxCalories * 1.3), pageable);
        }

        return results;
    }

    /**
     * Default: Recent recipes (LIGHTWEIGHT)
     */
    private List<RecipeSummary> fetchDefaultCandidatesLightweight(Pageable pageable) {
        log.debug("Default query (lightweight): recent recipes");
        return recipeRepository.findRecentRecipesLightweight(PageRequest.of(0, 12));
    }

    // ========================================================================
    // STAGE 2: Fine Ranking with LATE FETCHING (AI Semantic Search)
    // ========================================================================

    /**
     * Two-Stage Funnel + Late Fetching implementation.
     *
     * PRESERVES AI SEMANTIC SEARCH while staying memory-safe on t2.micro:
     * - Stage 1: Fetch 200 RecipeSummary (NO embedding) = ~100KB
     * - Stage 2a: Filter by ingredients
     * - Stage 2b: Pre-score by nutrition, select TOP 50
     * - Stage 2c: LATE FETCH embeddings for 50 IDs = ~300KB (SAFE!)
     * - Stage 2d: AI scoring with cosine similarity
     *
     * @param goal User's active goal
     * @param targets Nutrition targets
     * @param userProfile User profile with exclusions
     * @param limit Final result limit
     * @return Ranked recipe recommendations with AI semantic matching
     */
    private List<RecipeRecommendation> findRecipesTwoStageFunnel(
            UserGoal goal,
            NutritionTargets targets,
            UserProfileInput userProfile,
            int limit) {

        long totalStartTime = System.currentTimeMillis();

        // ──────────────────────────────────────────────────────────────────
        // STAGE 1: Coarse Screening (Database) - LIGHTWEIGHT (~100KB)
        // ──────────────────────────────────────────────────────────────────
        List<RecipeSummary> candidatePool = fetchCandidatePoolLightweight(goal, targets);

        if (candidatePool.isEmpty()) {
            log.warn("Empty candidate pool, returning recent recipes");
            return getRecentRecipesLightweight(limit).stream()
                    .map(r -> buildRecipeRecommendationFromSummary(r, 0.5, List.of("Recently added")))
                    .collect(Collectors.toList());
        }

        log.info("Stage 1 complete: {} lightweight candidates fetched", candidatePool.size());

        // ──────────────────────────────────────────────────────────────────
        // STAGE 2a: Ingredient Filtering (Memory - fast)
        // ──────────────────────────────────────────────────────────────────
        List<String> excludedIngredients = userProfile.getExcludedIngredients();
        List<RecipeSummary> filteredPool = candidatePool.stream()
                .filter(r -> passesIngredientExclusionLightweight(r, excludedIngredients))
                .collect(Collectors.toList());

        log.debug("Stage 2a: After ingredient exclusion: {} recipes", filteredPool.size());

        // ──────────────────────────────────────────────────────────────────
        // STAGE 2b: Pre-Scoring (Nutrition only) - Select TOP 50 finalists
        // ──────────────────────────────────────────────────────────────────
        List<PreScoredRecipe> preScoredRecipes = filteredPool.stream()
                .map(recipe -> preScoreByNutrition(recipe, targets, goal.getGoalType()))
                .filter(ps -> ps.nutritionScore() > 0.3) // Minimum threshold
                .sorted(Comparator.comparingDouble(PreScoredRecipe::nutritionScore).reversed())
                .limit(FINE_POOL_SIZE) // Top 50 finalists
                .toList();

        log.info("Stage 2b: Selected {} finalists for AI scoring", preScoredRecipes.size());

        if (preScoredRecipes.isEmpty()) {
            log.warn("No recipes passed pre-scoring, returning recent recipes");
            return getRecentRecipesLightweight(limit).stream()
                    .map(r -> buildRecipeRecommendationFromSummary(r, 0.5, List.of("Recently added")))
                    .collect(Collectors.toList());
        }

        // ──────────────────────────────────────────────────────────────────
        // STAGE 2c: LATE FETCHING - Fetch embeddings ONLY for 50 IDs (~300KB)
        // ──────────────────────────────────────────────────────────────────
        List<UUID> finalistIds = preScoredRecipes.stream()
                .map(ps -> ps.recipe().getId())
                .toList();

        long lateFetchStart = System.currentTimeMillis();
        List<RecipeEmbedding> embeddings = recipeRepository.findEmbeddingsByIdIn(finalistIds);
        long lateFetchElapsed = System.currentTimeMillis() - lateFetchStart;

        // Build embedding lookup map: ID -> embedding
        Map<UUID, float[]> embeddingMap = new HashMap<>();
        for (RecipeEmbedding re : embeddings) {
            if (re.getEmbedding() != null) {
                embeddingMap.put(re.getId(), re.getEmbedding());
            }
        }

        log.info("Stage 2c: Late-fetched {} embeddings for {} finalists in {}ms (~{}KB)",
                embeddingMap.size(), finalistIds.size(), lateFetchElapsed,
                embeddingMap.size() * 6); // ~6KB per embedding

        // ──────────────────────────────────────────────────────────────────
        // STAGE 2d: AI Fine Ranking (Nutrition + Embedding Similarity)
        // ──────────────────────────────────────────────────────────────────
        float[] queryEmbedding = generateQueryEmbedding(goal);

        List<ScoredRecipeSummary> finalScores = preScoredRecipes.stream()
                .map(ps -> computeFinalScore(ps, embeddingMap, queryEmbedding, targets, goal.getGoalType()))
                .sorted(Comparator.comparingDouble(ScoredRecipeSummary::totalScore).reversed())
                .toList();

        long totalElapsed = System.currentTimeMillis() - totalStartTime;
        log.info("Stage 2d complete: AI-ranked {} recipes in {}ms total, returning top {}",
                finalScores.size(), totalElapsed, Math.min(limit, finalScores.size()));

        // Build final recommendations
        return finalScores.stream()
                .limit(limit)
                .map(sr -> buildRecipeRecommendationFromSummary(sr.recipe(), sr.totalScore(), sr.reasons()))
                .collect(Collectors.toList());
    }

    // ========================================================================
    // Pre-Scoring (Nutrition only - no embeddings)
    // ========================================================================

    /**
     * Quick nutrition-only scoring for pre-filtering.
     * Used to select TOP 50 finalists before expensive embedding fetch.
     */
    private PreScoredRecipe preScoreByNutrition(RecipeSummary recipe, NutritionTargets targets, String goalType) {
        double nutritionScore = calculateNutritionScoreLightweight(recipe, targets, goalType);
        return new PreScoredRecipe(recipe, nutritionScore);
    }

    /**
     * Calculate nutrition score based on tolerance matching.
     */
    private double calculateNutritionScoreLightweight(RecipeSummary recipe, NutritionTargets targets, String goalType) {
        Integer caloriesVal = recipe.getCalories();
        Double proteinVal = recipe.getProtein();
        Double carbsVal = recipe.getCarbs();
        Double fatVal = recipe.getFat();

        if (caloriesVal == null && proteinVal == null) {
            return 0.3; // Penalty for missing data
        }

        int calories = caloriesVal != null ? caloriesVal : 0;
        double protein = proteinVal != null ? proteinVal : 0.0;
        double carbs = carbsVal != null ? carbsVal : 0.0;
        double fat = fatVal != null ? fatVal : 0.0;

        double calorieScore = calculateToleranceScore(calories, targets.targetCalories(), CALORIE_TOLERANCE);
        double proteinScore = calculateToleranceScore(protein, targets.targetProtein(), MACRO_TOLERANCE);
        double carbsScore = calculateToleranceScore(carbs, targets.targetCarbs(), MACRO_TOLERANCE);
        double fatScore = calculateToleranceScore(fat, targets.targetFat(), MACRO_TOLERANCE);

        return calculateWeightedScore(calorieScore, proteinScore, carbsScore, fatScore, goalType);
    }

    private double calculateToleranceScore(double actual, double target, double tolerance) {
        if (target <= 0) return 0.5;

        double deviation = Math.abs(actual - target) / target;
        if (deviation <= tolerance) {
            return 1.0 - (deviation / tolerance) * 0.3;
        } else {
            return Math.max(0.0, 0.7 - (deviation - tolerance) * 0.5);
        }
    }

    private double calculateWeightedScore(double calorieScore, double proteinScore,
                                          double carbsScore, double fatScore, String goalType) {
        String goal = goalType.toLowerCase();

        if (goal.contains("fat") || goal.contains("weight") || goal.contains("lose")) {
            return calorieScore * 0.35 + proteinScore * 0.35 + carbsScore * 0.15 + fatScore * 0.15;
        } else if (goal.contains("muscle") || goal.contains("build") || goal.contains("gain")) {
            return calorieScore * 0.20 + proteinScore * 0.50 + carbsScore * 0.20 + fatScore * 0.10;
        } else {
            return calorieScore * 0.30 + proteinScore * 0.25 + carbsScore * 0.25 + fatScore * 0.20;
        }
    }

    // ========================================================================
    // AI Semantic Search (Late-Fetched Embeddings)
    // ========================================================================

    /**
     * Generate query embedding from user's goal for semantic matching.
     */
    private float[] generateQueryEmbedding(UserGoal goal) {
        try {
            List<String> goals = List.of(normalizeGoalType(goal.getGoalType()));
            String expandedPrompt = semanticExpander.expandGoalsToPrompt(goals);
            float[] embedding = embeddingService.generateEmbedding(expandedPrompt);
            log.debug("Generated query embedding (length: {})", embedding != null ? embedding.length : 0);
            return embedding;
        } catch (EmbeddingGenerationException e) {
            log.warn("Query embedding generation failed: {}, using nutrition-only scoring", e.getMessage());
            return null;
        }
    }

    /**
     * Compute final score combining nutrition + AI embedding similarity.
     */
    private ScoredRecipeSummary computeFinalScore(
            PreScoredRecipe preScored,
            Map<UUID, float[]> embeddingMap,
            float[] queryEmbedding,
            NutritionTargets targets,
            String goalType) {

        RecipeSummary recipe = preScored.recipe();
        double nutritionScore = preScored.nutritionScore();

        // Calculate embedding similarity (AI score)
        double embeddingScore = 0.5; // Default neutral if no embedding
        float[] recipeEmbedding = embeddingMap.get(recipe.getId());

        if (queryEmbedding != null && recipeEmbedding != null) {
            embeddingScore = cosineSimilarity(queryEmbedding, recipeEmbedding);
            // Normalize to 0-1 range (cosine can be -1 to 1)
            embeddingScore = (embeddingScore + 1.0) / 2.0;
        }

        // Combined score: 60% nutrition + 40% AI
        double totalScore = (nutritionScore * NUTRITION_SCORE_WEIGHT) +
                            (embeddingScore * EMBEDDING_SCORE_WEIGHT);

        // Generate match reasons
        List<String> reasons = generateMatchReasonsLightweight(recipe, targets, goalType);

        // Add AI match reason if embedding was used
        if (recipeEmbedding != null && embeddingScore > 0.6) {
            reasons = new ArrayList<>(reasons);
            reasons.add("AI-matched to your goal");
        }

        return new ScoredRecipeSummary(recipe, nutritionScore, embeddingScore, totalScore, reasons);
    }

    /**
     * Calculate cosine similarity between two embeddings.
     */
    private double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA == 0 || normB == 0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // ========================================================================
    // Nutrition Target Calculation
    // ========================================================================

    private NutritionTargets calculateNutritionTargets(UserGoal goal) {
        int targetCaloriesPerMeal = goal.getDailyCaloriesTarget() / MEALS_PER_DAY;
        int targetProteinPerMeal = goal.getProteinG() / MEALS_PER_DAY;
        int targetCarbsPerMeal = goal.getCarbsG() / MEALS_PER_DAY;
        int targetFatPerMeal = goal.getFatG() / MEALS_PER_DAY;

        int calorieMargin = (int) (targetCaloriesPerMeal * CALORIE_TOLERANCE);

        return new NutritionTargets(
                targetCaloriesPerMeal,
                targetProteinPerMeal,
                targetCarbsPerMeal,
                targetFatPerMeal,
                targetCaloriesPerMeal - calorieMargin,
                targetCaloriesPerMeal + calorieMargin,
                (int) (targetProteinPerMeal * 0.7),
                goal.getSugarLimitG() / MEALS_PER_DAY,
                goal.getFiberTargetG() / MEALS_PER_DAY
        );
    }

    // ========================================================================
    // Match Reason Generation (LIGHTWEIGHT)
    // ========================================================================

    private List<String> generateMatchReasonsLightweight(RecipeSummary recipe, NutritionTargets targets, String goalType) {
        List<String> reasons = new ArrayList<>();
        String goal = goalType.toLowerCase();

        Integer caloriesVal = recipe.getCalories();
        Double proteinVal = recipe.getProtein();
        Double carbsVal = recipe.getCarbs();

        int calories = caloriesVal != null ? caloriesVal : 0;
        double protein = proteinVal != null ? proteinVal : 0.0;
        double carbs = carbsVal != null ? carbsVal : 0.0;

        double calorieDeviation = targets.targetCalories() > 0
                ? (double)(calories - targets.targetCalories()) / targets.targetCalories() : 0;

        if (Math.abs(calorieDeviation) <= 0.1) {
            reasons.add("Matches your calorie target");
        } else if (calorieDeviation < -0.1 && (goal.contains("fat") || goal.contains("weight") || goal.contains("lose"))) {
            reasons.add("Lower calorie for weight management");
        }

        if (protein >= 25) {
            reasons.add(String.format("High protein (%.0fg)", protein));
        } else if (protein >= 20) {
            reasons.add(String.format("Good protein (%.0fg)", protein));
        }

        if (goal.contains("fat") || goal.contains("weight") || goal.contains("lose")) {
            if (carbs < targets.targetCarbs() * 0.8) {
                reasons.add("Lower carb option");
            }
        } else if (goal.contains("muscle") || goal.contains("build") || goal.contains("gain")) {
            if (carbs >= targets.targetCarbs() * 0.9) {
                reasons.add("Adequate carbs for energy");
            }
        }

        if (goal.contains("blood") || goal.contains("sugar") || goal.contains("diabetes")) {
            Double sugar = recipe.getSugar();
            Double fiber = recipe.getFiber();
            if (sugar != null && sugar <= 5) {
                reasons.add(String.format("Low sugar (%.0fg)", sugar));
            }
            if (fiber != null && fiber >= 5) {
                reasons.add(String.format("High fiber (%.0fg)", fiber));
            }
        }

        if (reasons.isEmpty()) {
            reasons.add("Balanced nutrition for your goal");
        }

        return reasons;
    }

    // ========================================================================
    // Workout Recommendations
    // ========================================================================

    private List<WorkoutRecommendation> findWorkoutsForGoal(UserGoal goal, int limit) {
        String goalType = goal.getGoalType().toLowerCase();
        List<String> targetCategories = getWorkoutCategoriesForGoal(goalType);
        List<String> priorityParts = getPriorityBodyParts(goalType);

        boolean prioritizeStrength = goal.getStrengthSessionsPerWeek() >= 3;
        boolean prioritizeCardio = goal.getCardioMinutesPerWeek() >= 150;

        log.info("Workout search - goal: {}, categories: {}", goalType, targetCategories);

        List<WorkoutRecommendation> recommendations = new ArrayList<>();
        Set<UUID> addedIds = new HashSet<>();

        for (String category : targetCategories) {
            List<ExerciseVideo> videos = exerciseVideoRepository.findByCategory(category, limit * 2);

            for (ExerciseVideo video : videos) {
                if (recommendations.size() >= limit) break;
                if (video.getId() != null && addedIds.contains(video.getId())) continue;

                WorkoutRecommendation rec = scoreWorkout(
                        video, goalType, priorityParts, prioritizeStrength, prioritizeCardio);

                if (rec.getMatchScore() > 0.3) {
                    recommendations.add(rec);
                    if (video.getId() != null) addedIds.add(video.getId());
                }
            }

            if (recommendations.size() >= limit) break;
        }

        if (recommendations.isEmpty()) {
            log.warn("No workouts matched, using default");
            return getDefaultWorkouts(limit);
        }

        return recommendations.stream()
                .sorted((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    private List<String> getWorkoutCategoriesForGoal(String goalType) {
        return switch (goalType) {
            case "fat_loss", "weight_loss", "lose_weight" ->
                    List.of("Cardio", "HIIT", "Full Body", "Core");
            case "muscle_gain", "build_muscle", "gain_muscle" ->
                    List.of("Chest", "Back", "Shoulders", "Arms", "Legs");
            case "maintenance", "maintain_weight", "maintain" ->
                    List.of("Full Body", "Core", "Back", "Chest", "Legs");
            default ->
                    List.of("Full Body", "Core", "Cardio", "Legs", "Back");
        };
    }

    private List<String> getPriorityBodyParts(String goalType) {
        return switch (goalType) {
            case "fat_loss", "weight_loss", "lose_weight" ->
                    List.of("Core", "Legs", "Full Body");
            case "muscle_gain", "build_muscle", "gain_muscle" ->
                    List.of("Chest", "Back", "Shoulders", "Arms", "Legs");
            case "maintenance", "maintain_weight", "maintain" ->
                    List.of("Core", "Full Body", "Legs");
            default ->
                    List.of("Full Body", "Core", "Legs");
        };
    }

    private WorkoutRecommendation scoreWorkout(ExerciseVideo video, String goalType,
                                                List<String> priorityParts,
                                                boolean prioritizeStrength,
                                                boolean prioritizeCardio) {
        double score = 0.5;
        List<String> reasons = new ArrayList<>();

        String primaryCategory = video.getPrimaryCategory();
        String secondaryCategory = video.getSecondaryCategory();

        if (primaryCategory != null && priorityParts.contains(primaryCategory)) {
            score += 0.25;
            reasons.add("Targets " + primaryCategory + " for your goal");
        }

        if (secondaryCategory != null && priorityParts.contains(secondaryCategory)) {
            score += 0.10;
        }

        if (goalType.contains("fat") || goalType.contains("weight") || goalType.contains("lose")) {
            if (isCardioExercise(video)) {
                score += 0.15;
                reasons.add("Cardio for fat burning");
            }
            if (primaryCategory != null &&
                    (primaryCategory.equalsIgnoreCase("Core") || primaryCategory.equalsIgnoreCase("Legs"))) {
                score += 0.10;
                reasons.add("Large muscle group activation");
            }
        } else if (goalType.contains("muscle") || goalType.contains("build") || goalType.contains("gain")) {
            if (isCompoundExercise(video)) {
                score += 0.15;
                reasons.add("Compound movement for muscle growth");
            }
            if (prioritizeStrength && isStrengthExercise(video)) {
                score += 0.10;
                reasons.add("Strength training focus");
            }
        } else {
            if (primaryCategory != null && primaryCategory.equalsIgnoreCase("Full Body")) {
                score += 0.15;
                reasons.add("Full body workout for overall fitness");
            }
        }

        if (prioritizeStrength && isStrengthExercise(video)) score += 0.05;
        if (prioritizeCardio && isCardioExercise(video)) score += 0.05;

        score = Math.min(1.0, score);

        if (reasons.isEmpty()) {
            reasons.add("Supports your " + goalType.replace("_", " ") + " goal");
        }

        return buildWorkoutRecommendation(video, score, reasons);
    }

    private boolean isCardioExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";
        String category = video.getPrimaryCategory() != null ? video.getPrimaryCategory().toLowerCase() : "";

        return name.contains("cardio") || name.contains("hiit") || name.contains("run") ||
                name.contains("jump") || name.contains("burpee") ||
                category.contains("cardio") || category.contains("hiit");
    }

    private boolean isStrengthExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";
        String category = video.getPrimaryCategory() != null ? video.getPrimaryCategory().toLowerCase() : "";

        return name.contains("press") || name.contains("curl") || name.contains("row") ||
                name.contains("squat") || name.contains("deadlift") || name.contains("lift") ||
                category.contains("chest") || category.contains("back") ||
                category.contains("arms") || category.contains("shoulders");
    }

    private boolean isCompoundExercise(ExerciseVideo video) {
        String name = video.getExerciseName() != null ? video.getExerciseName().toLowerCase() : "";

        return name.contains("squat") || name.contains("deadlift") || name.contains("press") ||
                name.contains("row") || name.contains("pull-up") || name.contains("pullup") ||
                name.contains("lunge") || name.contains("bench");
    }

    private List<WorkoutRecommendation> getDefaultWorkouts(int limit) {
        return exerciseVideoRepository.findAllByOrderByExerciseNameAsc().stream()
                .limit(limit)
                .map(v -> buildWorkoutRecommendation(v, 0.5, List.of("Featured exercise")))
                .collect(Collectors.toList());
    }

    private WorkoutRecommendation buildWorkoutRecommendation(ExerciseVideo video, double score, List<String> reasons) {
        return WorkoutRecommendation.builder()
                .id(video.getId() != null ? video.getId().toString() : null)
                .title(video.getExerciseName())
                .type(video.getPrimaryCategory())
                .durationMin(video.getIsShort() != null && video.getIsShort()
                        ? SHORT_WORKOUT_DURATION : DEFAULT_WORKOUT_DURATION)
                .difficulty(DEFAULT_DIFFICULTY)
                .thumbnailUrl(video.getThumbnailUrl())
                .videoUrl(video.getVideoUrl())
                .matchScore(score)
                .matchReasons(reasons)
                .build();
    }

    // ========================================================================
    // Default Recommendations (LIGHTWEIGHT)
    // ========================================================================

    private RecommendationResponse buildDefaultRecommendations(String recommendationId, int limit) {
        List<RecipeSummary> recipes = getRecentRecipesLightweight(limit);
        List<RecipeRecommendation> recipeRecs = recipes.stream()
                .map(r -> buildRecipeRecommendationFromSummary(r, 0.5, List.of("Recently added recipe")))
                .collect(Collectors.toList());

        List<WorkoutRecommendation> workoutRecs = getDefaultWorkouts(limit);

        return RecommendationResponse.builder()
                .recommendationId(recommendationId)
                .aiAdvice("Set up your fitness goal to get personalized recommendations tailored to your needs.")
                .recipes(recipeRecs)
                .workouts(workoutRecs)
                .build();
    }

    // ========================================================================
    // Helper Methods (LIGHTWEIGHT)
    // ========================================================================

    private String generateRecommendationId() {
        return RECOMMENDATION_ID_PREFIX + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Get recent recipes using lightweight projection.
     */
    private List<RecipeSummary> getRecentRecipesLightweight(int limit) {
        return recipeRepository.findRecentRecipesLightweight(PageRequest.of(0, limit));
    }

    /**
     * Check ingredient exclusion on lightweight RecipeSummary.
     */
    private boolean passesIngredientExclusionLightweight(RecipeSummary recipe, List<String> excludedIngredients) {
        if (excludedIngredients == null || excludedIngredients.isEmpty()) {
            return true;
        }

        if (recipe.getIngredients() == null || recipe.getIngredients().isEmpty()) {
            return true;
        }

        return recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getName().toLowerCase())
                .noneMatch(name -> excludedIngredients.stream()
                        .anyMatch(excluded -> name.contains(excluded.toLowerCase())));
    }

    /**
     * Extract nutrition info from lightweight RecipeSummary.
     */
    private NutritionInfo extractNutritionInfoFromSummary(RecipeSummary recipe) {
        return NutritionInfo.builder()
                .calories(recipe.getCalories())
                .protein(recipe.getProtein())
                .sugar(recipe.getSugar())
                .carbs(recipe.getCarbs())
                .fat(recipe.getFat())
                .fiber(recipe.getFiber())
                .build();
    }

    /**
     * Build recipe recommendation from lightweight RecipeSummary.
     */
    private RecipeRecommendation buildRecipeRecommendationFromSummary(RecipeSummary recipe, double matchScore, List<String> reasons) {
        NutritionInfo nutritionInfo = extractNutritionInfoFromSummary(recipe);
        List<String> tags = recipe.getTargetGoal() != null
                ? new ArrayList<>(recipe.getTargetGoal())
                : new ArrayList<>();

        return RecipeRecommendation.builder()
                .id(recipe.getId().toString())
                .title(recipe.getTitle())
                .imageUrl(recipe.getImageUrl())
                .nutrition(nutritionInfo)
                .tags(tags)
                .matchScore(matchScore)
                .matchReasons(reasons)
                .build();
    }

    private String normalizeGoalType(String goalType) {
        return goalType.toUpperCase().replace("-", "_").replace(" ", "_");
    }

    private String generateAdvice(UserGoal goal, NutritionTargets targets,
                                   int recipeCount, int workoutCount) {
        String goalType = goal.getGoalType().toLowerCase();
        StringBuilder sb = new StringBuilder();

        if (goalType.contains("blood_sugar") || goalType.contains("diabetes")) {
            sb.append(String.format(
                    "Based on your blood sugar control goal, we've filtered low-sugar (<=%dg) high-fiber (>=%dg) recipes.",
                    targets.sugarLimit(), targets.fiberTarget()));
        } else if (goalType.contains("fat") || goalType.contains("weight") || goalType.contains("lose")) {
            sb.append(String.format(
                    "To help you lose fat, we've selected low-calorie (<=%d cal) high-protein meals.",
                    targets.maxCalories()));
        } else if (goalType.contains("muscle") || goalType.contains("build") || goalType.contains("gain")) {
            sb.append(String.format(
                    "For your muscle building goal, we've recommended high-protein (>=%dg) nutritious meals.",
                    targets.minProtein()));
        } else {
            sb.append(String.format(
                    "We've recommended balanced nutrition meals matching your %d cal target.",
                    targets.targetCalories()));
        }

        sb.append(String.format(" Found %d recipes and %d workouts for you.", recipeCount, workoutCount));
        return sb.toString();
    }

    // ========================================================================
    // Record Types
    // ========================================================================

    private record NutritionTargets(
            int targetCalories,
            int targetProtein,
            int targetCarbs,
            int targetFat,
            int minCalories,
            int maxCalories,
            int minProtein,
            int sugarLimit,
            int fiberTarget
    ) {}

    /**
     * Pre-scored recipe for Stage 2b (nutrition only, no embedding yet).
     * Used to select TOP 50 finalists before expensive embedding fetch.
     */
    private record PreScoredRecipe(
            RecipeSummary recipe,
            double nutritionScore
    ) {}

    /**
     * Final scored recipe with both nutrition and AI embedding scores.
     * Created in Stage 2d after late-fetching embeddings.
     */
    private record ScoredRecipeSummary(
            RecipeSummary recipe,
            double nutritionScore,
            double embeddingScore,
            double totalScore,
            List<String> reasons
    ) {}
}
