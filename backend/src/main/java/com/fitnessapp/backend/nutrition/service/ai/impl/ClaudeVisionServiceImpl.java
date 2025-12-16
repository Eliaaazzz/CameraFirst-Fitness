package com.fitnessapp.backend.nutrition.service.ai.impl;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import com.fitnessapp.backend.nutrition.service.ai.ClaudeVisionService;
import com.fitnessapp.backend.nutrition.service.ai.FoodRecognitionProvider;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Claude Vision API service implementation.
 * Implements FoodRecognitionProvider for multi-model support.
 */
@Service
@ConditionalOnExpression("!'${app.anthropic.api-key:}'.isEmpty()")
public class ClaudeVisionServiceImpl implements ClaudeVisionService, FoodRecognitionProvider {

  private static final String PROVIDER_NAME = "claude";
  private static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
  private static final String MODEL = "claude-3-haiku-20240307";
  private static final int MAX_TOKENS = 1024;
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

  public ClaudeVisionServiceImpl(
      ObjectMapper objectMapper,
      @Value("${app.anthropic.api-key:}") String apiKey,
      @Value("${app.anthropic.enabled:false}") boolean enabled
  ) {
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
    this.enabled = enabled;
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
    return enabled && apiKey != null && !apiKey.isBlank();
  }

  @Override
  public int getPriority() {
    return 20; // Lower priority fallback behind Gemini
  }

  // ==================== ClaudeVisionService Interface ====================

  @Override
  public FoodRecognitionResult recognizeFoods(MultipartFile imageFile) throws IOException {
    // Validate API key is configured
    if (!isAvailable()) {
      throw new FoodRecognitionException("AI food recognition is not configured. Please set ANTHROPIC_API_KEY.");
    }

    // Validate image size
    if (imageFile.getSize() > MAX_IMAGE_SIZE) {
      throw new IllegalArgumentException("Image too large. Maximum size is 10MB, got " + 
          (imageFile.getSize() / 1024 / 1024) + "MB");
    }

    // Validate image type
    String contentType = imageFile.getContentType();
    if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
      throw new IllegalArgumentException("Unsupported image type: " + contentType + 
          ". Supported types: " + SUPPORTED_IMAGE_TYPES);
    }

    byte[] imageBytes = imageFile.getBytes();
    String base64Image = Base64.getEncoder().encodeToString(imageBytes);

