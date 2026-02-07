package com.fitnessapp.backend.nutrition.service.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

/**
 * Unit tests for GeminiMealAnalysisService
 *
 * Tests the AI-native meal analysis using Gemini.
 */
class GeminiServiceTest {

    private static final String DEFAULT_MODEL = "gemini-2.5-flash";

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void testServiceNotAvailableWithoutApiKey() {
        // Given: No API key configured
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "", "");

        // Then: Service should not be available
        assertThat(service.isAvailable()).isFalse();
    }

    @Test
    void testServiceAvailableWithApiKey() {
        // Given: API key configured
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "test-api-key", "");

        // Then: Service should be available
        assertThat(service.isAvailable()).isTrue();
    }

    @Test
    void testProviderInterface() {
        // Given: Service with API key (uses default model)
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "test-api-key", "");

        // Then: Provider interface methods work
        assertThat(service.getProviderName()).isEqualTo("gemini");
        assertThat(service.getModelName()).isEqualTo(DEFAULT_MODEL);
        assertThat(service.getPriority()).isEqualTo(10);
    }

    @Test
    void testModelIsHardcoded() {
        // Given: Service with API key
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "test-api-key", "");

        // Then: Model is the hardcoded default (gemini-2.5-flash)
        assertThat(service.getModelName()).isEqualTo(DEFAULT_MODEL);
    }

    @Test
    void testRecognizeFoodsThrowsWhenNotConfigured() {
        // Given: No API key configured
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "", "");

        // When/Then: Should throw exception
        assertThrows(FoodRecognitionException.class, () -> {
            service.recognizeFoods("base64image", "image/jpeg");
        });
    }

    /**
     * Integration test - only runs when GEMINI_API_KEY is set
     */
    @Test
    @EnabledIfEnvironmentVariable(named = "GEMINI_API_KEY", matches = ".+")
    void testRealApiIntegration() {
        String apiKey = System.getenv("GEMINI_API_KEY");
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, apiKey, "");

        assertThat(service.isAvailable()).isTrue();
        assertThat(service.getProviderName()).isEqualTo("gemini");
    }
}
