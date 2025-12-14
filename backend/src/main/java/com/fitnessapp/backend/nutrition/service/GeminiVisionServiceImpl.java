package com.fitnessapp.backend.nutrition.service;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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
                \"maxOutputTokens\": %d,
                \"temperature\": 0.0,
                \"topK\": 1
              }
            }
            """, mediaType, base64Image, escapeJson(prompt), MAX_OUTPUT_TOKENS);

        return requestJson;
    }

    private String buildRecognitionPrompt() {
        return """
            You are a professional nutritionist AI. Analyze this meal photo and identify all visible foods.

            For each food item, provide structured metadata to query a USDA nutrition database:
            - Base ingredient (e.g., "Chicken", "Salmon", "Beef", "Rice")
            - Form/cut (e.g., "Breast", "Thigh", "Fillet", "Whole")
            - Cooking method: One of [RAW, STEAMED, BOILED, GRILLED, ROASTED, FRIED, STIR_FRIED, BREADED]
            - Visual attributes/modifiers (e.g., "skin-on", "breaded", "with sauce")
            - Portion size: One of [small, medium, large] if exact weight unknown
            - Proportion percentage: Estimate what % of the meal this ingredient represents (if multiple items)

            IMPORTANT: Do NOT assume grams. Instead:
            1. If you can see exact measurement (scale, portion container), provide "estimated_weight_g"
            2. Otherwise, provide "portion_size" (small/medium/large) based on visual comparison
            3. For meals with multiple items, estimate "proportion_percentage" (0-100) for each ingredient

            Return ONLY valid JSON, no other text:
            {
                "items": [
                    {
                        "food_key": "snake_case_english_identifier",
                        "display_name": "Descriptive name",
                        "cooking_method": "fried",
                        "confidence": 0.95,
                        "metadata": {
                            "base_ingredient": "Chicken",
                            "form": "Breast",
                            "cooking_method": "FRIED",
                            "modifiers": ["Breaded", "Crispy"],
                            "search_terms": ["Chicken", "Breast"],
                            "visual_attributes": ["breaded", "golden"],
                            "portion_size": "medium",
                            "proportion_percentage": 60
                        }
                    },
                    {
                        "food_key": "steamed_rice",
                        "display_name": "Steamed Rice",
                        "cooking_method": "steamed",
                        "confidence": 0.90,
                        "metadata": {
                            "base_ingredient": "Rice",
                            "form": "White",
                            "cooking_method": "STEAMED",
                            "search_terms": ["Rice", "White"],
                            "portion_size": "medium",
                            "proportion_percentage": 40
                        }
                    }
                ],
                "meal_type": "breakfast/lunch/dinner/snack"
            }

            Portion size reference:
            - Small: ~70g (child portion, side dish)
            - Medium: ~100g (standard adult serving)
            - Large: ~150g (generous portion, main dish)

            Common examples:
            - Fried chicken: base="Chicken", form="Breast", cooking_method="FRIED", portion_size="medium"
            - Grilled salmon: base="Salmon", form="Fillet", cooking_method="GRILLED", portion_size="large"
            - Steamed rice: base="Rice", cooking_method="STEAMED", portion_size="medium"

            If image is unclear or not food, return: {"items": [], "meal_type": "unknown"}
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

            String textContent = textBuilder.toString().trim();
            log.info("Gemini Vision text response: {}", textContent);

            // Extract JSON from markdown code blocks if present
            textContent = extractJsonFromText(textContent);

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

    /**
     * Extract JSON from text, handling markdown code blocks.
     * Gemini sometimes wraps JSON in ```json ... ``` markers.
     */
    private String extractJsonFromText(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        // Remove markdown code block markers if present
        text = text.trim();

        // Handle ```json ... ``` format
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }

        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }

        text = text.trim();

        // If text still doesn't start with {, try to find the first {
        if (!text.startsWith("{")) {
            int jsonStart = text.indexOf("{");
            if (jsonStart >= 0) {
                int jsonEnd = text.lastIndexOf("}");
                if (jsonEnd > jsonStart) {
                    text = text.substring(jsonStart, jsonEnd + 1);
                }
            }
        }

        return text;
    }

    private String escapeJson(String text) {
        return text.replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
