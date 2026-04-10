package com.fitnessapp.backend.nutrition.service.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Method;
import java.util.Base64;

import javax.imageio.ImageIO;

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

    @Test
    void testCompressImageBypassesHeicOptimization() throws Exception {
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "test-api-key", "");
        String base64Image = Base64.getEncoder().encodeToString("fake-heic".getBytes());

        String optimized = invokeCompressImage(service, base64Image, "image/heic");

        assertThat(optimized).isEqualTo(base64Image);
    }

    @Test
    void testCompressImageConvertsLargePngToJpeg() throws Exception {
        GeminiMealAnalysisService service = new GeminiMealAnalysisService(objectMapper, "test-api-key", "");
        BufferedImage image = new BufferedImage(2000, 1200, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        String base64Image = Base64.getEncoder().encodeToString(output.toByteArray());

        String optimized = invokeCompressImage(service, base64Image, "image/png");
        byte[] optimizedBytes = Base64.getDecoder().decode(optimized);

        assertThat(optimized).isNotEqualTo(base64Image);
        assertThat(optimizedBytes)
                .hasSizeGreaterThan(3)
                .startsWith((byte) 0xFF, (byte) 0xD8, (byte) 0xFF);
    }

    @Test
    void testNormalizeContentTypeStripsParametersAndAliasesJpg() {
        assertThat(GeminiMealAnalysisService.normalizeContentType("image/jpg; charset=binary"))
                .isEqualTo("image/jpeg");
        assertThat(GeminiMealAnalysisService.normalizeContentType("image/x-png"))
                .isEqualTo("image/png");
    }

    @Test
    void testInferContentTypeFromFilenameSupportsCommonExtensions() {
        assertThat(GeminiMealAnalysisService.inferContentTypeFromFilename("meal.HEIC"))
                .isEqualTo("image/heic");
        assertThat(GeminiMealAnalysisService.inferContentTypeFromFilename("plate.jpeg"))
                .isEqualTo("image/jpeg");
        assertThat(GeminiMealAnalysisService.inferContentTypeFromFilename("unknown.bin"))
                .isNull();
    }

    private String invokeCompressImage(GeminiMealAnalysisService service, String base64Image, String mediaType)
            throws Exception {
        Method compressImage = GeminiMealAnalysisService.class
                .getDeclaredMethod("compressImage", String.class, String.class);
        compressImage.setAccessible(true);
        return (String) compressImage.invoke(service, base64Image, mediaType);
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
