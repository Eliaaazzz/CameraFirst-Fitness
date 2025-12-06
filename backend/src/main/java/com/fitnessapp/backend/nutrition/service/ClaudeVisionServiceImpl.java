package com.fitnessapp.backend.nutrition.service;

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

import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Claude Vision API service implementation.
 * Implements FoodRecognitionProvider for multi-model support.
 */
@Slf4j
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

  public ClaudeVisionServiceImpl(
      ObjectMapper objectMapper,
      @Value("${app.anthropic.api-key:}") String apiKey
  ) {
    if (apiKey == null || apiKey.isBlank()) {
      log.warn("⚠️  Anthropic API key not configured - Claude food recognition will be disabled");
    }
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
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
    return 100; // Low priority - Claude is deprecated, Gemini is primary provider
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

    log.info("Processing image file: {}, size: {} bytes, type: {}",
        imageFile.getOriginalFilename(), imageFile.getSize(), contentType);

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
    if (apiKey == null || apiKey.isBlank()) {
      throw new FoodRecognitionException("AI food recognition is not configured. Please set ANTHROPIC_API_KEY.");
    }

    int attempt = 0;
    Exception lastException = null;

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        log.info("Calling Claude Vision API (attempt {}/{})", attempt, MAX_RETRIES);
        return callClaudeVisionAPI(base64Image, mediaType);
      } catch (Exception e) {
        lastException = e;
        log.warn("Claude Vision API call failed (attempt {}/{}): {}",
            attempt, MAX_RETRIES, e.getMessage());

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
        log.error("Claude API error ({}): {}", response.code(), errorBody);

        if (response.code() == 429) {
          throw new FoodRecognitionException("Rate limit exceeded, please try again later");
        } else if (response.code() >= 500) {
          throw new FoodRecognitionException("Claude AI service temporarily unavailable");
        } else {
          throw new FoodRecognitionException("Food recognition failed: " + errorBody);
        }
      }

      String responseBody = response.body().string();
      log.debug("Claude API response: {}", responseBody);

      return parseResponse(responseBody);
    }
  }

  private String buildRequestBody(String base64Image, String mediaType) throws IOException {
    String prompt = buildRecognitionPrompt();

    String requestJson = String.format("""
        {
          "model": "%s",
          "max_tokens": %d,
          "messages": [
            {
              "role": "user",
              "content": [
                {
                  "type": "image",
                  "source": {
                    "type": "base64",
                    "media_type": "%s",
                    "data": "%s"
                  }
                },
                {
                  "type": "text",
                  "text": "%s"
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

        For each food item, estimate:
        - Weight in grams (reference: standard bowl = 200g rice, fist-size meat = 100g)
        - Cooking method
        - Your confidence level (0-1)

        Return ONLY valid JSON, no other text:
        {
            "items": [
                {
                    "food_key": "snake_case_english_identifier",
                    "display_name": "Chinese name",
                    "estimated_grams": 200,
                    "cooking_method": "steamed/fried/grilled/etc",
                    "confidence": 0.95
                }
            ],
            "meal_type": "breakfast/lunch/dinner/snack"
        }

        Common food_key examples:
        - steamed_rice, fried_rice, noodles
        - chicken_breast, braised_pork, beef_stir_fry
        - boiled_egg, fried_egg, scrambled_egg
        - stir_fried_vegetables, tomato_egg

        If image is unclear or not food, return: {"items": [], "meal_type": "unknown"}
        """;
  }

  private FoodRecognitionResult parseResponse(String responseBody) {
    try {
      JsonNode root = objectMapper.readTree(responseBody);
      JsonNode contentArray = root.path("content");

      if (contentArray.isEmpty()) {
        log.error("Empty content in Claude response");
        throw new FoodRecognitionException("Invalid response from Claude API");
      }

      String textContent = contentArray.get(0).path("text").asText();
      log.info("Claude Vision text response: {}", textContent);

      // Parse the JSON response from Claude
      FoodRecognitionResult result = objectMapper.readValue(textContent, FoodRecognitionResult.class);

      if (result.getItems() == null) {
        result.setItems(new ArrayList<>());
      }

      log.info("Successfully recognized {} food items, meal type: {}",
          result.getItems().size(), result.getMealType());

      return result;

    } catch (IOException e) {
      log.error("Failed to parse Claude Vision response", e);
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
