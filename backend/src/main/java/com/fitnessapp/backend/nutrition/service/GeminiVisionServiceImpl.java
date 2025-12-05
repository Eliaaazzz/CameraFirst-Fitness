package com.fitnessapp.backend.nutrition.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Set;

/**
 * Google Gemini Vision implementation using Gemini Flash 2.0 model.
 * Acts as the primary FoodRecognitionProvider.
 */
@Slf4j
@Service
public class GeminiVisionServiceImpl implements FoodRecognitionProvider {

    private static final String PROVIDER_NAME = "gemini";
    private static final String MODEL = "gemini-2.0-flash";
    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
    private static final int MAX_OUTPUT_TOKENS = 1024;
    private static final int TIMEOUT_SECONDS = 30;
    private static final int MAX_RETRIES = 2;
    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final boolean enabled;

    public GeminiVisionServiceImpl(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.enabled:true}") boolean enabled
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.enabled = enabled;

        if (!enabled) {
            log.info("Gemini vision provider disabled via configuration");
        } else if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️  Gemini API key not configured - Gemini food recognition will be disabled");
        }

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .readTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .writeTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .build();
    }

    // ==================== FoodRecognitionProvider ====================

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
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    @Override
    public int getPriority() {
        return 5; // Prefer Gemini over other providers
    }

    @Override
    public FoodRecognitionResult recognizeFoods(MultipartFile imageFile) throws IOException {
        if (!isAvailable()) {
            throw new FoodRecognitionException("AI food recognition is not configured. Please set GEMINI_API_KEY.");
        }

        if (imageFile.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("Image too large. Maximum size is 10MB, got " +
                    (imageFile.getSize() / 1024 / 1024) + "MB");
        }

        String contentType = imageFile.getContentType();
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image type: " + contentType +
                    ". Supported types: " + SUPPORTED_IMAGE_TYPES);
        }

        log.info("Processing image file with Gemini: {}, size: {} bytes, type: {}",
                imageFile.getOriginalFilename(), imageFile.getSize(), contentType);

        String base64Image = Base64.getEncoder().encodeToString(imageFile.getBytes());
        return recognizeFoods(base64Image, contentType);
    }

    @Override
    public FoodRecognitionResult recognizeFoods(String base64Image, String mediaType) {
        if (!isAvailable()) {
            throw new FoodRecognitionException("AI food recognition is not configured. Please set GEMINI_API_KEY.");
        }

        int attempt = 0;
        Exception lastException = null;

        while (attempt < MAX_RETRIES) {
            attempt++;
            try {
                log.info("Calling Gemini Flash API (attempt {}/{})", attempt, MAX_RETRIES);
                return callGeminiAPI(base64Image, mediaType);
            } catch (Exception e) {
                lastException = e;
                log.warn("Gemini Vision API call failed (attempt {}/{}): {}",
                        attempt, MAX_RETRIES, e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(1000L * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }

        throw new FoodRecognitionException(
                "Failed to recognize foods after " + MAX_RETRIES + " attempts",
                lastException
        );
    }

    private FoodRecognitionResult callGeminiAPI(String base64Image, String mediaType) throws IOException {
        String requestBody = buildRequestBody(base64Image, mediaType);

        Request request = new Request.Builder()
                .url(GEMINI_API_URL + "?key=" + apiKey)
                .addHeader("content-type", "application/json")
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error body";
                log.error("Gemini API error ({}): {}", response.code(), errorBody);

                if (response.code() == 429) {
                    throw new FoodRecognitionException("Rate limit exceeded, please try again later");
                } else if (response.code() >= 500) {
                    throw new FoodRecognitionException("Gemini AI service temporarily unavailable");
                } else {
                    throw new FoodRecognitionException("Food recognition failed: " + errorBody);
                }
            }

            String responseBody = response.body() != null ? response.body().string() : "";
            log.debug("Gemini API response: {}", responseBody);

            return parseResponse(responseBody);
        }
    }

    private String buildRequestBody(String base64Image, String mediaType) throws IOException {
        String prompt = buildRecognitionPrompt();

        String requestJson = String.format("""
            {
              \"contents\": [
                {
                  \"parts\": [
                    {
                      \"inline_data\": {
                        \"mime_type\": \"%s\",
                        \"data\": \"%s\"
                      }
                    },
                    { \"text\": \"%s\" }
                  ]
                }
              ],
              \"generationConfig\": {
                \"maxOutputTokens\": %d
              }
            }
            """, mediaType, base64Image, escapeJson(prompt), MAX_OUTPUT_TOKENS);

        return requestJson;
    }

    private String buildRecognitionPrompt() {
        return """
            You are a professional nutritionist AI. Analyze this meal photo and identify all visible foods.

            For each food item, estimate:
            - Weight in grams (reference: standard bowl = 200g rice, fist-size meat = 100g)
            - Cooking method
            - Your confidence level (0-1)

            Return ONLY valid JSON, no other text:
            {
                \"items\": [
                    {
                        \"food_key\": \"snake_case_english_identifier\",
                        \"display_name\": \"Chinese name\",
                        \"estimated_grams\": 200,
                        \"cooking_method\": \"steamed/fried/grilled/etc\",
                        \"confidence\": 0.95
                    }
                ],
                \"meal_type\": \"breakfast/lunch/dinner/snack\"
            }

            Common food_key examples:
            - steamed_rice, fried_rice, noodles
            - chicken_breast, braised_pork, beef_stir_fry
            - boiled_egg, fried_egg, scrambled_egg
            - stir_fried_vegetables, tomato_egg

            If image is unclear or not food, return: {\"items\": [], \"meal_type\": \"unknown\"}
            """;
    }

    private FoodRecognitionResult parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (!candidates.isArray() || candidates.isEmpty()) {
                throw new FoodRecognitionException("Invalid response from Gemini API");
            }

            JsonNode parts = candidates.get(0).path("content").path("parts");
            StringBuilder textBuilder = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("text")) {
                    textBuilder.append(part.get("text").asText());
                }
            }

            String textContent = textBuilder.toString();
            log.info("Gemini Vision text response: {}", textContent);

            FoodRecognitionResult result = objectMapper.readValue(textContent, FoodRecognitionResult.class);
            if (result.getItems() == null) {
                result.setItems(new ArrayList<>());
            }

            log.info("Successfully recognized {} food items (Gemini), meal type: {}",
                    result.getItems().size(), result.getMealType());

            return result;

        } catch (IOException e) {
            log.error("Failed to parse Gemini Vision response", e);
            throw new FoodRecognitionException("Failed to parse food recognition result", e);
        }
    }

    private String escapeJson(String text) {
        return text.replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
