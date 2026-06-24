package com.fitnessapp.backend.common.ai;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ConnectException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiFunctionCall;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiFunctionDeclaration;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiRequest;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiResponse;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiTurn;
import com.google.auth.oauth2.GoogleCredentials;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Single hardened entry point for every Gemini call in the app (vision, goals, the Coach agent).
 *
 * <p>Consolidates what used to be duplicated, hand-rolled OkHttp plumbing into one component that
 * provides:</p>
 * <ul>
 *   <li><b>Request hedging</b> ("Tail at Scale"): a parallel request fires after {@code hedge-delay-ms}
 *       if the primary is slow, cutting P99 at ~5% extra calls. Deliberately disabled on HTTP 429.</li>
 *   <li><b>Resilience4j circuit breaker</b> ("geminiClient") so repeated upstream failures fail fast
 *       instead of piling up threads.</li>
 *   <li><b>Micrometer metrics</b>: token in/out counters, an estimated USD cost counter, a hedge-fired
 *       counter, and a per-call-site latency timer — all scrape-able at /actuator/prometheus.</li>
 *   <li><b>Function (tool) calling and SSE streaming</b>, which the Coach agent needs.</li>
 *   <li><b>Safe JSON assembly</b> via Jackson (no more String.format injection of base64/prompt).</li>
 * </ul>
 */
@Slf4j
@Component
public class GeminiClient {

    private static final String DEFAULT_MODEL = "gemini-2.0-flash";
    private static final String CIRCUIT_BREAKER_NAME = "geminiClient";
    // Rough Gemini 2.0 Flash pricing (USD per 1M tokens) — used only for the cost metric.
    private static final double INPUT_USD_PER_MTOK = 0.10;
    private static final double OUTPUT_USD_PER_MTOK = 0.40;

    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final CircuitBreaker circuitBreaker;

    private final OkHttpClient primaryClient;
    private final OkHttpClient retryClient;
    private final OkHttpClient streamingClient;

    private final ExecutorService hedgeExecutor;

    private final String apiKey;
    private final String model;
    private final boolean useVertexAi;
    private final String gcpProjectId;
    private final String gcpRegion;
    private final String studioBase;
    private final long hedgeDelayMs;

