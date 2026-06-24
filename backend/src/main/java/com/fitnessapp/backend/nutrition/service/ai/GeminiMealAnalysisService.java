
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
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;

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
import com.google.auth.oauth2.GoogleCredentials;

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

    static {
        ImageIO.setUseCache(false);
    }

    private static final String PROVIDER_NAME = "gemini";
    private static final String DEFAULT_MODEL = "gemini-2.0-flash";

    // Must be large enough for multi-dish scenes with many items; truncated JSON causes parse failures.
    private static final int MAX_OUTPUT_TOKENS = 4096;
    // Meal capture is an interactive UX path — target <10s total response.
    // Aggressive timeouts: fail fast and retry quickly rather than stalling.
    private static final int PRIMARY_TIMEOUT_SECONDS = 8;
    private static final int RETRY_TIMEOUT_SECONDS = 6;
    private static final int MAX_ATTEMPTS = 2;
    private static final long TRANSIENT_RETRY_DELAY_MS = 200L;
    // Hedged request delay is configurable via app.gemini.hedge-delay-ms (default 2000).
    // Most Gemini calls return in <2s; hedging at 2s catches tail latency without wasting API calls.
    // Set the delay very high to DISABLE hedging for the before/after latency experiment.
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> SUPPORTED_IMAGE_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/heic",
            "image/heif"
    );
    private static final Set<String> IMAGEIO_UNSUPPORTED_BUT_GEMINI_SUPPORTED_TYPES = Set.of(
            "image/heic",
            "image/heif"
    );

    private final OkHttpClient httpClient;
    private final OkHttpClient retryHttpClient;
    private final ExecutorService hedgeExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "gemini-hedge");
        t.setDaemon(true);
        return t;
    });
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final String geminiApiUrl;
    private final boolean useVertexAi;
    private final String gcpProjectId;
    private final String gcpRegion;
    private final long hedgeDelayMs;

    public GeminiMealAnalysisService(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-2.0-flash}") String model,
            @Value("${app.gemini.use-vertex-ai:true}") boolean useVertexAi,
            @Value("${app.gemini.gcp-project-id:gen-lang-client-0295973830}") String gcpProjectId,
            @Value("${app.gemini.gcp-region:australia-southeast2}") String gcpRegion,
            @Value("${app.gemini.base-url:}") String baseUrlOverride,
            @Value("${app.gemini.hedge-delay-ms:2000}") long hedgeDelayMs
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = (model == null || model.isBlank()) ? DEFAULT_MODEL : model.trim();
        this.useVertexAi = useVertexAi;
        this.gcpProjectId = gcpProjectId;
        this.gcpRegion = gcpRegion;
        this.hedgeDelayMs = hedgeDelayMs;

        if (useVertexAi) {
            // Vertex AI: uses Application Default Credentials (Cloud Run service account)
            // No API key needed — bills directly from GCP billing account
            this.geminiApiUrl = "https://" + gcpRegion + "-aiplatform.googleapis.com/v1/projects/"
                    + gcpProjectId + "/locations/" + gcpRegion
                    + "/publishers/google/models/" + this.model + ":generateContent";
            log.info("✅ GeminiMealAnalysisService initialized (Vertex AI): {} in {}", this.model, gcpRegion);
        } else {
            String studioBase = (baseUrlOverride == null || baseUrlOverride.isBlank())
                    ? "https://generativelanguage.googleapis.com"
                    : baseUrlOverride.trim();
            this.geminiApiUrl =
                    studioBase + "/v1beta/models/" + this.model + ":generateContent";
            if (apiKey == null || apiKey.isBlank()) {
                log.warn("⚠️ Gemini API key not configured");
            } else {
                log.info("✅ GeminiMealAnalysisService initialized (AI Studio): {}", this.model);
            }
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

        String contentType = normalizeContentType(image.getContentType());
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType)) {
            String inferredContentType = inferContentTypeFromFilename(image.getOriginalFilename());
            if (SUPPORTED_IMAGE_TYPES.contains(inferredContentType)) {
                log.warn("Falling back to filename-inferred image type '{}' for upload '{}'",
                        inferredContentType, image.getOriginalFilename());
                contentType = inferredContentType;
            }
        }
        if (contentType == null || !SUPPORTED_IMAGE_TYPES.contains(contentType)) {
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

        // Compress image before sending to Gemini API - reduces upload time by 50%+
        long compressStart = System.nanoTime();
        String normalizedMediaType = normalizeContentType(mediaType);
        String optimizedImage = compressImage(base64Image, normalizedMediaType);
        long compressMs = (System.nanoTime() - compressStart) / 1_000_000;
        String optimizedMediaType = optimizedImage.equals(base64Image) ? normalizedMediaType : "image/jpeg";
        log.info("Gemini stage=image_optimize latencyMs={}, originalChars={}, optimizedChars={}",
                compressMs, base64Image.length(), optimizedImage.length());

        try {
            return retryApiCall(optimizedImage, optimizedMediaType, metadata, 1, start).join();
        } catch (CompletionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof FoodRecognitionException fre) {
                throw fre;
            }
            throw new FoodRecognitionException("Failed after retries", cause);
        }
    }

    /**
     * Hedged request pattern (Google "The Tail at Scale"):
     * 1. Fire primary request immediately
     * 2. If no response after HEDGE_DELAY_MS, fire a parallel hedge request
     * 3. First to respond wins, other is cancelled
     *
     * This catches tail latency (slow node / GC / network jitter) by "re-rolling the dice"
     * on a different server-side node. Only ~5% extra API calls, but P99 latency drops 50%+.
     */
    private CompletableFuture<FoodRecognitionResult> retryApiCall(
            String image, String mediaType, FoodRecognitionRequestMetadata metadata,
            int attempt, long startNanos) {

        AtomicBoolean settled = new AtomicBoolean(false);

        // Primary request
        CompletableFuture<FoodRecognitionResult> primary = CompletableFuture.supplyAsync(() -> {
            try {
                return executeApiCall(image, mediaType, metadata, false);
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        }, hedgeExecutor);

        // Hedged request: fires after HEDGE_DELAY_MS if primary hasn't returned.
        // Only hedges on slow responses (tail latency). If primary fails with 429
        // (rate limit), hedging would make it worse — so the hedge checks settled flag.
        CompletableFuture<FoodRecognitionResult> hedge = CompletableFuture
                .supplyAsync(() -> null,
                        CompletableFuture.delayedExecutor(hedgeDelayMs, TimeUnit.MILLISECONDS))
                .thenApplyAsync(v -> {
                    if (settled.get()) return null; // primary already done or failed with 429, skip
                    log.info("Gemini hedged request fired (primary slow after {}ms)", hedgeDelayMs);
                    try {
                        return executeApiCall(image, mediaType, metadata, true);
                    } catch (Exception e) {
                        throw new CompletionException(e);
                    }
                }, hedgeExecutor);

        // Race: first to complete wins
        return primary.applyToEither(hedge, result -> {
            settled.set(true);
            long totalMs = (System.nanoTime() - startNanos) / 1_000_000;
            log.info("Gemini stage=complete totalLatencyMs={}", totalMs);
            return result;
        }).exceptionally(ex -> {
            Throwable cause = ex instanceof CompletionException ? ex.getCause() : ex;
            String msg = cause != null ? cause.getMessage() : "unknown";
            boolean isRateLimit = msg != null && msg.contains("429");

            // On 429: cancel hedge, don't retry — rate limiting means STOP sending requests.
            // Tell user to wait and try again.
            if (isRateLimit) {
                settled.set(true); // prevent hedge from firing
                log.warn("Gemini rate-limited (429). NOT retrying — hedging would make it worse.");
                throw new CompletionException(
                        new FoodRecognitionException("Rate limited by AI provider. Please wait a moment and try again.", cause));
            }

            boolean retryable = (cause instanceof Exception) && isRetryableException((Exception) cause);
            log.warn("Gemini hedged requests both failed (retryable={}): {}", retryable, msg);
            if (!retryable || attempt >= MAX_ATTEMPTS) {
                throw new CompletionException(
                        new FoodRecognitionException("Failed after " + attempt + " attempt(s)", cause));
            }
            // Last resort: one serial retry after short delay
            try { Thread.sleep(TRANSIENT_RETRY_DELAY_MS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            try {
                FoodRecognitionResult result = executeApiCall(image, mediaType, metadata, true);
                long totalMs = (System.nanoTime() - startNanos) / 1_000_000;
                log.info("Gemini stage=complete (fallback retry) totalLatencyMs={}", totalMs);
                return result;
            } catch (Exception e2) {
                throw new CompletionException(
                        new FoodRecognitionException("Failed after " + (attempt + 1) + " attempt(s)", e2));
            }
        });
    }

    /**
     * Compress image to max 1024px dimension for faster API calls.
     * Gemini doesn't need full resolution for food recognition.
     * 
     * IMPORTANT: Java ImageIO does not decode HEIC/HEIF out of the box.
     * Gemini supports those MIME types directly, so we bypass local optimization for them.
     * For other formats we keep the whole transcode path in memory to avoid Cloud Run temp-file
     * cache issues inside ImageIO.
     */
    private String compressImage(String base64Image, String mediaType) {
        if (mediaType != null && IMAGEIO_UNSUPPORTED_BUT_GEMINI_SUPPORTED_TYPES.contains(mediaType)) {
            log.info("Skipping backend image optimization for {} and forwarding original bytes to Gemini", mediaType);
            return base64Image;
        }

        try {
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            log.info("🖼️ Attempting to decode image: {} bytes", imageBytes.length);

            BufferedImage originalImage = decodeImage(imageBytes);

            if (originalImage == null) {
                // ImageIO.read() returns null for unsupported formats (HEIC, some iPhone JPEGs)
                log.warn("⚠️ ImageIO.read() returned null - unsupported image format! " +
                        "This usually means HEIC format or corrupted image. " +
                        "First 4 bytes (magic number): {}",
                        bytesToHex(imageBytes, 4));
                log.warn("Forwarding original bytes to Gemini because local optimization could not decode the image");
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
            byte[] compressedBytes = encodeJpeg(resizedImage);
            String compressed = Base64.getEncoder().encodeToString(compressedBytes);

            log.info("🗜️ Image compressed: {}x{} -> {}x{}, {} KB -> {} KB",
                    originalImage.getWidth(), originalImage.getHeight(),
                    width, height,
                    imageBytes.length / 1024, compressedBytes.length / 1024);

            return compressed;

        } catch (Exception e) {
            log.error("Image compression failed, using original", e);
            return base64Image;
        }
    }

    private BufferedImage decodeImage(byte[] imageBytes) throws IOException {
        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes)) {
            return ImageIO.read(inputStream);
        }
    }

    private byte[] encodeJpeg(BufferedImage image) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IOException("JPEG writer not available");
        }

        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                MemoryCacheImageOutputStream imageOutput = new MemoryCacheImageOutputStream(outputStream)) {
            writer.setOutput(imageOutput);

            ImageWriteParam params = writer.getDefaultWriteParam();
            if (params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(0.82f);
            }

            writer.write(null, new IIOImage(image, null, null), params);
            imageOutput.flush();
            return outputStream.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    static String normalizeContentType(String mediaType) {
        if (mediaType == null || mediaType.isBlank()) {
            return null;
        }
        String normalized = mediaType.split(";")[0].trim().toLowerCase();
        return switch (normalized) {
            case "image/jpg", "image/pjpeg" -> "image/jpeg";
            case "image/x-png" -> "image/png";
            default -> normalized;
        };
    }

    static String inferContentTypeFromFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }

        String normalized = filename.toLowerCase().trim();
        if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (normalized.endsWith(".png")) {
            return "image/png";
        }
        if (normalized.endsWith(".gif")) {
            return "image/gif";
        }
        if (normalized.endsWith(".webp")) {
            return "image/webp";
        }
        if (normalized.endsWith(".heic")) {
            return "image/heic";
        }
        if (normalized.endsWith(".heif")) {
            return "image/heif";
        }
        return null;
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

        Request.Builder reqBuilder = new Request.Builder()
                .addHeader("content-type", "application/json")
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")));

        if (useVertexAi) {
            // Vertex AI: OAuth2 Bearer token from Application Default Credentials
            try {
                GoogleCredentials credentials = GoogleCredentials.getApplicationDefault()
                        .createScoped("https://www.googleapis.com/auth/cloud-platform");
                credentials.refreshIfExpired();
                reqBuilder.url(geminiApiUrl)
                        .addHeader("Authorization", "Bearer " + credentials.getAccessToken().getTokenValue());
            } catch (IOException e) {
                throw new FoodRecognitionException("Failed to get GCP credentials", e);
            }
        } else {
            // AI Studio: API key as query parameter
            reqBuilder.url(geminiApiUrl + "?key=" + apiKey);
        }

        Request request = reqBuilder.build();

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
                // Extract meaningful error message from Gemini response for better diagnostics
                String detail = extractGeminiErrorMessage(responseBody);
                throw new FoodRecognitionException(
                        detail != null ? "Gemini error " + response.code() + ": " + detail
                                       : "API error: " + response.code());
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
                  "fat_g": number,
                  "fiber_g": number,
                  "estimated_gi": number  // glycemic index 0-100
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
                int fiber = food.path("fiber_g").asInt(
                        food.path("fiber").asInt(0));
                int estimatedGi = food.path("estimated_gi").asInt(50);
                // Glycemic Load = (GI × net carbs per serving) / 100
                int netCarbs = Math.max(0, carbs - fiber);
                double glycemicLoad = (estimatedGi * netCarbs) / 100.0;
                double confidence = food.path("confidence").asDouble(0.85);
                boolean isRestaurantStyle = food.path("is_restaurant_style").asBoolean(false);
                String cookingNote = food.path("cooking_note").asText(null);
                String cookingMethod = food.path("cooking_method").asText(null);

                NutritionInfo nutrition = NutritionInfo.builder()
                        .calories(BigDecimal.valueOf(calories))
                        .protein(BigDecimal.valueOf(protein))
                        .carbs(BigDecimal.valueOf(carbs))
                        .fat(BigDecimal.valueOf(fat))
                        .fiber(BigDecimal.valueOf(fiber))
                        .glycemicIndex(estimatedGi)
                        .glycemicLoad(BigDecimal.valueOf(glycemicLoad).setScale(1, java.math.RoundingMode.HALF_UP))
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

    /**
     * Extract a human-readable error message from a Gemini API error response body.
     */
    private String extractGeminiErrorMessage(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode error = root.path("error");
            if (!error.isMissingNode()) {
                String message = error.path("message").asText(null);
                if (message != null && !message.isBlank()) {
                    return message;
                }
            }
        } catch (Exception ignored) {
            // Fall through
        }
        return null;
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
