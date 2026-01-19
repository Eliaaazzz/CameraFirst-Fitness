
package com.fitnessapp.backend.nutrition.service.ai;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.imageio.ImageIO;

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
    private static final String MODEL = "gemini-2.5-flash";
    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
    
    // Increased from 1024 to 4096 to handle complex meals (e.g., sushi bento with many items)
    private static final int MAX_OUTPUT_TOKENS = 4096;
    private static final int TIMEOUT_SECONDS = 60;
    private static final int MAX_RETRIES = 2;
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
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

        // Compress image before sending to Gemini API - reduces upload time by 50%+
        String optimizedImage = compressImage(base64Image);
        String optimizedMediaType = optimizedImage.equals(base64Image) ? mediaType : "image/jpeg";
        log.info("🗜️ Image optimization: original {} chars, optimized {} chars", 
                base64Image.length(), optimizedImage.length());

        while (attempt < MAX_RETRIES) {
            attempt++;
            try {
                return executeApiCall(optimizedImage, optimizedMediaType);
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

    /**
     * Compress image to max 1024px dimension for faster API calls.
     * Gemini doesn't need full resolution for food recognition.
     * 
     * IMPORTANT: Java ImageIO does NOT support HEIC format (iPhone default).
     * The frontend must convert HEIC to JPEG before sending.
     */
    private String compressImage(String base64Image) {
        try {
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            log.info("🖼️ Attempting to decode image: {} bytes", imageBytes.length);
            
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

            if (originalImage == null) {
                // ImageIO.read() returns null for unsupported formats (HEIC, some iPhone JPEGs)
                log.warn("⚠️ ImageIO.read() returned null - unsupported image format! " +
                        "This usually means HEIC format or corrupted image. " +
                        "First 4 bytes (magic number): {}",
                        bytesToHex(imageBytes, 4));
                log.warn("📱 iPhone HEIC images must be converted to JPEG by the frontend before upload!");
                return base64Image; // Return original, let Gemini try to handle it
            }

            int maxDim = 1024;
            int width = originalImage.getWidth();
            int height = originalImage.getHeight();

            // Skip if already small enough
            if (width <= maxDim && height <= maxDim) {
                log.info("🖼️ Image already optimal size: {}x{}", width, height);
                return base64Image;
            }

            // Calculate new dimensions maintaining aspect ratio
            if (width > height) {
                height = (int) (height * ((double) maxDim / width));
                width = maxDim;
            } else {
                width = (int) (width * ((double) maxDim / height));
                height = maxDim;
            }

            // Resize with high quality
            BufferedImage resizedImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = resizedImage.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(originalImage, 0, 0, width, height, null);
            g.dispose();

            // Encode as JPEG for smaller size
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(resizedImage, "jpg", baos);
            String compressed = Base64.getEncoder().encodeToString(baos.toByteArray());

            log.info("🗜️ Image compressed: {}x{} -> {}x{}, {} KB -> {} KB",
                    originalImage.getWidth(), originalImage.getHeight(),
                    width, height,
                    imageBytes.length / 1024, baos.size() / 1024);

            return compressed;

        } catch (Exception e) {
            log.error("Image compression failed, using original", e);
            return base64Image;
        }
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
            String responseBody = response.body() != null ? response.body().string() : "";
            log.info("📡 Gemini API response code: {}, body length: {}", response.code(), responseBody.length());
            log.info("📡 Gemini API full response: {}", responseBody);

            if (!response.isSuccessful()) {
                log.error("Gemini API error ({}): {}", response.code(), responseBody);
                if (response.code() == 429) {
                    throw new FoodRecognitionException("Rate limit exceeded");
                }
                throw new FoodRecognitionException("API error: " + response.code());
            }

            return parseResponse(responseBody);
        }
    }

    private String buildRequestBody(String base64Image, String mediaType) {
        // Smart Splitting prompt with intuitive units, atomic naming, and cooking coefficient
        String prompt = """
            You are an expert nutritionist. Analyze the food image.
            
            OBJECTIVE:
            Identify foods with high precision. Handle restaurant-style cooking (hidden calories) and ensure unit logic is human-readable.
            
            1. NAMING RULE (CRITICAL - Do NOT include quantity in name):
               - ❌ WRONG: {"name": "Oysters (x12)", "quantity": 1}
               - ✅ CORRECT: {"name": "Fresh Oyster", "quantity": 12}
               - The name should be a clean, singular noun. Put the count in "quantity"!
            
            2. GRANULARITY RULE:
               - COMBO/PLATTER with distinct items (Sushi Platter, Burger+Fries) -> LIST SEPARATELY.
               - MIXED dish (Fried Rice, Pizza, Salad Bowl) -> SINGLE ITEM.
            
            3. COOKING COEFFICIENT (The "Restaurant Factor"):
               - Analyze visual cues: Is the food shiny/oily? Deep-fried? Likely from a restaurant?
               - If YES -> Apply 1.1x to 1.3x to calories for hidden butter/oil.
               - Set "is_restaurant_style": true if detected.
            
            4. UNIT SELECTION:
               - Countable (Sushi, Dumplings, Wings, Oysters) -> unit: "piece". COUNT ACCURATELY!
               - Volume (Rice, Soup) -> unit: "bowl" or "cup".
               - Standard (Burger, Steak) -> unit: "serving".
            
            OUTPUT JSON FORMAT ONLY (no markdown):
            {"foods":[{"name":"Fresh Oyster","quantity":12,"unit":"piece","calories":96,"weight_g":180,"protein_g":12,"carbs_g":4,"fat_g":3,"is_restaurant_style":false},{"name":"Grilled Lobster","quantity":1,"unit":"serving","calories":450,"weight_g":300,"protein_g":40,"carbs_g":2,"fat_g":25,"is_restaurant_style":true,"cooking_note":"Butter glaze detected"}]}
            """;

        // Using Gemini 2.5 Flash - fast and efficient for food recognition
        return String.format("""
            {
              "contents": [{"parts": [
                {"inline_data": {"mime_type": "%s", "data": "%s"}},
                {"text": "%s"}
              ]}],
              "generationConfig": {
                "maxOutputTokens": %d,
                "temperature": 0.1
              }
            }
            """, mediaType, base64Image, escapeJson(prompt), MAX_OUTPUT_TOKENS);
    }

    private FoodRecognitionResult parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");

            if (!candidates.isArray() || candidates.isEmpty()) {
                log.error("Invalid Gemini response - no candidates. Full response: {}", responseBody);
                throw new FoodRecognitionException("Invalid Gemini response");
            }

            // Check finishReason for safety blocks or other issues
            JsonNode firstCandidate = candidates.get(0);
            String finishReason = firstCandidate.path("finishReason").asText("UNKNOWN");
            log.info("🤖 Gemini finishReason: {}", finishReason);
            
            if ("SAFETY".equals(finishReason)) {
                log.error("⚠️ Gemini blocked response due to SAFETY filter! " +
                        "The image may contain content the AI flagged as inappropriate.");
                throw new FoodRecognitionException("AI safety filter triggered - please try a different image");
            } else if ("RECITATION".equals(finishReason)) {
                log.warn("⚠️ Gemini blocked due to RECITATION (copyright concerns)");
            } else if (!"STOP".equals(finishReason) && !"UNKNOWN".equals(finishReason)) {
                log.warn("⚠️ Unexpected finishReason: {}", finishReason);
            }

            JsonNode parts = firstCandidate.path("content").path("parts");
            StringBuilder textBuilder = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("text")) {
                    textBuilder.append(part.get("text").asText());
                }
            }

            String rawText = textBuilder.toString().trim();
            log.info("📝 Gemini raw response text: {}", rawText);

            String json = extractJson(rawText);
            log.info("📝 Extracted JSON: {}", json);

            JsonNode data = objectMapper.readTree(json);

            List<RecognizedFood> items = new ArrayList<>();
            JsonNode foods = data.path("foods");
            log.info("📝 Foods node type: {}, isEmpty: {}", foods.getNodeType(), foods.isEmpty());
            
            for (JsonNode food : foods) {
                // Parse Smart Splitting format with intuitive units
                String name = food.path("name").asText("Unknown");
                int quantity = food.path("quantity").asInt(1);
                String unit = food.path("unit").asText("serving");
                int calories = food.path("calories").asInt(0);
                int weightG = food.path("weight_g").asInt(
                        food.path("grams").asInt(100)); // Fallback for legacy format
                int protein = food.path("protein_g").asInt(
                        food.path("protein").asInt(0));
                int carbs = food.path("carbs_g").asInt(
                        food.path("carbs").asInt(0));
                int fat = food.path("fat_g").asInt(
                        food.path("fat").asInt(0));
                boolean isRestaurantStyle = food.path("is_restaurant_style").asBoolean(false);
                String cookingNote = food.path("cooking_note").asText(null);
                String cookingMethod = food.path("cooking_method").asText(null);

                NutritionInfo nutrition = NutritionInfo.builder()
                        .calories(BigDecimal.valueOf(calories))
                        .protein(BigDecimal.valueOf(protein))
                        .carbs(BigDecimal.valueOf(carbs))
                        .fat(BigDecimal.valueOf(fat))
                        .build();

                // Keep displayName clean - no quantity suffix!
                // Frontend will show "12 pieces" separately in the UI
                String displayName = name;

                RecognizedFood item = RecognizedFood.builder()
                        .foodKey(name.toLowerCase().replace(" ", "_"))
                        .displayName(displayName)
                        .estimatedGrams(weightG)
                        .unit(unit)
                        .quantity(quantity)  // Pass quantity to frontend!
                        .cookingMethod(cookingMethod)
                        .confidence(0.9)
                        .nutrition(nutrition)
                        .build();
                
                items.add(item);
                log.info("✅ Found: {} (qty={}, unit={}, {}g, {}kcal, restaurant={})", 
                        name, quantity, unit, weightG, calories, isRestaurantStyle);
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

    /**
     * Convert first N bytes to hex string for debugging image format.
     * Common magic numbers:
     * - JPEG: FF D8 FF
     * - PNG: 89 50 4E 47
     * - HEIC/HEIF: 00 00 00 xx 66 74 79 70 (ftyp at offset 4)
     * - WebP: 52 49 46 46 (RIFF)
     */
    private String bytesToHex(byte[] bytes, int maxBytes) {
        StringBuilder sb = new StringBuilder();
        int len = Math.min(bytes.length, maxBytes);
        for (int i = 0; i < len; i++) {
            sb.append(String.format("%02X ", bytes[i] & 0xFF));
        }
        return sb.toString().trim();
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }
}
