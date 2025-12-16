package com.fitnessapp.backend.embedding;

/**
 * Abstract interface for embedding generation.
 * Allows plugging in different embedding models (OpenAI, Cohere, local models, etc.)
 */
public interface EmbeddingService {
    
    /**
     * Generate embedding vector for the given text.
     * 
     * @param text The input text to embed
     * @return float array of embedding dimensions (typically 1536 for OpenAI)
     */
    float[] generateEmbedding(String text);
    
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
}
