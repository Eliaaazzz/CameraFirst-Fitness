package com.fitnessapp.backend.embedding;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository.FoodSimilarityResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Admin controller for managing food embeddings.
 * Provides endpoints to seed embeddings and check status.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/embeddings")
@RequiredArgsConstructor
public class EmbeddingAdminController {

    private final VectorizationService vectorizationService;
    private final EmbeddingService embeddingService;
    private final UsdaFoodRepository usdaFoodRepository;
    
    /**
     * Get embedding statistics.
     */
    @GetMapping("/stats")
    public ResponseEntity<VectorizationService.EmbeddingStats> getStats() {
        return ResponseEntity.ok(vectorizationService.getStats());
    }
    
    /**
     * Trigger synchronous embedding seeding for all foods without embeddings.
     * Warning: This can take a long time for large datasets.
     */
    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedEmbeddings() {
        log.info("Admin triggered embedding seeding");
        int processed = vectorizationService.seedAllEmbeddings();
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "processed", processed
        ));
    }
    
    /**
     * Trigger async embedding seeding in background.
     */
    @PostMapping("/seed-async")
    public ResponseEntity<Map<String, String>> seedEmbeddingsAsync() {
        log.info("Admin triggered async embedding seeding");
        vectorizationService.seedAllEmbeddingsAsync();
        return ResponseEntity.accepted().body(Map.of(
                "status", "started",
                "message", "Embedding seeding started in background. Check /stats for progress."
        ));
    }
    
    /**
     * Regenerate embedding for a specific food item.
     */
    @PostMapping("/regenerate/{foodId}")
    public ResponseEntity<Map<String, String>> regenerateEmbedding(@PathVariable Long foodId) {
        log.info("Admin triggered embedding regeneration for food: {}", foodId);
        vectorizationService.regenerateEmbedding(foodId);
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "foodId", foodId.toString()
        ));
    }

    /**
     * Test vector similarity search - for debugging.
     * This endpoint tests the pgvector similarity search directly.
     */
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> testVectorSearch(
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int limit) {
        log.info("Testing vector search for query: {}", query);

        // Generate embedding for the query
        float[] queryEmbedding = embeddingService.generateEmbedding(query);

        // Check if embedding is valid
        boolean isZero = true;
        for (float f : queryEmbedding) {
            if (f != 0.0f) {
                isZero = false;
                break;
            }
        }
        if (isZero) {
            return ResponseEntity.ok(List.of(Map.of("error", "Failed to generate embedding - got zero vector")));
        }

        // Convert to vector string
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < queryEmbedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(String.format("%.8f", queryEmbedding[i]));
        }
        sb.append("]");
        String embeddingString = sb.toString();

        // Query database
        List<FoodSimilarityResult> results = usdaFoodRepository.findBySimilarityWithScore(embeddingString, limit);

        // Fetch food names and return with similarity
        List<Map<String, Object>> response = results.stream()
                .map(r -> {
                    var food = usdaFoodRepository.findById(r.getId()).orElse(null);
                    return Map.<String, Object>of(
                            "id", r.getId(),
                            "name", food != null ? food.getName() : "Unknown",
                            "similarity", r.getSimilarity()
                    );
                })
                .toList();

        return ResponseEntity.ok(response);
    }
}
