package com.fitnessapp.backend.embedding;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.recommendation.ContentEmbeddingSeeder;
import com.fitnessapp.backend.recommendation.ContentEmbeddingSeeder.ContentEmbeddingStats;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Admin controller for managing content embeddings (videos + recipes).
 * Provides endpoints to seed embeddings and check status.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/embeddings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class EmbeddingAdminController {

    private final ContentEmbeddingSeeder contentEmbeddingSeeder;

    // ============================================================================
    // Content Recommendation Embeddings (Videos + Recipes)
    // ============================================================================

    /**
     * Get content embedding statistics (videos + recipes).
     */
    @GetMapping("/content/stats")
    public ResponseEntity<ContentEmbeddingStats> getContentStats() {
        return ResponseEntity.ok(contentEmbeddingSeeder.getStats());
    }

    /**
     * Seed embeddings for all content (videos + recipes) without embeddings.
     */
    @PostMapping("/content/seed")
    public ResponseEntity<Map<String, Object>> seedContentEmbeddings() {
        log.info("Admin triggered content embedding seeding");
        int processed = contentEmbeddingSeeder.seedAllEmbeddings();
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "processed", processed,
                "stats", contentEmbeddingSeeder.getStats()
        ));
    }

    /**
     * Seed content embeddings asynchronously in background.
     */
    @PostMapping("/content/seed-async")
    public ResponseEntity<Map<String, String>> seedContentEmbeddingsAsync() {
        log.info("Admin triggered async content embedding seeding");
        contentEmbeddingSeeder.seedAllEmbeddingsAsync();
        return ResponseEntity.accepted().body(Map.of(
                "status", "started",
                "message", "Content embedding seeding started in background. Check /content/stats for progress."
        ));
    }

    /**
     * Seed only video embeddings.
     */
    @PostMapping("/content/seed-videos")
    public ResponseEntity<Map<String, Object>> seedVideoEmbeddings() {
        log.info("Admin triggered video embedding seeding");
        int processed = contentEmbeddingSeeder.seedVideoEmbeddings();
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "type", "videos",
                "processed", processed
        ));
    }

    /**
     * Seed only recipe embeddings.
     */
    @PostMapping("/content/seed-recipes")
    public ResponseEntity<Map<String, Object>> seedRecipeEmbeddings() {
        log.info("Admin triggered recipe embedding seeding");
        int processed = contentEmbeddingSeeder.seedRecipeEmbeddings();
        return ResponseEntity.ok(Map.of(
                "status", "completed",
                "type", "recipes",
                "processed", processed
        ));
    }
}
