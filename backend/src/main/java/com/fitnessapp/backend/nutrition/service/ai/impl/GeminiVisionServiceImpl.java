package com.fitnessapp.backend.nutrition.service.ai.impl;

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
import com.fitnessapp.backend.nutrition.service.ai.FoodRecognitionProvider;

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
            - Density category: Classify the food type (see categories below)
            - Portion size: One of [small, medium, large] relative to the density category
            - Proportion percentage: Estimate what % of the meal this ingredient represents (if multiple items)

            CRITICAL - DENSITY CATEGORY CLASSIFICATION:
            You MUST classify each food into one of these categories:
            - "leafy_veg": Salads, spinach, lettuce, mixed greens (50-200g range)
            - "carb_staple": Rice, pasta, potatoes, bread, noodles (100-350g range)
            - "meat_main": Steak, chicken breast, fish fillet, pork chop (120-350g range)
            - "liquid_soup": Soups, stews, broths, curries with liquid (200-500g range)
            - "fats_dressing": Butter, oil, mayo, dressings, sauces (10-40g range)
            - "garnish": Garlic, ginger, fresh herbs, chili, scallions, cilantro, parsley (3-20g range)
            - "mixed_dish": Stir-fry, fried rice, buddha bowl, bento (150-450g range)
            - "fruit": Apple, banana, berries, melon (80-250g range)
            - "dairy": Milk, yogurt, cheese (100-300g range)
            - "snack": Chips, crackers, nuts, small pastries (30-100g range)
            - "beverage": Juice, smoothie, coffee drinks (200-500g range)
            - "generic": Use only if none of the above fit (100-300g range)

            IMPORTANT CLASSIFICATION RULES:
            - Garlic cloves, minced garlic, roasted garlic -> "garnish" (NOT vegetable!)
            - Ginger, fresh herbs, chili peppers -> "garnish" (used for flavoring)
            - Whole roasted garlic head = "garnish" with portion_size="large" (20g max)

            PORTION SIZE is relative to the density category:
            - "small": Lower end of the category's gram range
            - "medium": Middle of the category's gram range
            - "large": Upper end of the category's gram range

            IMPORTANT: Do NOT guess exact grams blindly. Instead:
            1. First identify the FOOD TYPE and classify into a density_category
            2. Then estimate portion_size (small/medium/large) based on visual comparison WITHIN that category
            3. Only provide "estimated_weight_g" if you can see a scale or known reference object

            Return ONLY valid JSON, no other text:
            {
                "items": [
                    {
                        "food_key": "grilled_chicken_breast",
                        "display_name": "Grilled Chicken Breast",
                        "cooking_method": "grilled",
                        "confidence": 0.95,
                        "metadata": {
                            "base_ingredient": "Chicken",
                            "form": "Breast",
                            "cooking_method": "GRILLED",
                            "modifiers": ["Skinless"],
                            "search_terms": ["Chicken", "Breast"],
                            "visual_attributes": ["grilled", "charred"],
                            "density_category": "meat_main",
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
                            "density_category": "carb_staple",
                            "portion_size": "small",
                            "proportion_percentage": 30
                        }
                    },
                    {
                        "food_key": "garden_salad",
                        "display_name": "Garden Salad",
                        "cooking_method": "raw",
                        "confidence": 0.85,
                        "metadata": {
                            "base_ingredient": "Mixed Greens",
                            "form": "Salad",
                            "cooking_method": "RAW",
                            "search_terms": ["Salad", "Mixed Greens"],
                            "density_category": "leafy_veg",
                            "portion_size": "medium",
                            "proportion_percentage": 10
                        }
                    }
                ],
                "meal_type": "breakfast/lunch/dinner/snack"
            }

            GRAM REFERENCE BY CATEGORY (use these to calibrate your portion estimates):
            | Category      | Small  | Medium | Large  |
            |---------------|--------|--------|--------|
            | leafy_veg     | 50g    | 100g   | 200g   |
            | carb_staple   | 100g   | 200g   | 350g   |
            | meat_main     | 120g   | 200g   | 350g   |
            | liquid_soup   | 200g   | 350g   | 500g   |
            | fats_dressing | 10g    | 20g    | 40g    |
            | garnish       | 3g     | 10g    | 20g    |
            | mixed_dish    | 150g   | 300g   | 450g   |
            | fruit         | 80g    | 150g   | 250g   |
            | dairy         | 100g   | 200g   | 300g   |
            | snack         | 30g    | 60g    | 100g   |
            | beverage      | 200g   | 350g   | 500g   |
            | generic       | 100g   | 200g   | 300g   |

            Common examples:
            - Steak on plate: density_category="meat_main", portion_size="large" (350g)
            - Side of rice: density_category="carb_staple", portion_size="small" (100g)
            - Large salad bowl: density_category="leafy_veg", portion_size="large" (200g)
            - Tablespoon of butter: density_category="fats_dressing", portion_size="medium" (20g)
            - Bowl of soup: density_category="liquid_soup", portion_size="medium" (350g)
            - Handful of nuts: density_category="snack", portion_size="small" (30g)
            - Garlic cloves (2-3): density_category="garnish", portion_size="small" (3g)
            - Roasted garlic head: density_category="garnish", portion_size="large" (20g)
            - Fresh herbs/ginger: density_category="garnish", portion_size="medium" (10g)

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
