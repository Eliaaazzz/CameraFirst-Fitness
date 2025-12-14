package com.fitnessapp.backend.embedding;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service for batch vectorization of USDA food entries.
 * Generates embeddings for all foods that don't have them yet.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VectorizationService {
    
    private static final int BATCH_SIZE = 50;
    private static final long RATE_LIMIT_DELAY_MS = 100; // Delay between API calls
    
    private final EmbeddingService embeddingService;
    private final UsdaFoodRepository usdaFoodRepository;
    
    /**
     * Seed embeddings for all USDA foods without embeddings.
     * Call this once when setting up the database.
     * 
     * @return Number of foods processed
     */
    @Transactional
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
                generateAndSaveEmbedding(food);
                processed.incrementAndGet();
                
                if (processed.get() % BATCH_SIZE == 0) {
                    log.info("Progress: {}/{} embeddings generated", 
                            processed.get(), foodsWithoutEmbeddings.size());
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
     * Generate and save embedding for a single food item.
     */
    @Transactional
    public void generateAndSaveEmbedding(UsdaFood food) {
        String searchText = buildSearchText(food);
        float[] embedding = embeddingService.generateEmbedding(searchText);
        
        food.setEmbedding(embedding);
        food.setSearchText(searchText);
        food.setEmbeddingGeneratedAt(OffsetDateTime.now());
        
        usdaFoodRepository.save(food);
        
        log.debug("Generated embedding for: {} (dims: {})", 
                food.getName(), embedding.length);
    }
    
    /**
     * Regenerate embedding for a specific food (e.g., after name update).
     */
    @Transactional
    public void regenerateEmbedding(Long foodId) {
        UsdaFood food = usdaFoodRepository.findById(foodId)
                .orElseThrow(() -> new IllegalArgumentException("Food not found: " + foodId));
        generateAndSaveEmbedding(food);
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
