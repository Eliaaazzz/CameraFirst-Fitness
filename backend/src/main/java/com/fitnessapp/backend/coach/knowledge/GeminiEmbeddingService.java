package com.fitnessapp.backend.coach.knowledge;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Embedding service backed by Gemini {@code text-embedding-004} (768-dim).
 *
 * <p>Deliberately separate from {@link com.fitnessapp.backend.embedding.OpenAIEmbeddingService}
 * (which powers the 1536-dim recipe corpus): the grounded-knowledge RAG layer uses Gemini so the whole
 * retrieve→generate→verify path runs on a single provider/key. It is NOT a {@code @Primary}
 * {@link com.fitnessapp.backend.embedding.EmbeddingService} bean, so it never clashes with the OpenAI
 * one. Only the AI-Studio (API-key) transport is supported; under Vertex or with no key it reports
 * {@link #isAvailable()} false and callers degrade gracefully (seeding skipped, tool returns an error
 * the agent surfaces honestly rather than guessing).</p>
 */
@Slf4j
@Service
public class GeminiEmbeddingService {

    public static final int DIMENSIONS = 768;
    private static final MediaType JSON = MediaType.parse("application/json");
    private static final int MAX_ATTEMPTS = 3;

    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final boolean available;
    private final OkHttpClient http;

    public GeminiEmbeddingService(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.base-url:}") String baseUrl,
            // gemini-embedding-001 supports outputDimensionality; text-embedding-004 was retired from
            // the AI-Studio v1beta API. Configurable so a model swap needs no rebuild.
            @Value("${app.gemini.embedding-model:gemini-embedding-001}") String model,
            @Value("${app.gemini.use-vertex-ai:true}") boolean useVertexAi) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        String base = (baseUrl == null || baseUrl.isBlank())
                ? "https://generativelanguage.googleapis.com"
                : baseUrl.trim().replaceAll("/+$", "");
        this.baseUrl = base;
        this.model = (model == null || model.isBlank()) ? "gemini-embedding-001" : model.trim();
        // Knowledge embeddings use the AI-Studio (API-key) transport; Vertex would need ADC + a
        // different endpoint, which the demo deployment does not configure.
        this.available = !useVertexAi && !this.apiKey.isEmpty();
        this.http = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
        log.info("GeminiEmbeddingService available={} (model={}, dims={})", available, this.model, DIMENSIONS);
    }

    public boolean isAvailable() {
        return available;
    }

    public int getDimensions() {
        return DIMENSIONS;
    }

    /**
     * Embed a single text into a 768-dim vector. Retries transient failures with backoff.
     *
     * @throws IllegalStateException if the service is not available (no key / Vertex mode)
     * @throws RuntimeException      if embedding fails after retries
     */
    public float[] embed(String text) {
        if (!available) {
            throw new IllegalStateException("Gemini embedding service is not available (no API key or Vertex mode)");
        }
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("text to embed must not be blank");
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", "models/" + model);
        ObjectNode content = body.putObject("content");
        content.putArray("parts").addObject().put("text", text);
        // Pin output to our schema's vector(768); gemini-embedding-001 defaults to 3072 otherwise.
        body.put("outputDimensionality", DIMENSIONS);
        String url = baseUrl + "/v1beta/models/" + model + ":embedContent?key=" + apiKey;

        RuntimeException last = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                Request req = new Request.Builder()
                        .url(url)
                        .post(RequestBody.create(objectMapper.writeValueAsBytes(body), JSON))
                        .build();
                try (Response resp = http.newCall(req).execute()) {
                    if (!resp.isSuccessful()) {
                        String msg = "Gemini embed HTTP " + resp.code();
                        // 429/5xx are retryable; 4xx (other) are not.
                        if (resp.code() == 429 || resp.code() >= 500) {
                            last = new RuntimeException(msg);
                            backoff(attempt);
                            continue;
                        }
                        throw new RuntimeException(msg);
                    }
                    JsonNode root = objectMapper.readTree(resp.body().bytes());
                    JsonNode values = root.path("embedding").path("values");
                    if (!values.isArray() || values.size() != DIMENSIONS) {
                        throw new RuntimeException("Unexpected Gemini embedding shape: size=" + values.size());
                    }
                    float[] out = new float[DIMENSIONS];
                    for (int i = 0; i < DIMENSIONS; i++) {
                        out[i] = (float) values.get(i).asDouble();
                    }
                    return out;
                }
            } catch (IOException e) {
                last = new RuntimeException("Gemini embed I/O error: " + e.getMessage(), e);
                backoff(attempt);
            }
        }
        throw last != null ? last : new RuntimeException("Gemini embed failed");
    }

    private void backoff(int attempt) {
        try {
            Thread.sleep(300L * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
