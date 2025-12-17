package com.fitnessapp.backend.embedding;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.stream.IntStream;

/**
 * Service for batch vectorization of USDA food entries.
 * Generates embeddings for all foods that don't have them yet.
 *
 * Design considerations:
 * - No long transactions: Each food is saved in its own transaction
 * - No zero vector pollution: Only valid embeddings are saved
 * - Rate limiting: Avoids API throttling
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorizationService {

    private static final int BATCH_SIZE = 50;
    private static final long RATE_LIMIT_DELAY_MS = 100; // Delay between API calls

    private final EmbeddingService embeddingService;
    private final UsdaFoodRepository usdaFoodRepository;
    private final TransactionTemplate transactionTemplate;

    /**
     * Seed embeddings for all USDA foods without embeddings.
     * Call this once when setting up the database.
     *
     * Note: This method does NOT use @Transactional to avoid long transactions.
     * Each food is saved in its own transaction via generateAndSaveEmbedding().
     *
     * @return Number of foods successfully processed
     */
    public int seedAllEmbeddings() {
        List<UsdaFood> foodsWithoutEmbeddings = usdaFoodRepository.findFoodsWithoutEmbeddings();

        if (foodsWithoutEmbeddings.isEmpty()) {
            log.info("All USDA foods already have embeddings");
            return 0;
        }

        log.info("Starting embedding generation for {} foods using {}",
                foodsWithoutEmbeddings.size(), embeddingService.getModelName());

        AtomicInteger processed = new AtomicInteger(0);
        AtomicInteger failed = new AtomicInteger(0);

        for (UsdaFood food : foodsWithoutEmbeddings) {
            try {
                boolean success = generateAndSaveEmbedding(food.getId());
                if (success) {
                    processed.incrementAndGet();
                } else {
                    failed.incrementAndGet();
                }

                if ((processed.get() + failed.get()) % BATCH_SIZE == 0) {
                    log.info("Progress: {}/{} embeddings generated ({} failed)",
                            processed.get(), foodsWithoutEmbeddings.size(), failed.get());
                }

                // Rate limiting to avoid API throttling
                Thread.sleep(RATE_LIMIT_DELAY_MS);

            } catch (Exception e) {
                log.error("Failed to generate embedding for food {}: {}", food.getId(), e.getMessage());
                failed.incrementAndGet();
            }
        }

        log.info("Embedding seeding completed. Processed: {}, Failed: {}", processed.get(), failed.get());
        return processed.get();
    }

    /**
     * Seed embeddings asynchronously in background.
     */
    @Async
    public void seedAllEmbeddingsAsync() {
        log.info("Starting async embedding seeding...");
        seedAllEmbeddings();
    }

    /**
     * Generate and save embedding for a single food item by ID.
     * Each call is a separate transaction to avoid long-running transactions.
     * Uses native query to save embedding due to pgvector type mapping.
     *
     * @param foodId The food ID to generate embedding for
     * @return true if embedding was successfully generated and saved, false otherwise
     */
    public boolean generateAndSaveEmbedding(Long foodId) {
        UsdaFood food = usdaFoodRepository.findById(foodId).orElse(null);
        if (food == null) {
            log.warn("Food not found: {}", foodId);
            return false;
        }

        String searchText = buildSearchText(food);
        float[] embedding = embeddingService.generateEmbedding(searchText);

        // Validate embedding - don't save zero vectors (API failure)
        if (isZeroVector(embedding)) {
            log.warn("Skipping zero vector for food {}: {} - API may have failed",
                    foodId, food.getName());
            return false;
        }

        String embeddingString = toVectorString(embedding);

        // Use programmatic transaction for native query (bypasses Spring proxy issues)
        transactionTemplate.executeWithoutResult(status -> {
            usdaFoodRepository.updateEmbedding(foodId, embeddingString, searchText, OffsetDateTime.now());
        });

        log.debug("Generated embedding for: {} (dims: {})",
                food.getName(), embedding.length);
        return true;
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
     * Check if embedding is a zero vector (indicates API failure).
     */
    private boolean isZeroVector(float[] embedding) {
        if (embedding == null || embedding.length == 0) {
            return true;
        }
        for (float f : embedding) {
            if (f != 0.0f) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Regenerate embedding for a specific food (e.g., after name update).
     *
     * @param foodId The food ID to regenerate embedding for
     * @throws IllegalArgumentException if food not found or embedding generation failed
     */
    public void regenerateEmbedding(Long foodId) {
        if (!usdaFoodRepository.existsById(foodId)) {
            throw new IllegalArgumentException("Food not found: " + foodId);
        }
        boolean success = generateAndSaveEmbedding(foodId);
        if (!success) {
            throw new IllegalArgumentException("Failed to generate embedding for food: " + foodId);
        }
    }
    
    /**
     * Get embedding statistics.
     */
    public EmbeddingStats getStats() {
        long total = usdaFoodRepository.count();
        long withEmbeddings = usdaFoodRepository.countByEmbeddingIsNotNull();
        return new EmbeddingStats(total, withEmbeddings, total - withEmbeddings);
    }
    
    /**
     * Build search text for embedding generation.
     * Combines name, description, and category for rich semantic representation.
     */
    private String buildSearchText(UsdaFood food) {
        StringBuilder sb = new StringBuilder();
        
        if (food.getName() != null) {
            sb.append(food.getName());
        }
        
        if (food.getDescription() != null && !food.getDescription().isEmpty()) {
            sb.append(" ").append(food.getDescription());
        }
        
        if (food.getCategory() != null && !food.getCategory().isEmpty()) {
            sb.append(" Category: ").append(food.getCategory());
        }
        
        return sb.toString().trim();
    }
    
    /**
     * Statistics about embedding coverage.
     */
    public record EmbeddingStats(long totalFoods, long withEmbeddings, long withoutEmbeddings) {}
}
