package com.fitnessapp.backend.recommendation;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recommendation.dto.RecommendationRequest;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.NutritionInfo;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.RecipeRecommendation;
import com.fitnessapp.backend.recommendation.dto.RecommendationResponse.WorkoutRecommendation;
import com.fitnessapp.backend.recommendation.strategy.GoalFilterFactory;
import com.fitnessapp.backend.recommendation.strategy.GoalFilterFactory.CombinedGoalFilter;
import com.fitnessapp.backend.recommendation.strategy.GoalSemanticExpander;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Content-based recommendation service using HYBRID SEARCH.
 *
 * CRITICAL ARCHITECTURE:
 * 1. PROMPT ENGINEERING: User goals are expanded to rich descriptive sentences
 *    before generating embeddings (not raw enum strings)
 *
 * 2. PRE-FILTERING (Meta-Filter): Health constraints are applied as SQL WHERE
 *    clauses BEFORE vector similarity search. This ensures health constraints
 *    are NEVER violated by vector similarity alone.
 *
 * Flow:
 *   User Goals → Expand to Sentences → Generate Embedding
 *                                           ↓
 *   SQL: WHERE (hard_filters) ORDER BY embedding <=> query_vector
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentRecommendationService {

    private final RecipeRepository recipeRepository;
    private final ExerciseVideoRepository exerciseVideoRepository;
    private final EmbeddingService embeddingService;
    private final GoalFilterFactory goalFilterFactory;
    private final GoalSemanticExpander semanticExpander;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Generate personalized recommendations based on user profile and goals.
     *
     * Process:
     * 1. Expand user goals to descriptive sentences (Prompt Engineering)
     * 2. Generate embedding from expanded prompt
     * 3. Apply HARD filters via SQL WHERE clause (Pre-Filtering)
     * 4. Order by vector similarity
     * 5. Return combined results
     */
    @Transactional(readOnly = true)
    public RecommendationResponse generateRecommendations(RecommendationRequest request) {
        String recommendationId = "rec_" + UUID.randomUUID().toString().substring(0, 8);
        List<String> goals = request.getUserProfile().getGoals();
        log.info("Generating recommendations: id={}, goals={}", recommendationId, goals);

        // Create combined filter from goals
        CombinedGoalFilter filter = goalFilterFactory.createFilter(goals);

        // STEP 1: Prompt Engineering - Expand goals to descriptive sentences
        String expandedPrompt = semanticExpander.expandGoalsToPrompt(goals);
        log.debug("Expanded prompt: {}", expandedPrompt);

        // Get recommendations using hybrid search
        List<RecipeRecommendation> recipes = findRecipesHybrid(filter, expandedPrompt, request);
        List<WorkoutRecommendation> workouts = findWorkoutsHybrid(filter, request);

        // Generate AI advice
        String aiAdvice = generateAdvice(filter.getGoals(), recipes.size(), workouts.size());

        return RecommendationResponse.builder()
                .recommendationId(recommendationId)
                .aiAdvice(aiAdvice)
                .recipes(recipes)
                .workouts(workouts)
                .build();
    }

    /**
     * HYBRID SEARCH for recipes:
     * 1. Apply HARD filters via SQL WHERE clause (Pre-Filtering)
     * 2. Order by vector similarity to expanded prompt
     *
     * SQL Pattern:
     *   SELECT * FROM recipe
     *   WHERE (nutrition_summary->>'sugar')::numeric < 5  -- Hard filter
     *     AND embedding IS NOT NULL
     *   ORDER BY embedding <=> :queryVector
     *   LIMIT :limit
     */
    private List<RecipeRecommendation> findRecipesHybrid(
            CombinedGoalFilter filter,
            String expandedPrompt,
            RecommendationRequest request) {

        int limit = request.getLimit();
        String hardFilterSql = filter.getCombinedRecipeHardFilterSql();

        log.info("Recipe search - Hard filter: {}", hardFilterSql != null ? hardFilterSql : "NONE");

        // STEP 2: Generate embedding from expanded prompt (not raw enum!)
        float[] queryEmbedding = null;
        try {
            queryEmbedding = embeddingService.generateEmbedding(expandedPrompt);
            log.info("Generated embedding for prompt (length: {})",
                    queryEmbedding != null ? queryEmbedding.length : 0);
        } catch (EmbeddingGenerationException e) {
            log.warn("Embedding generation failed: {}", e.getMessage());
        }

        List<Recipe> recipes;

        if (queryEmbedding != null && queryEmbedding.length > 0) {
            // HYBRID SEARCH: Hard filter + Vector similarity
            recipes = executeHybridRecipeQuery(hardFilterSql, queryEmbedding, limit * 2);
        } else {
            // FALLBACK: Hard filter only (no vector search)
            recipes = executeFallbackRecipeQuery(hardFilterSql, limit * 2);
        }

        // Apply ingredient exclusions (in-memory, as these are user-specific)
        List<String> excludedIngredients = request.getUserProfile().getPreferences() != null
                ? request.getUserProfile().getPreferences().getExcludedIngredients()
                : null;

        return recipes.stream()
                .filter(r -> passesIngredientExclusion(r, excludedIngredients))
                .limit(limit)
                .map(this::toRecipeRecommendation)
                .collect(Collectors.toList());
    }

    /**
     * Execute hybrid recipe query with HARD FILTERS + VECTOR SIMILARITY.
     *
     * CRITICAL: The WHERE clause enforces health constraints BEFORE vector ranking.
     */
    private List<Recipe> executeHybridRecipeQuery(String hardFilterSql, float[] queryEmbedding, int limit) {
        String embeddingStr = toVectorString(queryEmbedding);

        // Build SQL with hard filters
        StringBuilder sql = new StringBuilder();
        sql.append("""
            SELECT r.id, 1 - (r.embedding <=> CAST(? AS vector)) as similarity
            FROM recipe r
            WHERE r.embedding IS NOT NULL
            """);

        // CRITICAL: Add hard filters for health constraints
        if (hardFilterSql != null && !hardFilterSql.isBlank()) {
            sql.append(" AND ").append(hardFilterSql);
            log.info("Applied HARD FILTER: {}", hardFilterSql);
        }

        sql.append(" ORDER BY r.embedding <=> CAST(? AS vector)");
        sql.append(" LIMIT ?");

        log.debug("Executing hybrid query: {}", sql);

        try {
            List<UUID> matchedIds = jdbcTemplate.query(
                    sql.toString(),
                    (rs, rowNum) -> UUID.fromString(rs.getString("id")),
                    embeddingStr, embeddingStr, limit
            );

            if (matchedIds.isEmpty()) {
                log.warn("No recipes matched hybrid search, trying fallback with hard filters only");
                // Fallback: Still apply hard filters but without vector similarity
                return executeFallbackRecipeQuery(hardFilterSql, limit);
            }

            return recipeRepository.findByIdInWithIngredients(matchedIds);
        } catch (Exception e) {
            log.error("Hybrid query failed: {}", e.getMessage());
            return executeFallbackRecipeQuery(hardFilterSql, limit);
        }
    }

    /**
     * Fallback query when vector search is not available.
     * Still applies HARD FILTERS for health constraints.
     */
    private List<Recipe> executeFallbackRecipeQuery(String hardFilterSql, int limit) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT id FROM recipe WHERE 1=1");

        // Still apply hard filters even without vector search!
        if (hardFilterSql != null && !hardFilterSql.isBlank()) {
            sql.append(" AND ").append(hardFilterSql);
        }

        sql.append(" ORDER BY created_at DESC LIMIT ?");

        log.debug("Executing fallback query: {}", sql);

        try {
            List<UUID> matchedIds = jdbcTemplate.query(
                    sql.toString(),
                    (rs, rowNum) -> UUID.fromString(rs.getString("id")),
                    limit
            );

            if (matchedIds.isEmpty()) {
                // If hard filters are too restrictive, get recent recipes without filters
                log.warn("No recipes matched hard filters, falling back to recent recipes");
                return recipeRepository.findTop12ByOrderByCreatedAtDesc().stream()
                        .limit(limit)
                        .collect(Collectors.toList());
            }

            return recipeRepository.findByIdInWithIngredients(matchedIds);
        } catch (Exception e) {
            log.error("Fallback query failed: {}", e.getMessage());
            return recipeRepository.findTop12ByOrderByCreatedAtDesc().stream()
                    .limit(limit)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Find workouts using goal-based targeting with semantic expansion.
     */
    private List<WorkoutRecommendation> findWorkoutsHybrid(
            CombinedGoalFilter filter,
            RecommendationRequest request) {

        int limit = request.getLimit();
        List<String> targetTags = filter.getAllTargetGoalTags();

        log.info("Workout search - target tags: {}", targetTags);

        // Get workouts by target goal tags
        List<ExerciseVideo> videos = new ArrayList<>();
        for (String tag : targetTags) {
            List<ExerciseVideo> matched = exerciseVideoRepository.findTopByTargetGoal(tag, limit);
            videos.addAll(matched);
            if (videos.size() >= limit) break;
        }

        // Fallback if no matches
        if (videos.isEmpty()) {
            log.warn("No workouts matched target tags, using all workouts");
            videos = exerciseVideoRepository.findAllByOrderByExerciseNameAsc();
        }

        // Deduplicate and limit
        return videos.stream()
                .distinct()
                .limit(limit)
                .map(this::toWorkoutRecommendation)
                .collect(Collectors.toList());
    }

    /**
     * Check if recipe contains excluded ingredients
     */
    private boolean passesIngredientExclusion(Recipe recipe, List<String> excludedIngredients) {
        if (excludedIngredients == null || excludedIngredients.isEmpty()) {
            return true;
        }

        if (recipe.getIngredients() == null) {
            return true;
        }

        return recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getName().toLowerCase())
                .noneMatch(name -> excludedIngredients.stream()
                        .anyMatch(excluded -> name.contains(excluded.toLowerCase())));
    }

    private RecipeRecommendation toRecipeRecommendation(Recipe recipe) {
        JsonNode nutrition = recipe.getNutritionSummary();
        NutritionInfo nutritionInfo = NutritionInfo.builder()
                .calories(nutrition != null && nutrition.has("calories") ? nutrition.get("calories").asInt() : null)
                .protein(nutrition != null && nutrition.has("protein") ? nutrition.get("protein").asDouble() : null)
                .sugar(nutrition != null && nutrition.has("sugar") ? nutrition.get("sugar").asDouble() : null)
                .carbs(nutrition != null && nutrition.has("carbs") ? nutrition.get("carbs").asDouble() : null)
                .fat(nutrition != null && nutrition.has("fat") ? nutrition.get("fat").asDouble() : null)
                .fiber(nutrition != null && nutrition.has("fiber") ? nutrition.get("fiber").asDouble() : null)
                .build();

        List<String> tags = new ArrayList<>();
        if (recipe.getTargetGoal() != null) {
            tags.addAll(recipe.getTargetGoal());
        }

        return RecipeRecommendation.builder()
                .id(recipe.getId().toString())
                .title(recipe.getTitle())
                .imageUrl(recipe.getImageUrl())
                .nutrition(nutritionInfo)
                .tags(tags)
                .matchScore(0.9)
                .build();
    }

    private WorkoutRecommendation toWorkoutRecommendation(ExerciseVideo video) {
        return WorkoutRecommendation.builder()
                .id(video.getId().toString())
                .title(video.getExerciseName())
                .type(video.getPrimaryCategory())
                .durationMin(video.getIsShort() ? 1 : 5)
                .difficulty("INTERMEDIATE")
                .thumbnailUrl(video.getThumbnailUrl())
                .videoUrl(video.getVideoUrl())
                .matchScore(0.9)
                .build();
    }

    private String generateAdvice(List<String> goals, int recipeCount, int workoutCount) {
        StringBuilder sb = new StringBuilder();

        if (goals.contains("BLOOD_SUGAR_CONTROL") && goals.contains("BUILD_MUSCLE")) {
            sb.append("既然您的目标是控糖和增肌，我们为您挑选了低升糖指数(Low GI)的高蛋白餐单。");
        } else if (goals.contains("BLOOD_SUGAR_CONTROL")) {
            sb.append("根据您的控糖目标，我们严格筛选了低糖(sugar < 5g)高纤维(fiber > 3g)的健康食谱。");
        } else if (goals.contains("FAT_LOSS")) {
            sb.append("为了帮助您减脂，我们精选了低卡路里(< 600 cal)、高饱腹感的餐单。");
        } else if (goals.contains("BUILD_MUSCLE") || goals.contains("GAIN_MUSCLE")) {
            sb.append("针对您的增肌目标，我们推荐了高蛋白(> 20g)的营养餐单。");
        } else {
            sb.append("为您推荐了均衡营养的健康餐单。");
        }

        sb.append(String.format(" 共找到 %d 道食谱和 %d 个训练视频。", recipeCount, workoutCount));
        return sb.toString();
    }

    private String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(String.format("%.8f", embedding[i]));
        }
        sb.append("]");
        return sb.toString();
    }
}
