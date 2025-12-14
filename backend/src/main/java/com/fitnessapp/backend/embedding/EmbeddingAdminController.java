package com.fitnessapp.backend.embedding;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
}
