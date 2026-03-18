
package com.fitnessapp.backend.nutrition.service.ai;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.math.BigDecimal;
import java.net.ConnectException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
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
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;
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
    private static final String DEFAULT_MODEL = "gemini-2.5-flash";
    
    // Must be large enough for multi-dish scenes with many items; truncated JSON causes parse failures.
    private static final int MAX_OUTPUT_TOKENS = 4096;
    // Meal capture is an interactive UX path. Allow one fast retry for transient transport errors,
    // but avoid broad multi-retry stalls for deterministic failures.
    private static final int PRIMARY_TIMEOUT_SECONDS = 18;
    private static final int RETRY_TIMEOUT_SECONDS = 8;
    private static final int MAX_ATTEMPTS = 2;
    private static final long TRANSIENT_RETRY_DELAY_MS = 350L;
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private final OkHttpClient httpClient;
    private final OkHttpClient retryHttpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final String geminiApiUrl;

    public GeminiMealAnalysisService(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-2.5-flash}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = (model == null || model.isBlank()) ? DEFAULT_MODEL : model.trim();
        this.geminiApiUrl =
                "https://generativelanguage.googleapis.com/v1beta/models/" + this.model + ":generateContent";

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ Gemini API key not configured");
        } else {
            log.info("✅ GeminiMealAnalysisService initialized: {}", this.model);
        }

        this.httpClient = buildHttpClient(PRIMARY_TIMEOUT_SECONDS);
        this.retryHttpClient = buildHttpClient(RETRY_TIMEOUT_SECONDS);
    }

    // ==================== FoodRecognitionProvider Interface ====================

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public String getModelName() {
        return model;
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
    public FoodRecognitionResult recognizeFoods(MultipartFile image, FoodRecognitionRequestMetadata metadata) throws IOException {
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

        long start = System.nanoTime();
        log.info("Gemini analyze start: imageBytes={}, contentType={}", image.getSize(), contentType);

        String base64Image = Base64.getEncoder().encodeToString(image.getBytes());
        long encodeMs = (System.nanoTime() - start) / 1_000_000;
        log.info("Gemini stage=base64_encode latencyMs={}, base64Chars={}", encodeMs, base64Image.length());

        FoodRecognitionResult result = recognizeFoods(base64Image, contentType, metadata);
        long totalMs = (System.nanoTime() - start) / 1_000_000;
        log.info("Gemini analyze completed totalLatencyMs={}", totalMs);
        return result;
    }

    @Override
    public FoodRecognitionResult recognizeFoods(String base64Image, String mediaType, FoodRecognitionRequestMetadata metadata) {
        long start = System.nanoTime();
        int attempt = 0;
        Exception lastException = null;

        // Compress image before sending to Gemini API - reduces upload time by 50%+
        long compressStart = System.nanoTime();
        String optimizedImage = compressImage(base64Image);
        long compressMs = (System.nanoTime() - compressStart) / 1_000_000;
        String optimizedMediaType = optimizedImage.equals(base64Image) ? mediaType : "image/jpeg";
        log.info("Gemini stage=image_optimize latencyMs={}, originalChars={}, optimizedChars={}",
                compressMs, base64Image.length(), optimizedImage.length());

        while (attempt < MAX_ATTEMPTS) {
            attempt++;
            try {
                FoodRecognitionResult result = executeApiCall(
                        optimizedImage,
                        optimizedMediaType,
                        metadata,
                        attempt > 1
                );
                long totalMs = (System.nanoTime() - start) / 1_000_000;
                log.info("Gemini stage=complete attempts={}, totalLatencyMs={}", attempt, totalMs);
                return result;
            } catch (Exception e) {
                lastException = e;
                boolean retryable = isRetryableException(e);
                log.warn("Gemini API failed (attempt {}/{}, retryable={}): {}",
                        attempt, MAX_ATTEMPTS, retryable, e.getMessage());
                if (!retryable || attempt >= MAX_ATTEMPTS) {
                    break;
                }
                try {
                    Thread.sleep(TRANSIENT_RETRY_DELAY_MS * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        throw new FoodRecognitionException("Failed after " + attempt + " attempt(s)", lastException);
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

    private FoodRecognitionResult executeApiCall(
            String base64Image,
            String mediaType,
            FoodRecognitionRequestMetadata metadata,
            boolean retryAttempt
    ) throws IOException {
        long start = System.nanoTime();
        String requestBody = buildRequestBody(base64Image, mediaType, metadata);
        OkHttpClient client = retryAttempt ? retryHttpClient : httpClient;

        Request request = new Request.Builder()
                .url(geminiApiUrl + "?key=" + apiKey)
                .addHeader("content-type", "application/json")
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            long latencyMs = (System.nanoTime() - start) / 1_000_000;
            log.info("Gemini stage=api_call status={}, latencyMs={}, responseChars={}",
                    response.code(), latencyMs, responseBody.length());
            if (log.isDebugEnabled()) {
                String preview = responseBody.length() > 400 ? responseBody.substring(0, 400) + "..." : responseBody;
                log.debug("Gemini response preview: {}", preview);
            }

            if (!response.isSuccessful()) {
                log.error("Gemini API error ({}): {}", response.code(), responseBody);
                if (response.code() == 408 || response.code() == 429 || response.code() >= 500) {
                    throw new RetryableGeminiException("Transient Gemini API error: " + response.code());
                }
                throw new FoodRecognitionException("API error: " + response.code());
            }

            long parseStart = System.nanoTime();
            FoodRecognitionResult parsed = parseResponse(responseBody);
            long parseMs = (System.nanoTime() - parseStart) / 1_000_000;
            log.info("Gemini stage=parse latencyMs={}, items={}",
                    parseMs, parsed.getItems() != null ? parsed.getItems().size() : 0);
            return parsed;
        }
    }

    private String buildRequestBody(String base64Image, String mediaType, FoodRecognitionRequestMetadata metadata) {
        Double imgWcm = metadata != null ? metadata.resolveImageWidthCm() : null;
        String metadataBlock = imgWcm != null
                ? String.format("{\"img_w_cm\": %.1f}", imgWcm)
                : "{}";

        // Compact prompt for lower latency while preserving deterministic schema output.
        // Keys must be English; values can match user language.
        String prompt = String.format("""
            You are a food-vision nutrition estimator.
            Return STRICT JSON only (no markdown, no prose) using the schema below.
            Metadata: %s

            Rules:
            - Use img_w_cm for scale when present; otherwise assume 28cm plate width.
            - scene_type:
              countable = mostly piece-count items (e.g. sushi/dumplings/wings)
              single_dish = one mixed dish, split into ingredients
              multi_dish = multiple distinct dishes, do not split each dish into ingredients
            - Do not include quantity text in name.
            - confidence in [0.0, 1.0].
            - unit: piece for countable, g for ingredient-level outputs, otherwise serving.
            - Nutrition should reflect visible oils/sauces (restaurant/oily food included).

            Schema:
            {
              "scene_type": "countable" | "single_dish" | "multi_dish",
              "foods": [
                {
                  "name": string,
                  "confidence": number,
                  "quantity": number,
                  "unit": "piece" | "serving" | "g" | "bowl" | "cup" | "slice",
                  "weight_g": number,
                  "calories": number,
                  "protein_g": number,
                  "carbs_g": number,
                  "fat_g": number
                }
              ]
            }

            Analyze now.
            """, metadataBlock);

        // Flash model with deterministic generation for stable JSON.
        return String.format("""
            {
              "contents": [{"parts": [
                {"inline_data": {"mime_type": "%s", "data": "%s"}},
                {"text": "%s"}
              ]}],
              "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": %d,
                "temperature": 0.0,
                "topP": 0.95,
                "topK": 40
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
            if (log.isDebugEnabled()) {
                String rawPreview = rawText.length() > 400 ? rawText.substring(0, 400) + "..." : rawText;
                log.debug("Gemini raw text preview: {}", rawPreview);
            }

            String json = extractJson(rawText);
            if (log.isDebugEnabled()) {
                String jsonPreview = json.length() > 400 ? json.substring(0, 400) + "..." : json;
                log.debug("Gemini extracted JSON preview: {}", jsonPreview);
            }

            JsonNode data = objectMapper.readTree(json);

            List<RecognizedFood> items = new ArrayList<>();
            String sceneType = data.path("scene_type").isTextual() ? data.path("scene_type").asText() : null;
            JsonNode foods = data.path("foods");
            log.debug("Foods node type={}, isEmpty={}", foods.getNodeType(), foods.isEmpty());
            
            int index = 0;
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
                double confidence = food.path("confidence").asDouble(0.85);
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
                        .foodKey(toFoodKey(name, index))
                        .displayName(displayName)
                        .estimatedGrams(weightG)
                        .unit(unit)
                        .quantity(quantity)  // Pass quantity to frontend!
                        .cookingMethod(cookingMethod)
                        .confidence(confidence)
                        .nutrition(nutrition)
                        .build();
                
                items.add(item);
                log.debug("Found: {} (qty={}, unit={}, {}g, {}kcal, restaurant={})", 
                        name, quantity, unit, weightG, calories, isRestaurantStyle);
                index++;
            }

            return FoodRecognitionResult.builder()
                    .items(items)
                    .sceneType(sceneType)
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

    private String toFoodKey(String name, int index) {
        String base = name == null ? "food" : name.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (base.isBlank()) {
            base = "food";
        }
        return base + "_" + index;
    }

    private boolean isRetryableException(Exception exception) {
        Throwable current = exception;
        while (current != null) {
            if (current instanceof RetryableGeminiException
                    || current instanceof SocketTimeoutException
                    || current instanceof ConnectException
                    || current instanceof SocketException
                    || current instanceof UnknownHostException
                    || current instanceof InterruptedIOException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static final class RetryableGeminiException extends IOException {
        private RetryableGeminiException(String message) {
            super(message);
        }
    }

    private OkHttpClient buildHttpClient(int timeoutSeconds) {
        return new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .readTimeout(Duration.ofSeconds(timeoutSeconds))
                .writeTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
    }
}
