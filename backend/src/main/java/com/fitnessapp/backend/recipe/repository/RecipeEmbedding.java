package com.fitnessapp.backend.recipe.repository;

import java.util.UUID;

/**
 * Minimal projection interface for late-fetching embeddings.
 *
 * LATE FETCHING STRATEGY:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Stage 1: Fetch 200 RecipeSummary (NO embedding) = ~100KB              │
 * │  Stage 2a: Filter to ~50 candidates                                     │
 * │  Stage 2b: Late-fetch embeddings for 50 IDs = ~300KB                   │
 * │  Stage 2c: Compute AI cosine similarity on 50 candidates               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Memory comparison:
 * - Eager loading 200 embeddings: 200 * 6KB = 1.2MB (TOO HEAVY for t2.micro)
 * - Late fetching 50 embeddings: 50 * 6KB = 300KB (SAFE for t2.micro)
 *
 * This projection contains ONLY the fields needed for AI similarity scoring:
 * - id: To match with RecipeSummary candidates
 * - embedding: The vector(1536) for cosine similarity calculation
 */
public interface RecipeEmbedding {

    /**
     * Recipe ID for joining with RecipeSummary data.
     */
    UUID getId();

    /**
     * The embedding vector (1536 dimensions, ~6KB).
     * Used for cosine similarity with the query embedding.
     */
    float[] getEmbedding();
}