    public GeminiClient(
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            ObjectProvider<CircuitBreakerRegistry> circuitBreakerRegistry,
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-2.0-flash}") String model,
            @Value("${app.gemini.use-vertex-ai:true}") boolean useVertexAi,
            @Value("${app.gemini.gcp-project-id:gen-lang-client-0295973830}") String gcpProjectId,
            @Value("${app.gemini.gcp-region:australia-southeast2}") String gcpRegion,
            @Value("${app.gemini.base-url:}") String baseUrlOverride,
            @Value("${app.gemini.hedge-delay-ms:2000}") long hedgeDelayMs,
            @Value("${app.gemini.primary-timeout-seconds:20}") int primaryTimeoutSeconds,
            @Value("${app.gemini.retry-timeout-seconds:15}") int retryTimeoutSeconds
    ) {
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.apiKey = apiKey;
        this.model = (model == null || model.isBlank()) ? DEFAULT_MODEL : model.trim();
        this.useVertexAi = useVertexAi;
        this.gcpProjectId = gcpProjectId;
        this.gcpRegion = gcpRegion;
        this.studioBase = (baseUrlOverride == null || baseUrlOverride.isBlank())
                ? "https://generativelanguage.googleapis.com"
                : baseUrlOverride.trim();
        this.hedgeDelayMs = hedgeDelayMs;

        this.primaryClient = buildClient(primaryTimeoutSeconds, primaryTimeoutSeconds);
        this.retryClient = buildClient(retryTimeoutSeconds, retryTimeoutSeconds);
        // Streaming responses are long-lived: keep connect tight but read generous.
        this.streamingClient = buildClient(10, 120);

        AtomicInteger threadIdx = new AtomicInteger();
        // Bounded hedge pool (the old code used an unbounded cached pool — a scaling risk under load).
        this.hedgeExecutor = new ThreadPoolExecutor(
                4, 16, 60L, TimeUnit.SECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(256),
                r -> {
                    Thread t = new Thread(r, "gemini-hedge-" + threadIdx.incrementAndGet());
                    t.setDaemon(true);
                    return t;
                },
                new ThreadPoolExecutor.CallerRunsPolicy());

        // Rate limits are backpressure, not faults — do not let a 429 trip the breaker.
        CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
                .ignoreExceptions(GeminiRateLimitException.class)
                .build();
        CircuitBreakerRegistry registry = circuitBreakerRegistry.getIfAvailable();
        this.circuitBreaker = registry != null
                ? registry.circuitBreaker(CIRCUIT_BREAKER_NAME, cbConfig)
                : CircuitBreaker.of(CIRCUIT_BREAKER_NAME, cbConfig);

        log.info("GeminiClient initialized: model={}, transport={}, hedgeDelayMs={}",
                this.model, useVertexAi ? "vertex" : "studio", hedgeDelayMs);
    }

    public boolean isConfigured() {
        return useVertexAi || (apiKey != null && !apiKey.isBlank());
    }

    public String getModel() {
        return model;
    }

    // ==================== Public API ====================

    /**
     * Generate content (text and/or function calls), with hedging + circuit breaker + metrics.
     */
    public GeminiResponse generate(GeminiRequest request) {
        long start = System.nanoTime();
        AtomicBoolean hedgeFired = new AtomicBoolean(false);
        String outcome = "success";
        try {
            String body = buildRequestJson(request);
            String response = circuitBreaker.executeSupplier(() ->
                    request.isHedge()
                            ? callHedged(body, hedgeFired)
                            : callOnce(body, false));
            GeminiResponse parsed = parseResponse(response, request.getCallSite());
            recordMetrics(request.getCallSite(), parsed, start, hedgeFired.get(), outcome);
            return parsed;
        } catch (CallNotPermittedException e) {
            outcome = "circuit_open";
            recordOutcome(request.getCallSite(), outcome, start, hedgeFired.get());
            throw new GeminiException("Gemini temporarily unavailable (circuit open)", e);
        } catch (GeminiException e) {
            outcome = (e instanceof GeminiRateLimitException) ? "rate_limited" : "error";
            recordOutcome(request.getCallSite(), outcome, start, hedgeFired.get());
            throw e;
        } catch (Exception e) {
            outcome = "error";
            recordOutcome(request.getCallSite(), outcome, start, hedgeFired.get());
            throw new GeminiException("Gemini call failed", e);
        }
    }

    /**
     * Stream a generation token-by-token (Server-Sent Events from Gemini). Each text delta is passed
     * to {@code onToken}. Returns the full concatenated text. Streaming calls are NOT hedged.
     */
    public String generateStream(GeminiRequest request, Consumer<String> onToken) {
        long start = System.nanoTime();
        StringBuilder full = new StringBuilder();
        try {
            String body = buildRequestJson(request);
            String url = endpointUrl("streamGenerateContent", true);
            Request httpRequest = newRequestBuilder(url).post(jsonBody(body)).build();

            circuitBreaker.executeRunnable(() -> {
                try (Response response = streamingClient.newCall(httpRequest).execute()) {
                    if (!response.isSuccessful()) {
                        String err = response.body() != null ? response.body().string() : "";
                        throw new GeminiException("Gemini stream error " + response.code() + ": " + truncate(err));
                    }
                    if (response.body() == null) {
                        throw new GeminiException("Gemini stream returned empty body");
                    }
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(response.body().byteStream(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (!line.startsWith("data:")) {
                                continue;
                            }
                            String json = line.substring("data:".length()).trim();
                            if (json.isEmpty() || "[DONE]".equals(json)) {
                                continue;
                            }
                            String delta = extractStreamDelta(json);
                            if (delta != null && !delta.isEmpty()) {
                                full.append(delta);
                                onToken.accept(delta);
                            }
                        }
                    }
                } catch (IOException e) {
                    throw new GeminiException("Gemini stream I/O failure", e);
                }
            });

            meterRegistry.counter("aura.gemini.requests",
                    "call_site", request.getCallSite(), "mode", "stream", "outcome", "success").increment();
            return full.toString();
        } catch (CallNotPermittedException e) {
            throw new GeminiException("Gemini temporarily unavailable (circuit open)", e);
        } finally {
            requestLatencyTimer(request.getCallSite(), "stream").record(System.nanoTime() - start, TimeUnit.NANOSECONDS);
        }
    }

    // ==================== HTTP / hedging ====================

    private String callHedged(String body, AtomicBoolean hedgeFired) {
        CompletableFuture<String> result = new CompletableFuture<>();
        AtomicInteger failures = new AtomicInteger(0);

        // Primary fires immediately.
        hedgeExecutor.execute(() -> attempt(body, false, result, failures));

        // Hedge fires after the delay, but only if the primary hasn't already settled the result.
        CompletableFuture.delayedExecutor(hedgeDelayMs, TimeUnit.MILLISECONDS, hedgeExecutor).execute(() -> {
            if (result.isDone()) {
                return; // primary already won (success) or was rate-limited — don't waste a call
            }
            hedgeFired.set(true);
            log.info("Gemini hedged request fired (primary slow after {}ms)", hedgeDelayMs);
            attempt(body, true, result, failures);
        });

        try {
            return result.join();
        } catch (CompletionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof GeminiException ge) {
                throw ge;
            }
            throw new GeminiException("Gemini call failed", cause);
        }
    }

    /**
     * One hedged attempt. The first SUCCESS completes the shared result; the overall call only fails
     * once BOTH attempts have failed. A 429 short-circuits immediately so the hedge doesn't pile on.
     */
    private void attempt(String body, boolean isRetry, CompletableFuture<String> result, AtomicInteger failures) {
        try {
            result.complete(callOnce(body, isRetry)); // first success wins; later completes are no-ops
        } catch (GeminiRateLimitException e) {
            result.completeExceptionally(e);
        } catch (Throwable e) {
            if (failures.incrementAndGet() >= 2) {
                result.completeExceptionally(e);
            }
        }
    }

    private String callOnce(String body, boolean isRetry) {
        OkHttpClient client = isRetry ? retryClient : primaryClient;
        String url = endpointUrl("generateContent", false);
        Request request = newRequestBuilder(url).post(jsonBody(body)).build();
        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                if (response.code() == 429) {
                    throw new GeminiRateLimitException("Gemini error 429 (rate limited)");
                }
                if (response.code() == 408 || response.code() >= 500) {
                    throw new GeminiException("Gemini transient error " + response.code());
                }
                throw new GeminiException("Gemini error " + response.code() + ": " + truncate(responseBody));
            }
            return responseBody;
        } catch (IOException e) {
            if (isRetryable(e)) {
                throw new GeminiException("Gemini transient I/O error: " + e.getMessage(), e);
            }
            throw new GeminiException("Gemini I/O error: " + e.getMessage(), e);
        }
    }

    private Request.Builder newRequestBuilder(String url) {
        Request.Builder builder = new Request.Builder().addHeader("content-type", "application/json");
        if (useVertexAi) {
            try {
                GoogleCredentials credentials = GoogleCredentials.getApplicationDefault()
                        .createScoped("https://www.googleapis.com/auth/cloud-platform");
                credentials.refreshIfExpired();
                builder.url(url).addHeader("Authorization",
                        "Bearer " + credentials.getAccessToken().getTokenValue());
            } catch (IOException e) {
                throw new GeminiException("Failed to obtain GCP credentials", e);
            }
        } else {
            String sep = url.contains("?") ? "&" : "?";
            builder.url(url + sep + "key=" + apiKey);
        }
        return builder;
    }

    private String endpointUrl(String method, boolean sse) {
        String url;
        if (useVertexAi) {
            url = "https://" + gcpRegion + "-aiplatform.googleapis.com/v1/projects/" + gcpProjectId
                    + "/locations/" + gcpRegion + "/publishers/google/models/" + model + ":" + method;
        } else {
            url = studioBase + "/v1beta/models/" + model + ":" + method;
        }
        if (sse) {
            url = url + (url.contains("?") ? "&" : "?") + "alt=sse";
        }
        return url;
    }

    // ==================== JSON build / parse ====================

    private String buildRequestJson(GeminiRequest request) {
        ObjectNode root = objectMapper.createObjectNode();

        if (request.getSystemInstruction() != null && !request.getSystemInstruction().isBlank()) {
            ObjectNode sys = root.putObject("systemInstruction");
            sys.putArray("parts").addObject().put("text", request.getSystemInstruction());
        }

        ArrayNode contents = root.putArray("contents");
        for (GeminiTurn turn : request.turns()) {
            ObjectNode turnNode = contents.addObject();
            turnNode.put("role", turn.getRole() == null ? "user" : turn.getRole());
            ArrayNode parts = turnNode.putArray("parts");
            if (turn.getFunctionCallName() != null) {
                ObjectNode fc = parts.addObject().putObject("functionCall");
                fc.put("name", turn.getFunctionCallName());
                fc.set("args", turn.getFunctionCallArgs() != null
                        ? turn.getFunctionCallArgs() : objectMapper.createObjectNode());
            }
            if (turn.getFunctionResponse() != null) {
                ObjectNode fr = parts.addObject().putObject("functionResponse");
                fr.put("name", turn.getFunctionName());
                fr.set("response", turn.getFunctionResponse());
            }
            if (turn.getInlineImageBase64() != null) {
                ObjectNode inline = parts.addObject().putObject("inline_data");
                inline.put("mime_type", turn.getInlineImageMime() == null ? "image/jpeg" : turn.getInlineImageMime());
                inline.put("data", turn.getInlineImageBase64());
            }
            if (turn.getText() != null) {
                parts.addObject().put("text", turn.getText());
            }
            if (parts.isEmpty()) {
                parts.addObject().put("text", "");
            }
        }

        List<GeminiFunctionDeclaration> tools = request.getTools();
        if (tools != null && !tools.isEmpty()) {
            ArrayNode declarations = root.putArray("tools").addObject().putArray("functionDeclarations");
            for (GeminiFunctionDeclaration tool : tools) {
                ObjectNode decl = declarations.addObject();
                decl.put("name", tool.getName());
                if (tool.getDescription() != null) {
                    decl.put("description", tool.getDescription());
                }
                if (tool.getParameters() != null) {
                    decl.set("parameters", tool.getParameters());
                }
            }
        }

        ObjectNode gen = root.putObject("generationConfig");
        gen.put("temperature", request.getTemperature());
        gen.put("maxOutputTokens", request.getMaxOutputTokens());
        if (request.isJsonMode()) {
            gen.put("responseMimeType", "application/json");
        }
        if (request.getResponseSchema() != null) {
            gen.set("responseSchema", request.getResponseSchema());
        }

        try {
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new GeminiException("Failed to serialize Gemini request", e);
        }
    }

    private GeminiResponse parseResponse(String responseBody, String callSite) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                JsonNode error = root.path("error");
                if (!error.isMissingNode()) {
                    throw new GeminiException("Gemini error: " + error.path("message").asText("unknown"));
                }
                throw new GeminiException("Gemini returned no candidates");
            }
            JsonNode candidate = candidates.get(0);
            String finishReason = candidate.path("finishReason").asText("STOP");
            if ("SAFETY".equals(finishReason)) {
                throw new GeminiException("Gemini blocked the response (SAFETY)");
            }

            StringBuilder text = new StringBuilder();
            List<GeminiFunctionCall> calls = new ArrayList<>();
            for (JsonNode part : candidate.path("content").path("parts")) {
                if (part.has("text")) {
                    text.append(part.get("text").asText());
                } else if (part.has("functionCall")) {
                    JsonNode fc = part.get("functionCall");
                    calls.add(GeminiFunctionCall.builder()
                            .name(fc.path("name").asText())
                            .args(fc.has("args") ? fc.get("args") : objectMapper.createObjectNode())
                            .build());
                }
            }

            JsonNode usage = root.path("usageMetadata");
            return GeminiResponse.builder()
                    .text(text.toString().trim())
                    .functionCalls(calls)
                    .finishReason(finishReason)
                    .promptTokens(usage.path("promptTokenCount").asInt(0))
                    .outputTokens(usage.path("candidatesTokenCount").asInt(0))
                    .build();
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Failed to parse Gemini response for " + callSite, e);
        }
    }

    private String extractStreamDelta(String chunkJson) {
        try {
            JsonNode root = objectMapper.readTree(chunkJson);
            StringBuilder sb = new StringBuilder();
            for (JsonNode part : root.path("candidates").path(0).path("content").path("parts")) {
                if (part.has("text")) {
                    sb.append(part.get("text").asText());
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    // ==================== metrics ====================

    private void recordMetrics(String callSite, GeminiResponse response, long startNanos,
                               boolean hedgeFired, String outcome) {
        requestLatencyTimer(callSite, "unary").record(System.nanoTime() - startNanos, TimeUnit.NANOSECONDS);
        meterRegistry.counter("aura.gemini.requests",
                "call_site", callSite, "mode", "unary", "outcome", outcome).increment();
        if (hedgeFired) {
            meterRegistry.counter("aura.gemini.hedge.fired", "call_site", callSite).increment();
        }
        if (response.getPromptTokens() > 0) {
            meterRegistry.counter("aura.gemini.tokens", "call_site", callSite, "direction", "in")
                    .increment(response.getPromptTokens());
        }
        if (response.getOutputTokens() > 0) {
            meterRegistry.counter("aura.gemini.tokens", "call_site", callSite, "direction", "out")
                    .increment(response.getOutputTokens());
        }
        double cost = response.getPromptTokens() / 1_000_000.0 * INPUT_USD_PER_MTOK
                + response.getOutputTokens() / 1_000_000.0 * OUTPUT_USD_PER_MTOK;
        if (cost > 0) {
            meterRegistry.counter("aura.gemini.cost.usd", "call_site", callSite).increment(cost);
        }
    }

    private void recordOutcome(String callSite, String outcome, long startNanos, boolean hedgeFired) {
        requestLatencyTimer(callSite, "unary").record(System.nanoTime() - startNanos, TimeUnit.NANOSECONDS);
        meterRegistry.counter("aura.gemini.requests",
                "call_site", callSite, "mode", "unary", "outcome", outcome).increment();
        if (hedgeFired) {
            meterRegistry.counter("aura.gemini.hedge.fired", "call_site", callSite).increment();
        }
    }

    private Timer requestLatencyTimer(String callSite, String mode) {
        return Timer.builder("aura.gemini.request.latency")
                .tag("call_site", callSite)
                .tag("mode", mode)
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    // ==================== helpers ====================

    private static OkHttpClient buildClient(int connectSeconds, int readSeconds) {
        return new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(connectSeconds))
                .readTimeout(Duration.ofSeconds(readSeconds))
                .writeTimeout(Duration.ofSeconds(connectSeconds))
                .build();
    }

    private static RequestBody jsonBody(String body) {
        return RequestBody.create(body, MediaType.parse("application/json"));
    }

    private static boolean isRetryable(Throwable t) {
        while (t != null) {
            if (t instanceof SocketTimeoutException || t instanceof ConnectException
                    || t instanceof SocketException || t instanceof UnknownHostException) {
                return true;
            }
            t = t.getCause();
        }
        return false;
    }

    private static String truncate(String s) {
        if (s == null) {
            return "";
        }
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }

    @PreDestroy
    void shutdown() {
        hedgeExecutor.shutdownNow();
    }
}
