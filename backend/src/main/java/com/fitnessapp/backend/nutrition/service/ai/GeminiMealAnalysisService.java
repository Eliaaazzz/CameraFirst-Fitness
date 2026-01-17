
package com.fitnessapp.backend.nutrition.service.ai;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Gemini 3 Pro Food Recognition Provider
 * 
 * Implements FoodRecognitionProvider for strategy pattern.
 * Uses Gemini 3 Pro for AI-powered food recognition and nutrition analysis.
 */
@Slf4j
@Service
public class GeminiMealAnalysisService implements FoodRecognitionProvider {

    private static final String PROVIDER_NAME = "gemini";
    private static final String MODEL = "gemini-3-pro";
    private static final String GEMINI_API_URL = 
            "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
    
    private static final int MAX_OUTPUT_TOKENS = 1024;
    private static final int TIMEOUT_SECONDS = 60;
    private static final int MAX_RETRIES = 2;
    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public GeminiMealAnalysisService(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ Gemini API key not configured");
        } else {
            log.info("✅ GeminiMealAnalysisService initialized: {}", MODEL);
        }

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .readTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .writeTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .build();
    }

    // ==================== FoodRecognitionProvider Interface ====================

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public String getModelName() {
        return MODEL;
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public int getPriority() {
        return 10; // Highest priority - primary provider
    }

    @Override
    public FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException {
        if (!isAvailable()) {
            throw new FoodRecognitionException("Gemini API key not configured");
        }

        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("Image too large. Max 10MB");
        }

        String contentType = image.getContentType();
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image type: " + contentType);
        }

        log.info("🍽️ Gemini analyzing meal: size={} bytes", image.getSize());
        String base64Image = Base64.getEncoder().encodeToString(image.getBytes());
        return recognizeFoods(base64Image, contentType);
    }

    @Override
    public FoodRecognitionResult recognizeFoods(String base64Image, String mediaType) {
        int attempt = 0;
        Exception lastException = null;

        while (attempt < MAX_RETRIES) {
            attempt++;
            try {
                return executeApiCall(base64Image, mediaType);
            } catch (Exception e) {
                lastException = e;
                log.warn("Gemini API failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try { Thread.sleep(1000L * attempt); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        throw new FoodRecognitionException("Failed after " + MAX_RETRIES + " attempts", lastException);
    }

    // ==================== API Implementation ====================

    private FoodRecognitionResult executeApiCall(String base64Image, String mediaType) throws IOException {
        String requestBody = buildRequestBody(base64Image, mediaType);

        Request request = new Request.Builder()
                .url(GEMINI_API_URL + "?key=" + apiKey)
                .addHeader("content-type", "application/json")
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                log.error("Gemini API error ({}): {}", response.code(), errorBody);
                if (response.code() == 429) {
                    throw new FoodRecognitionException("Rate limit exceeded");
                }
                throw new FoodRecognitionException("API error: " + response.code());
            }

            String responseBody = response.body() != null ? response.body().string() : "";
            return parseResponse(responseBody);
        }
    }

    private String buildRequestBody(String base64Image, String mediaType) {
        // Simplified prompt - no meal type, just food + nutrition
        String prompt = "Analyze meal photo. Return JSON: {\"foods\":[{\"name\":\"Food Name\",\"grams\":150,\"calories\":300,\"protein\":25,\"carbs\":30,\"fat\":10}]}. Rules: name=2-5 words, all numbers=integers, grams=estimated portion size.";

        return String.format("""
            {
              "system_instruction": {"parts": [{"text": "%s"}]},
              "contents": [{"parts": [
                {"inline_data": {"mime_type": "%s", "data": "%s"}},
                {"text": "Analyze this meal."}
              ]}],
              "generationConfig": {"maxOutputTokens": %d, "temperature": 0.1, "responseMimeType": "application/json"}
            }
            """, escapeJson(prompt), mediaType, base64Image, MAX_OUTPUT_TOKENS);
    }

    private FoodRecognitionResult parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new FoodRecognitionException("Invalid Gemini response");
            }

            JsonNode parts = candidates.get(0).path("content").path("parts");
            StringBuilder textBuilder = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("text")) {
                    textBuilder.append(part.get("text").asText());
                }
            }

            String json = extractJson(textBuilder.toString().trim());
            JsonNode data = objectMapper.readTree(json);
            
            List<RecognizedFood> items = new ArrayList<>();
            JsonNode foods = data.path("foods");
            
            for (JsonNode food : foods) {
                NutritionInfo nutrition = NutritionInfo.builder()
                        .calories(BigDecimal.valueOf(food.path("calories").asInt(0)))
                        .protein(BigDecimal.valueOf(food.path("protein").asInt(0)))
                        .carbs(BigDecimal.valueOf(food.path("carbs").asInt(0)))
                        .fat(BigDecimal.valueOf(food.path("fat").asInt(0)))
                        .build();

                RecognizedFood item = RecognizedFood.builder()
                        .foodKey(food.path("name").asText("Unknown").toLowerCase().replace(" ", "_"))
                        .displayName(food.path("name").asText("Unknown"))
                        .estimatedGrams(food.path("grams").asInt(100))
                        .confidence(0.9)
                        .nutrition(nutrition)
                        .build();
                
                items.add(item);
                log.info("✅ Found: {} ({}g, {}kcal, {}g protein)", 
                        item.getDisplayName(), item.getEstimatedGrams(),
                        nutrition.getCalories(), nutrition.getProtein());
            }

            return FoodRecognitionResult.builder()
                    .items(items)
                    .build();

        } catch (IOException e) {
            log.error("Failed to parse Gemini response", e);
            throw new FoodRecognitionException("Parse error", e);
        }
    }

    private String extractJson(String text) {
        if (text == null) return "{}";
        text = text.trim();
        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length() - 3);
        text = text.trim();
        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");
        if (start >= 0 && end > start) text = text.substring(start, end + 1);
        return text;
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}
