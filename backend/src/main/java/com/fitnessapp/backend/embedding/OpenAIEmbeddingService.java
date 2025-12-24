package com.fitnessapp.backend.embedding;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * OpenAI embedding service using text-embedding-3-small model.
 * Produces 1536-dimensional vectors optimized for semantic search.
 *
 * Features:
 * - Async non-blocking API calls using OkHttp async client
 * - Automatic retry with exponential backoff for transient failures
 * - Proper exception handling with EmbeddingGenerationException
 * - Thread pool for async operations
 */
@Slf4j
@Service
public class OpenAIEmbeddingService implements EmbeddingService {

    private static final String OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
    private static final String MODEL_NAME = "text-embedding-3-small";
    private static final int DIMENSIONS = 1536;
    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json");

    // Retry configuration
    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 1000;
    private static final double BACKOFF_MULTIPLIER = 2.0;

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final boolean available;
    private final ExecutorService executorService;

    public OpenAIEmbeddingService(
            @Value("${app.openai.api-key:}") String apiKey,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
        this.available = apiKey != null && !apiKey.isEmpty();

        // Virtual threads for efficient async operations (Java 21+)
        this.executorService = Executors.newVirtualThreadPerTaskExecutor();

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build();

        if (!available) {
            log.warn("OpenAI API key not configured. Embedding service will throw exceptions.");
        } else {
            log.info("OpenAI Embedding Service initialized with model: {} (async enabled, max retries: {})",
                    MODEL_NAME, MAX_RETRIES);
        }
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public boolean isAvailable() {
        return available;
    }

    @Override
    public float[] generateEmbedding(String text) throws EmbeddingGenerationException {
        validateInput(text);

        // Synchronous call with retry
        return executeWithRetry(text, 0);
    }

    @Override
    public CompletableFuture<float[]> generateEmbeddingAsync(String text) {
        try {
            validateInput(text);
        } catch (EmbeddingGenerationException e) {
            return CompletableFuture.failedFuture(e);
        }

        return executeAsyncWithRetry(text, 0);
    }

    // ============================================================================
    // Validation
    // ============================================================================

    private void validateInput(String text) throws EmbeddingGenerationException {
        if (!available) {
            throw EmbeddingGenerationException.apiKeyMissing();
        }
        if (text == null || text.trim().isEmpty()) {
            throw EmbeddingGenerationException.emptyInput();
        }
    }

    // ============================================================================
    // Sync Execution with Retry
    // ============================================================================

    private float[] executeWithRetry(String text, int attempt) throws EmbeddingGenerationException {
        try {
            return executeRequest(text);
        } catch (EmbeddingGenerationException e) {
            if (e.isRetryable() && attempt < MAX_RETRIES - 1) {
                long backoffMs = calculateBackoff(attempt);
                log.warn("Embedding request failed (attempt {}/{}), retrying in {}ms: {}",
                        attempt + 1, MAX_RETRIES, backoffMs, e.getMessage());

                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }

                return executeWithRetry(text, attempt + 1);
            }
            throw e;
        }
    }

    private float[] executeRequest(String text) throws EmbeddingGenerationException {
        try {
            String requestBody = objectMapper.writeValueAsString(new EmbeddingRequest(MODEL_NAME, text.trim()));

            Request request = buildRequest(requestBody);

            try (Response response = httpClient.newCall(request).execute()) {
                return handleResponse(response, text);
            }
        } catch (SocketTimeoutException e) {
            throw EmbeddingGenerationException.timeout(e);
        } catch (IOException e) {
            throw EmbeddingGenerationException.networkError(e);
        }
    }

    // ============================================================================
    // Async Execution with Retry
    // ============================================================================

    private CompletableFuture<float[]> executeAsyncWithRetry(String text, int attempt) {
        CompletableFuture<float[]> future = new CompletableFuture<>();

        try {
            String requestBody = objectMapper.writeValueAsString(new EmbeddingRequest(MODEL_NAME, text.trim()));
            Request request = buildRequest(requestBody);

            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    EmbeddingGenerationException exception;
                    if (e instanceof SocketTimeoutException) {
                        exception = EmbeddingGenerationException.timeout(e);
                    } else {
                        exception = EmbeddingGenerationException.networkError(e);
                    }

                    if (exception.isRetryable() && attempt < MAX_RETRIES - 1) {
                        retryAsync(text, attempt, future);
                    } else {
                        future.completeExceptionally(exception);
                    }
                }

                @Override
                public void onResponse(Call call, Response response) {
                    try {
                        float[] embedding = handleResponse(response, text);
                        future.complete(embedding);
                    } catch (EmbeddingGenerationException e) {
                        if (e.isRetryable() && attempt < MAX_RETRIES - 1) {
                            retryAsync(text, attempt, future);
                        } else {
                            future.completeExceptionally(e);
                        }
                    } finally {
                        response.close();
                    }
                }
            });
        } catch (Exception e) {
            future.completeExceptionally(EmbeddingGenerationException.networkError(e));
        }

        return future;
    }

    private void retryAsync(String text, int attempt, CompletableFuture<float[]> originalFuture) {
        long backoffMs = calculateBackoff(attempt);
        log.warn("Async embedding request failed (attempt {}/{}), retrying in {}ms",
                attempt + 1, MAX_RETRIES, backoffMs);

        executorService.submit(() -> {
            try {
                Thread.sleep(backoffMs);
                executeAsyncWithRetry(text, attempt + 1)
                        .whenComplete((result, ex) -> {
                            if (ex != null) {
                                originalFuture.completeExceptionally(ex);
                            } else {
                                originalFuture.complete(result);
                            }
                        });
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                originalFuture.completeExceptionally(
                        EmbeddingGenerationException.networkError(e));
            }
        });
    }

    // ============================================================================
    // Request/Response Handling
    // ============================================================================

    private Request buildRequest(String requestBody) {
        return new Request.Builder()
                .url(OPENAI_EMBEDDINGS_URL)
                .addHeader("Authorization", "Bearer " + apiKey)
                .addHeader("Content-Type", "application/json")
                .post(RequestBody.create(requestBody, JSON_MEDIA_TYPE))
                .build();
    }

    private float[] handleResponse(Response response, String originalText) throws EmbeddingGenerationException {
        try {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No body";
                int code = response.code();

                // Rate limit handling
                if (code == 429) {
                    throw EmbeddingGenerationException.rateLimited(errorBody);
                }

                // Server errors are retryable
                if (code >= 500) {
                    throw EmbeddingGenerationException.apiError(code, errorBody);
                }

                // Client errors (4xx except 429) are not retryable
                throw new EmbeddingGenerationException(
                        EmbeddingGenerationException.ErrorType.API_ERROR,
                        String.format("OpenAI API error (status %d): %s", code, errorBody));
            }

            String responseBody = response.body().string();
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode embeddingArray = root.path("data").get(0).path("embedding");

            if (embeddingArray.isMissingNode() || !embeddingArray.isArray()) {
                throw EmbeddingGenerationException.invalidResponse("Invalid embedding response structure");
            }

            float[] embedding = new float[embeddingArray.size()];
            for (int i = 0; i < embeddingArray.size(); i++) {
                embedding[i] = (float) embeddingArray.get(i).asDouble();
            }

            log.debug("Generated embedding of {} dimensions for text: {}...",
                    embedding.length, originalText.substring(0, Math.min(50, originalText.length())));

            return embedding;

        } catch (IOException e) {
            throw EmbeddingGenerationException.invalidResponse("Failed to parse response: " + e.getMessage());
        }
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    private long calculateBackoff(int attempt) {
        return (long) (INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt));
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
