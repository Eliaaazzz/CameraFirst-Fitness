package com.fitnessapp.backend.embedding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

/**
 * OpenAI embedding service using text-embedding-3-small model.
 * Produces 1536-dimensional vectors optimized for semantic search.
 */
@Slf4j
@Service
public class OpenAIEmbeddingService implements EmbeddingService {
    
    private static final String OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
    private static final String MODEL_NAME = "text-embedding-3-small";
    private static final int DIMENSIONS = 1536;
    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json");
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    
    public OpenAIEmbeddingService(
            @Value("${app.openai.api-key:}") String apiKey,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();
        
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key not configured. Embedding service will return zero vectors.");
        } else {
            log.info("OpenAI Embedding Service initialized with model: {}", MODEL_NAME);
        }
    }
    
    @Override
    public float[] generateEmbedding(String text) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key not set, returning zero vector");
            return new float[DIMENSIONS];
        }
        
        if (text == null || text.trim().isEmpty()) {
            log.warn("Empty text provided, returning zero vector");
            return new float[DIMENSIONS];
        }
        
        try {
            // Build request body
            String requestBody = objectMapper.writeValueAsString(new EmbeddingRequest(MODEL_NAME, text.trim()));
            
            Request request = new Request.Builder()
                    .url(OPENAI_EMBEDDINGS_URL)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .post(RequestBody.create(requestBody, JSON_MEDIA_TYPE))
                    .build();
            
            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "No body";
                    log.error("OpenAI API error: {} - {}", response.code(), errorBody);
                    return new float[DIMENSIONS];
                }
                
                String responseBody = response.body().string();
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode embeddingArray = root.path("data").get(0).path("embedding");
                
                if (embeddingArray.isMissingNode() || !embeddingArray.isArray()) {
                    log.error("Invalid embedding response structure");
                    return new float[DIMENSIONS];
                }
                
                float[] embedding = new float[embeddingArray.size()];
                for (int i = 0; i < embeddingArray.size(); i++) {
                    embedding[i] = (float) embeddingArray.get(i).asDouble();
                }
                
                log.debug("Generated embedding of {} dimensions for text: {}...", 
                        embedding.length, text.substring(0, Math.min(50, text.length())));
                return embedding;
            }
        } catch (IOException e) {
            log.error("Failed to generate embedding: {}", e.getMessage(), e);
            return new float[DIMENSIONS];
        }
    }
    
    @Override
    public int getDimensions() {
        return DIMENSIONS;
    }
    
    @Override
    public String getModelName() {
        return MODEL_NAME;
    }
    
    /**
     * Request DTO for OpenAI embeddings API
     */
    private record EmbeddingRequest(String model, String input) {}
}