    // Pass content type for dynamic media_type
    return recognizeFoods(base64Image, contentType);
  }

  @Override
  public FoodRecognitionResult recognizeFoods(String base64Image) {
    // Default to jpeg for backward compatibility
    return recognizeFoods(base64Image, "image/jpeg");
  }

  /**
   * Recognize foods from base64 image with specified media type
   */
  public FoodRecognitionResult recognizeFoods(String base64Image, String mediaType) {
    // Validate API key
    if (!isAvailable()) {
      throw new FoodRecognitionException("AI food recognition is not configured. Please set ANTHROPIC_API_KEY.");
    }

    int attempt = 0;
    Exception lastException = null;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        return callClaudeVisionAPI(base64Image, mediaType);
      } catch (Exception e) {
        lastException = e;

        if (attempt < MAX_RETRIES) {
          try {
            Thread.sleep(1000L * attempt); // Exponential backoff
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

  private FoodRecognitionResult callClaudeVisionAPI(String base64Image, String mediaType) throws IOException {
    String requestBody = buildRequestBody(base64Image, mediaType);

    Request request = new Request.Builder()
        .url(CLAUDE_API_URL)
        .addHeader("x-api-key", apiKey)
        .addHeader("anthropic-version", "2023-06-01")
        .addHeader("content-type", "application/json")
        .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
        .build();

    try (Response response = httpClient.newCall(request).execute()) {
      if (!response.isSuccessful()) {
        String errorBody = response.body() != null ? response.body().string() : "No error body";
        if (response.code() == 429) {
          throw new FoodRecognitionException("Rate limit exceeded, please try again later");
        } else if (response.code() >= 500) {
          throw new FoodRecognitionException("Claude AI service temporarily unavailable");
        } else {
          throw new FoodRecognitionException("Food recognition failed: " + errorBody);
        }
      }

      String responseBody = response.body().string();
      return parseResponse(responseBody);
    }
  }

  private String buildRequestBody(String base64Image, String mediaType) throws IOException {
    String prompt = buildRecognitionPrompt();

    String requestJson = String.format("""
        {
          \"model\": \"%s\",
          \"max_tokens\": %d,
          \"messages\": [
            {
              \"role\": \"user\",
              \"content\": [
                {
                  \"type\": \"image\",
                  \"source\": {
                    \"type\": \"base64\",
                    \"media_type\": \"%s\",
                    \"data\": \"%s\"
                  }
                },
                {
                  \"type\": \"text\",
                  \"text\": \"%s\"
                }
              ]
            }
          ]
        }
        """, MODEL, MAX_TOKENS, mediaType, base64Image, escapeJson(prompt));

    return requestJson;
  }

  private String buildRecognitionPrompt() {
    return """
        You are a professional nutritionist AI. Analyze this meal photo and identify all visible foods.

        For each food item, provide structured metadata to query a USDA nutrition database:
        - Base ingredient (e.g., "Chicken", "Salmon", "Beef", "Rice")
        - Form/cut (e.g., "Breast", "Thigh", "Fillet", "Whole")
        - Cooking method: One of [RAW, STEAMED, BOILED, GRILLED, ROASTED, FRIED, STIR_FRIED, BREADED]
        - Density category: Classify the food type (see categories below)
        - Portion size: One of [small, medium, large] relative to the density category
        - Your confidence level (0-1)

        CRITICAL - DENSITY CATEGORY CLASSIFICATION:
        You MUST classify each food into one of these categories:
        - "leafy_veg": Salads, spinach, lettuce, mixed greens (50-200g range)
        - "carb_staple": Rice, pasta, potatoes, bread, noodles (100-350g range)
        - "meat_main": Steak, chicken breast, fish fillet, pork chop (120-350g range)
        - "liquid_soup": Soups, stews, broths, curries with liquid (200-500g range)
        - "fats_dressing": Butter, oil, mayo, dressings, sauces (10-40g range)
        - "garnish": Garlic, ginger, fresh herbs, chili, scallions, cilantro (3-20g range)
        - "mixed_dish": Stir-fry, fried rice, buddha bowl, bento (150-450g range)
        - "fruit": Apple, banana, berries, melon (80-250g range)
        - "dairy": Milk, yogurt, cheese (100-300g range)
        - "snack": Chips, crackers, nuts, small pastries (30-100g range)
        - "beverage": Juice, smoothie, coffee drinks (200-500g range)
        - "generic": Use only if none of the above fit (100-300g range)

        IMPORTANT CLASSIFICATION RULES:
        - Garlic, ginger, herbs, chili -> "garnish" (NOT vegetable!)

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
            \"items\": [
                {
                    \"food_key\": \"grilled_chicken_breast\",
                    \"display_name\": \"Grilled Chicken Breast\",
                    \"cooking_method\": \"grilled\",
                    \"confidence\": 0.95,
                    \"metadata\": {
                        \"base_ingredient\": \"Chicken\",
                        \"form\": \"Breast\",
                        \"cooking_method\": \"GRILLED\",
                        \"search_terms\": [\"Chicken\", \"Breast\"],
                        \"density_category\": \"meat_main\",
                        \"portion_size\": \"medium\"
                    }
                }
            ],
            \"meal_type\": \"breakfast/lunch/dinner/snack\"
        }

        GRAM REFERENCE BY CATEGORY:
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
        - Steak on plate: density_category=\"meat_main\", portion_size=\"large\" (350g)
        - Side of rice: density_category=\"carb_staple\", portion_size=\"small\" (100g)
        - Large salad bowl: density_category=\"leafy_veg\", portion_size=\"large\" (200g)
        - Tablespoon of butter: density_category=\"fats_dressing\", portion_size=\"medium\" (20g)
        - Garlic cloves: density_category=\"garnish\", portion_size=\"small\" (3g)
        - Roasted garlic head: density_category=\"garnish\", portion_size=\"large\" (20g)

        If image is unclear or not food, return: {\"items\": [], \"meal_type\": \"unknown\"}
        """;
  }

  private FoodRecognitionResult parseResponse(String responseBody) {
    try {
      JsonNode root = objectMapper.readTree(responseBody);
      JsonNode contentArray = root.path("content");

      if (contentArray.isEmpty()) {
        throw new FoodRecognitionException("Invalid response from Claude API");
      }

      String textContent = contentArray.get(0).path("text").asText();
      FoodRecognitionResult result = objectMapper.readValue(textContent, FoodRecognitionResult.class);

      if (result.getItems() == null) {
        result.setItems(new ArrayList<>());
      }

      return result;

    } catch (IOException e) {
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
