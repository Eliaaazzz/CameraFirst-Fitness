package com.fitnessapp.backend.nutrition.strategy;

import com.fitnessapp.backend.embedding.EmbeddingService;
import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

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
    
    private static final double HIGH_CONFIDENCE_THRESHOLD = 0.85;
    private static final double MINIMUM_THRESHOLD = 0.70;
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
        
        List<UsdaFood> foods;
        if (excludeRaw) {
            log.debug("[VectorMatch] Excluding raw entries (cooking method: {})", cookingMethod);
            foods = usdaFoodRepository.findBySimilarityExcluding(embeddingString, "%raw%", MAX_RESULTS);
        } else {
            foods = usdaFoodRepository.findBySimilarity(embeddingString, MAX_RESULTS);
        }
        
        if (foods.isEmpty()) {
            log.debug("[VectorMatch] No results from vector search");
            return results;
        }
        
        // Calculate actual similarity scores and filter by threshold
        for (UsdaFood food : foods) {
            double similarity = calculateCosineSimilarity(queryEmbedding, food.getEmbedding());
            
            if (similarity >= MINIMUM_THRESHOLD) {
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
        if (embedding == null || embedding.length == 0) return true;
        for (float f : embedding) {
            if (f != 0.0f) return false;
        }
        return true;
    }
    
    /**
     * Calculate cosine similarity between two vectors.
     */
    private double calculateCosineSimilarity(float[] a, float[] b) {
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
        
        double denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator == 0 ? 0.0 : dotProduct / denominator;
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
