package com.fitnessapp.backend.recommendation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fitnessapp.backend.recipe.repository.RecipeRepository;
import com.fitnessapp.backend.recipe.repository.RecipeRepository.RecipeSimilarityResult;
import com.fitnessapp.backend.retrieval.dto.RecipeCard;
import com.fitnessapp.backend.retrieval.dto.RecipeStep;
import com.fitnessapp.backend.retrieval.dto.WorkoutCard;
import com.fitnessapp.backend.workout.entity.ExerciseVideo;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository;
import com.fitnessapp.backend.workout.repository.ExerciseVideoRepository.VideoSimilarityResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Vector-based semantic recommendation service using pgvector.
 * Provides intelligent content recommendations through embedding similarity search.
 *
 * Features:
 * - Semantic understanding: "I want to build muscle and get stronger" matches relevant content
 * - Hybrid search: Combines vector similarity with metadata filtering (goals, categories)
 * - Diversity selection: Ensures varied content across categories
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorRecommendationService {

    private static final int QUERY_LIMIT = 15;
    private static final int TOP_ITEMS_LIMIT = 5;
    private static final double MINIMUM_SIMILARITY_THRESHOLD = 0.3;

    private final EmbeddingService embeddingService;
    private final ExerciseVideoRepository exerciseVideoRepository;
    private final RecipeRepository recipeRepository;

    /**
     * Get workout recommendations using vector similarity search.
     *
     * @param userQuery Natural language query (e.g., "I want to lose fat and build glutes")
     * @param goalFilter Optional goal filter for hybrid search
     * @return List of recommended workout cards with similarity scores
     */
    public List<WorkoutCard> getWorkoutRecommendations(String userQuery, String goalFilter) {
        log.debug("[VectorRec] Generating workout recommendations for query: '{}'", userQuery);

        // Generate embedding for the user query
        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingService.generateEmbedding(userQuery);
        } catch (EmbeddingGenerationException e) {
            log.warn("[VectorRec] Embedding generation failed ({}): {}",
                    e.getErrorType(), e.getMessage());
            return List.of();
        }

        if (isZeroVector(queryEmbedding)) {
            log.warn("[VectorRec] Got zero embedding, returning empty results");
            return List.of();
        }

        String embeddingString = toVectorString(queryEmbedding);

        // Execute hybrid search (vector + goal filter) or pure vector search
        List<VideoSimilarityResult> similarityResults;
        if (goalFilter != null && !goalFilter.isEmpty()) {
            similarityResults = exerciseVideoRepository.findBySimilarityAndGoalWithScore(
                    embeddingString, goalFilter, QUERY_LIMIT);
        } else {
            similarityResults = exerciseVideoRepository.findBySimilarityWithScore(
                    embeddingString, QUERY_LIMIT);
        }

        if (similarityResults.isEmpty()) {
            log.debug("[VectorRec] No workout results from vector search");
            return List.of();
        }

        // Filter by minimum similarity threshold
        List<UUID> matchingIds = similarityResults.stream()
                .filter(r -> r.getSimilarity() != null && r.getSimilarity() >= MINIMUM_SIMILARITY_THRESHOLD)
                .map(VideoSimilarityResult::getId)
                .toList();

        if (matchingIds.isEmpty()) {
            log.debug("[VectorRec] No workouts above similarity threshold");
            return List.of();
        }

        // Fetch full entities
        List<ExerciseVideo> videos = exerciseVideoRepository.findAllById(matchingIds);

        // Create similarity map for scoring
        Map<UUID, Double> similarityMap = similarityResults.stream()
                .collect(Collectors.toMap(VideoSimilarityResult::getId, VideoSimilarityResult::getSimilarity));

        // Sort by similarity and apply diversity selection
        videos.sort((a, b) -> Double.compare(
                similarityMap.getOrDefault(b.getId(), 0.0),
                similarityMap.getOrDefault(a.getId(), 0.0)));

        return selectDiverseWorkouts(videos, similarityMap, TOP_ITEMS_LIMIT);
    }

    /**
     * Get recipe recommendations using vector similarity search.
     *
     * @param userQuery Natural language query
     * @param goalFilter Optional goal filter
     * @return List of recommended recipe cards with similarity scores
     */
    public List<RecipeCard> getRecipeRecommendations(String userQuery, String goalFilter) {
        log.debug("[VectorRec] Generating recipe recommendations for query: '{}'", userQuery);

        float[] queryEmbedding;
        try {
            queryEmbedding = embeddingService.generateEmbedding(userQuery);
        } catch (EmbeddingGenerationException e) {
            log.warn("[VectorRec] Embedding generation failed ({}): {}",
                    e.getErrorType(), e.getMessage());
            return List.of();
        }

        if (isZeroVector(queryEmbedding)) {
            log.warn("[VectorRec] Got zero embedding, returning empty results");
            return List.of();
        }

        String embeddingString = toVectorString(queryEmbedding);

        // Execute hybrid search
        List<RecipeSimilarityResult> similarityResults;
        if (goalFilter != null && !goalFilter.isEmpty()) {
            similarityResults = recipeRepository.findBySimilarityAndGoalWithScore(
                    embeddingString, goalFilter, QUERY_LIMIT);
        } else {
            similarityResults = recipeRepository.findBySimilarityWithScore(
                    embeddingString, QUERY_LIMIT);
        }

        if (similarityResults.isEmpty()) {
            log.debug("[VectorRec] No recipe results from vector search");
            return List.of();
        }

        // Filter by minimum similarity
        List<UUID> matchingIds = similarityResults.stream()
                .filter(r -> r.getSimilarity() != null && r.getSimilarity() >= MINIMUM_SIMILARITY_THRESHOLD)
                .map(RecipeSimilarityResult::getId)
                .toList();

        if (matchingIds.isEmpty()) {
            log.debug("[VectorRec] No recipes above similarity threshold");
            return List.of();
        }

        // Fetch full entities with ingredients
        List<Recipe> recipes = recipeRepository.findByIdInWithIngredients(matchingIds);

        // Create similarity map
        Map<UUID, Double> similarityMap = similarityResults.stream()
                .collect(Collectors.toMap(RecipeSimilarityResult::getId, RecipeSimilarityResult::getSimilarity));

        // Sort by similarity
        recipes.sort((a, b) -> Double.compare(
                similarityMap.getOrDefault(b.getId(), 0.0),
                similarityMap.getOrDefault(a.getId(), 0.0)));

        // Convert to cards (take top N)
        return recipes.stream()
                .limit(TOP_ITEMS_LIMIT)
                .map(r -> toRecipeCard(r, similarityMap.get(r.getId())))
                .toList();
    }

    /**
     * Build a semantic query string from user's fitness goal.
     * Enriches the goal with related terms for better embedding matching.
     */
    public String buildSemanticQuery(String fitnessGoal) {
        if (fitnessGoal == null || fitnessGoal.trim().isEmpty()) {
            return "general fitness health wellness workout";
        }

        String normalized = fitnessGoal.toUpperCase(Locale.ROOT).trim();

        // Expand goals with semantic context
        if (normalized.contains("LOSE") || normalized.contains("FAT") || normalized.contains("WEIGHT")) {
            return "lose weight fat burning cardio high intensity low calorie diet lean";
        }
        if (normalized.contains("MUSCLE") || normalized.contains("GAIN") || normalized.contains("BUILD")) {
            return "build muscle gain mass strength training high protein hypertrophy";
        }
        if (normalized.contains("STRENGTH") || normalized.contains("POWER")) {
            return "strength training power lifting heavy weights compound exercises";
        }
        if (normalized.contains("MAINTAIN") || normalized.contains("HEALTH")) {
            return "maintain health wellness balanced fitness moderate exercise";
        }

        // Default enrichment
        return fitnessGoal + " fitness workout exercise health";
    }

    /**
     * Check if embeddings are available for recommendations.
     */
    public boolean hasEmbeddings() {
        long videoCount = exerciseVideoRepository.countByEmbeddingIsNotNull();
        long recipeCount = recipeRepository.countByEmbeddingIsNotNull();
        return videoCount > 0 && recipeCount > 0;
    }

    /**
     * Get embedding coverage statistics.
     */
    public Map<String, Long> getEmbeddingStats() {
        return Map.of(
            "videosWithEmbedding", exerciseVideoRepository.countByEmbeddingIsNotNull(),
            "videosTotal", exerciseVideoRepository.count(),
            "recipesWithEmbedding", recipeRepository.countByEmbeddingIsNotNull(),
            "recipesTotal", recipeRepository.count()
        );
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    private List<WorkoutCard> selectDiverseWorkouts(
            List<ExerciseVideo> videos,
            Map<UUID, Double> similarityMap,
            int limit) {

        List<WorkoutCard> selected = new ArrayList<>();
        Set<String> seenCategories = new HashSet<>();
        Set<UUID> addedIds = new HashSet<>();

        // First pass: one from each category
        for (ExerciseVideo video : videos) {
            if (selected.size() >= limit) break;
            String category = video.getPrimaryCategory();
            if (category != null && seenCategories.add(category.toLowerCase(Locale.ROOT))) {
                if (addedIds.add(video.getId())) {
                    selected.add(toWorkoutCard(video, similarityMap.get(video.getId())));
                }
            }
        }

        // Second pass: fill remaining slots
        for (ExerciseVideo video : videos) {
            if (selected.size() >= limit) break;
            if (addedIds.add(video.getId())) {
                selected.add(toWorkoutCard(video, similarityMap.get(video.getId())));
            }
        }

        return selected;
    }

    private WorkoutCard toWorkoutCard(ExerciseVideo video, Double similarity) {
        return WorkoutCard.builder()
                .id(video.getId().toString())
                .youtubeId(video.getYoutubeId())
                .title(video.getExerciseName())
                .durationMinutes(video.getIsShort() ? 1 : 5)
                .level("all")
                .equipment(List.of())
                .bodyParts(List.of(video.getPrimaryCategory()))
                .thumbnailUrl("https://img.camera-first.dev/video/" + video.getR2Key() + "/thumb.jpg")
                .viewCount(0L)
                .youtubeUrl("https://www.youtube.com/watch?v=" + video.getYoutubeId())
                .similarityScore(similarity)
                .build();
    }

    private RecipeCard toRecipeCard(Recipe recipe, Double similarity) {
        List<String> ingredients = recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getName())
                .toList();

        Map<String, Object> nutrition = null;
        if (recipe.getNutritionSummary() != null) {
            var ns = recipe.getNutritionSummary();
            nutrition = Map.of(
                    "calories", ns.has("calories") ? ns.get("calories").asInt() : 0,
                    "protein", ns.has("protein") ? ns.get("protein").floatValue() : 0f,
                    "carbs", ns.has("carbs") ? ns.get("carbs").floatValue() : 0f,
                    "fat", ns.has("fat") ? ns.get("fat").floatValue() : 0f,
                    "servings", ns.has("servings") ? ns.get("servings").asInt() : 1
            );
        }

        List<RecipeStep> steps = List.of();
        if (recipe.getSteps() != null && recipe.getSteps().isArray()) {
            List<RecipeStep> stepList = new ArrayList<>();
            int stepNum = 1;
            for (var step : recipe.getSteps()) {
                stepList.add(RecipeStep.builder()
                        .step(stepNum++)
                        .instruction(step.asText())
                        .build());
            }
            steps = stepList;
        }

        return RecipeCard.builder()
                .id(recipe.getId().toString())
                .title(recipe.getTitle())
                .timeMinutes(recipe.getTimeMinutes())
                .difficulty(recipe.getDifficulty())
                .imageUrl(recipe.getImageUrl())
                .steps(steps)
                .nutrition(nutrition)
                .ingredients(ingredients)
                .similarityScore(similarity)
                .build();
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

    private boolean isZeroVector(float[] embedding) {
        if (embedding == null || embedding.length == 0) return true;
        for (float f : embedding) {
            if (f != 0.0f) return false;
        }
        return true;
    }
}
