package com.fitnessapp.backend.embedding;

import java.util.concurrent.CompletableFuture;

/**
 * Abstract interface for embedding generation.
 * Allows plugging in different embedding models (OpenAI, Cohere, local models, etc.)
 *
 * Supports both synchronous and asynchronous operations:
 * - Sync methods throw EmbeddingGenerationException on failure
 * - Async methods return CompletableFuture for non-blocking operations
 */
public interface EmbeddingService {

    /**
     * Generate embedding vector for the given text (synchronous).
     *
     * @param text The input text to embed
     * @return float array of embedding dimensions (typically 1536 for OpenAI)
     * @throws EmbeddingGenerationException if embedding generation fails
     */
    float[] generateEmbedding(String text) throws EmbeddingGenerationException;

    /**
     * Generate embedding vector asynchronously (non-blocking).
     *
     * @param text The input text to embed
     * @return CompletableFuture containing the embedding or completing exceptionally
     */
    CompletableFuture<float[]> generateEmbeddingAsync(String text);

    /**
     * Get the dimensionality of embeddings produced by this service.
     *
     * @return Number of dimensions (e.g., 1536 for text-embedding-3-small)
     */
    int getDimensions();

    /**
     * Get the model name for logging purposes.
     *
     * @return Model identifier string
     */
    String getModelName();

    /**
     * Check if the embedding service is properly configured and available.
     *
     * @return true if the service can generate embeddings
     */
    default boolean isAvailable() {
        return true;
    }
}
