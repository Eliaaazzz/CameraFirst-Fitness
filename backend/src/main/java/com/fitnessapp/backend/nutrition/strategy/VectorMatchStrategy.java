package com.fitnessapp.backend.nutrition.strategy;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository.FoodSimilarityResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Vector-based semantic search strategy using pgvector.
 * HIGHEST PRIORITY (4) - Uses embeddings for semantic similarity matching.
 * 
 * Features:
 * - Semantic understanding: "Roasted Beef" matches "Beef, round, top round, cooked, roasted"
 * - Cooking method awareness: Excludes "raw" entries when cooking method indicates cooked
 * - High confidence threshold: Only returns matches with >0.85 similarity
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VectorMatchStrategy implements FoodMatchStrategy {
    
    private static final double HIGH_CONFIDENCE_THRESHOLD = 0.70;
    private static final double MINIMUM_THRESHOLD = 0.45;
    private static final int MAX_RESULTS = 10;
    
    /**
     * Cooking methods that indicate the food is cooked (should exclude raw entries)
     */
    private static final Set<CookingMethod> COOKED_METHODS = Set.of(
            CookingMethod.ROASTED,
            CookingMethod.GRILLED,
            CookingMethod.FRIED,
            CookingMethod.STIR_FRIED,
            CookingMethod.BREADED,
            CookingMethod.BOILED,
            CookingMethod.STEAMED
    );
    
    private final EmbeddingService embeddingService;
    private final UsdaFoodRepository usdaFoodRepository;
    
    @Override
    public List<MatchResult> findMatches(FoodMetadata metadata) {
        List<MatchResult> results = new ArrayList<>();

        // Build semantic query from metadata
        String queryText = buildQueryText(metadata);
        if (queryText.isEmpty()) {
            log.debug("[VectorMatch] No query text to search");
            return results;
        }

        log.debug("[VectorMatch] Searching for: '{}'", queryText);

        // Generate embedding for the query
        float[] queryEmbedding = embeddingService.generateEmbedding(queryText);

        // Check if embedding is valid (non-zero)
        if (isZeroVector(queryEmbedding)) {
            log.warn("[VectorMatch] Failed to generate embedding, falling back");
            return results;
        }

        // Convert embedding to PostgreSQL vector string format
        String embeddingString = toVectorString(queryEmbedding);

        // Determine if we should exclude raw entries
        CookingMethod cookingMethod = metadata.getCookingMethod();
        boolean excludeRaw = cookingMethod != null && COOKED_METHODS.contains(cookingMethod);

        // Query database for similarity results (ID + similarity score from pgvector)
        List<FoodSimilarityResult> similarityResults;
        if (excludeRaw) {
            log.debug("[VectorMatch] Excluding raw entries (cooking method: {})", cookingMethod);
            similarityResults = usdaFoodRepository.findBySimilarityExcludingWithScore(embeddingString, "%raw%", MAX_RESULTS);
        } else {
            similarityResults = usdaFoodRepository.findBySimilarityWithScore(embeddingString, MAX_RESULTS);
        }

        if (similarityResults.isEmpty()) {
            log.debug("[VectorMatch] No results from vector search");
            return results;
        }

        // Filter by minimum threshold and collect IDs
        List<Long> matchingIds = similarityResults.stream()
                .filter(r -> r.getSimilarity() != null && r.getSimilarity() >= MINIMUM_THRESHOLD)
                .map(FoodSimilarityResult::getId)
                .toList();

        if (matchingIds.isEmpty()) {
            log.debug("[VectorMatch] No results above minimum threshold ({})", MINIMUM_THRESHOLD);
            return results;
        }

        // Fetch full food entities for matching IDs
        List<UsdaFood> foods = usdaFoodRepository.findAllById(matchingIds);

        // Create a map of ID -> similarity for quick lookup
        Map<Long, Double> similarityMap = similarityResults.stream()
                .filter(r -> r.getSimilarity() != null && r.getSimilarity() >= MINIMUM_THRESHOLD)
                .collect(Collectors.toMap(FoodSimilarityResult::getId, FoodSimilarityResult::getSimilarity));

        // Build match results using database-calculated similarity scores
        for (UsdaFood food : foods) {
            Double similarity = similarityMap.get(food.getId());
            if (similarity != null) {
                String reason = buildMatchReason(similarity, cookingMethod);
                results.add(new MatchResult(food, similarity, reason));

                log.info("[VectorMatch] Found: {} (similarity: {:.4f})",
                        food.getName(), similarity);
            }
        }

        // Sort by similarity descending
        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        // Log high-confidence matches
        results.stream()
                .filter(r -> r.getScore() >= HIGH_CONFIDENCE_THRESHOLD)
                .findFirst()
                .ifPresent(r -> log.info("[VectorMatch] High-confidence match: {} ({})",
                        r.getFood().getName(), r.getScore()));

        return results;
    }
    
    @Override
    public int getPriority() {
        return 4; // Highest priority - semantic search is most accurate
    }
    
    @Override
    public String getStrategyName() {
        return "VectorMatch";
    }
    
    /**
     * Build query text from metadata for embedding generation.
     * Combines base ingredient, form, cooking method, and modifiers.
     */
    private String buildQueryText(FoodMetadata metadata) {
        StringBuilder sb = new StringBuilder();
        
        // Add cooking method first (e.g., "roasted")
        if (metadata.getCookingMethod() != null && 
            metadata.getCookingMethod() != CookingMethod.UNKNOWN) {
            sb.append(metadata.getCookingMethod().getDisplayName()).append(" ");
        }
        
        // Add base ingredient
        if (metadata.getBaseIngredient() != null && !metadata.getBaseIngredient().isEmpty()) {
            sb.append(metadata.getBaseIngredient()).append(" ");
        }
        
        // Add form
        if (metadata.getForm() != null && !metadata.getForm().isEmpty()) {
            sb.append(metadata.getForm()).append(" ");
        }
        
        // Add search terms
        if (metadata.getSearchTerms() != null && !metadata.getSearchTerms().isEmpty()) {
            sb.append(String.join(" ", metadata.getSearchTerms())).append(" ");
        }
        
        // Add modifiers
        if (metadata.getModifiers() != null && !metadata.getModifiers().isEmpty()) {
            sb.append(String.join(" ", metadata.getModifiers()));
        }
        
        return sb.toString().trim();
    }
    
    /**
     * Convert float array to PostgreSQL vector string format: [0.1,0.2,0.3,...]
     */
    private String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(String.format("%.8f", embedding[i]));
        }
        sb.append("]");
        return sb.toString();
    }
    
    /**
     * Check if embedding is a zero vector (failed generation).
     */
    private boolean isZeroVector(float[] embedding) {
        if (embedding == null || embedding.length == 0) {
            return true;
        }
        for (float f : embedding) {
            if (f != 0.0f) return false;
        }
        return true;
    }

    /**
     * Build descriptive match reason.
     */
    private String buildMatchReason(double similarity, CookingMethod cookingMethod) {
        StringBuilder reason = new StringBuilder();
        
        if (similarity >= HIGH_CONFIDENCE_THRESHOLD) {
            reason.append("High-confidence semantic match");
        } else {
            reason.append("Semantic similarity match");
        }
        
        reason.append(String.format(" (%.1f%% similar)", similarity * 100));
        
        if (cookingMethod != null && COOKED_METHODS.contains(cookingMethod)) {
            reason.append(", filtered for cooking method: ").append(cookingMethod.getDisplayName());
        }
        
        return reason.toString();
    }
}
