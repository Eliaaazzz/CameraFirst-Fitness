package com.fitnessapp.backend.common.ai;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

/**
 * Wire-model DTOs for {@link GeminiClient}.
 *
 * <p>These intentionally model only the slice of the Gemini "generateContent" contract this app
 * uses: multi-turn content, function (tool) calling, inline image parts, and structured output.
 * Keeping them here lets every AI call site (vision, goals, the Coach agent) share one transport
 * with hedging, resilience and metrics instead of re-implementing OkHttp + hand-built JSON.</p>
 */
public final class GeminiModels {

    private GeminiModels() {
    }

    /** A single content turn in a conversation. */
    @Data
    @Builder
    public static class GeminiTurn {
        /** "user" or "model". */
        private final String role;
        /** Plain text part (nullable when this turn carries a functionResponse or image). */
        private final String text;
        /** Base64 inline image (nullable). */
        private final String inlineImageBase64;
        private final String inlineImageMime;
        /** Function-response turn: the tool name that was executed. */
        private final String functionName;
        /** Function-response turn: the JSON payload returned by the tool. */
        private final JsonNode functionResponse;
        /** Model function-call turn: the tool the model asked to invoke (must precede its functionResponse). */
        private final String functionCallName;
        private final JsonNode functionCallArgs;

        public static GeminiTurn user(String text) {
            return GeminiTurn.builder().role("user").text(text).build();
        }

        public static GeminiTurn model(String text) {
            return GeminiTurn.builder().role("model").text(text).build();
        }

        public static GeminiTurn modelFunctionCall(String name, JsonNode args) {
            return GeminiTurn.builder().role("model").functionCallName(name).functionCallArgs(args).build();
        }

        public static GeminiTurn functionResult(String name, JsonNode response) {
            return GeminiTurn.builder().role("user").functionName(name).functionResponse(response).build();
        }
    }

    /** A tool the model may call (Gemini "functionDeclaration"). */
    @Data
    @Builder
    public static class GeminiFunctionDeclaration {
        private final String name;
        private final String description;
        /** JSON-schema "parameters" object describing the tool's arguments. */
        private final JsonNode parameters;
    }

    /** A request to generate content. Use the builder; most fields are optional. */
    @Data
    @Builder
    public static class GeminiRequest {
        private final String systemInstruction;
        @Singular
        private final List<GeminiTurn> turns;
        @Singular
        private final List<GeminiFunctionDeclaration> tools;
        @Builder.Default
        private final double temperature = 0.2;
        @Builder.Default
        private final int maxOutputTokens = 2048;
        /** When true, sets responseMimeType=application/json. */
        @Builder.Default
        private final boolean jsonMode = false;
        /** Optional structured-output schema (Gemini responseSchema). */
        private final JsonNode responseSchema;
        /** When true, enables the tail-latency hedge for this call. */
        @Builder.Default
        private final boolean hedge = false;
        /** Logical label for metrics/tracing (e.g. "meal_vision", "goals", "coach_agent"). */
        @Builder.Default
        private final String callSite = "unknown";

        public List<GeminiTurn> turns() {
            return turns == null ? new ArrayList<>() : turns;
        }
    }

    /** A function call the model wants the caller to execute. */
    @Data
    @Builder
    public static class GeminiFunctionCall {
        private final String name;
        private final JsonNode args;
    }

    /** Parsed result of a generate() call. */
    @Data
    @Builder
    public static class GeminiResponse {
        private final String text;
        @Singular("functionCall")
        private final List<GeminiFunctionCall> functionCalls;
        private final String finishReason;
        private final int promptTokens;
        private final int outputTokens;

        public boolean hasFunctionCalls() {
            return functionCalls != null && !functionCalls.isEmpty();
        }
    }
}
