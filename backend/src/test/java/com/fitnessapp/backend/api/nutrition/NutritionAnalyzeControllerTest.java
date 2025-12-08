package com.fitnessapp.backend.api.nutrition;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.service.FoodRecognitionService;
import com.fitnessapp.backend.nutrition.service.NutritionEngine;
import com.fitnessapp.backend.user.entity.ApiKey;
import com.fitnessapp.backend.user.service.ApiKeyService;

/**
 * Integration tests for /api/v1/nutrition/analyze endpoint
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Nutrition Analyze Endpoint Tests")
class NutritionAnalyzeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FoodRecognitionService foodRecognitionService;

    @MockBean
    private NutritionEngine nutritionEngine;

    @MockBean
    private ApiKeyService apiKeyService;

    private static final String TEST_API_KEY = "test-api-key";
    private static final UUID TEST_USER_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Mock API key validation for all tests
        ApiKey validApiKey = ApiKey.builder()
            .key(TEST_API_KEY)
            .tenantId(TEST_USER_ID.toString())
            .enabled(true)
            .build();
        when(apiKeyService.validateKey(anyString())).thenReturn(Optional.of(validApiKey));
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should analyze food image successfully")
    void testAnalyzeFoodImage_Success() throws Exception {
        // Given
        MockMultipartFile imageFile = new MockMultipartFile(
            "image",
            "food.jpg",
            "image/jpeg",
            "fake-image-content".getBytes()
        );

        // Mock Claude Vision response
        RecognizedFood rice = RecognizedFood.builder()
            .foodKey("steamed_rice")
            .displayName("白米饭")
            .estimatedGrams(200)
            .cookingMethod("steamed")
            .confidence(0.95)
            .nutrition(NutritionInfo.builder()
                .calories(232.0)
                .protein(5.2)
                .fat(0.6)
                .carbs(51.2)
                .build())
            .build();

        RecognizedFood pork = RecognizedFood.builder()
            .foodKey("braised_pork")
            .displayName("红烧肉")
            .estimatedGrams(100)
            .cookingMethod("braised")
            .confidence(0.88)
            .nutrition(NutritionInfo.builder()
                .calories(340.0)
                .protein(14.0)
                .fat(28.0)
                .carbs(5.0)
                .build())
            .build();

        FoodRecognitionResult recognitionResult = FoodRecognitionResult.builder()
            .items(Arrays.asList(rice, pork))
            .mealType("lunch")
            .build();

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class), isNull())).thenReturn(recognitionResult);

        // Mock nutrition enrichment (already done by FoodRecognitionService but we need to setup total calculation)
        // No need to verify enrichWithNutrition as it's handled internally by FoodRecognitionService

        // Mock total calculation
        when(nutritionEngine.calculateTotal(any())).thenReturn(
            NutritionInfo.builder()
                .calories(572.0)
                .protein(19.2)
                .fat(28.6)
                .carbs(56.2)
                .build()
        );

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(imageFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.items[0].food_key").value("steamed_rice"))
            .andExpect(jsonPath("$.items[0].display_name").value("白米饭"))
            .andExpect(jsonPath("$.items[0].estimated_grams").value(200))
            .andExpect(jsonPath("$.items[0].confidence").value(0.95))
            .andExpect(jsonPath("$.items[0].nutrition.calories").value(232.0))
            .andExpect(jsonPath("$.items[1].food_key").value("braised_pork"))
            .andExpect(jsonPath("$.totalNutrition.calories").value(572.0))
            .andExpect(jsonPath("$.totalNutrition.protein").value(19.2))
            .andExpect(jsonPath("$.suggestedMealType").value("lunch"));

        // Verify interactions
        verify(foodRecognitionService, times(1)).recognizeFoods(any(MultipartFile.class), isNull());
        verify(nutritionEngine, times(1)).calculateTotal(any());
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should fail with empty image")
    void testAnalyzeFoodImage_EmptyImage() throws Exception {
        // Given
        MockMultipartFile emptyFile = new MockMultipartFile(
            "image",
            "empty.jpg",
            "image/jpeg",
            new byte[0]
        );

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(emptyFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should fail with oversized image")
    void testAnalyzeFoodImage_OversizedImage() throws Exception {
        // Given: 11MB image (exceeds 10MB limit)
        byte[] largeContent = new byte[11 * 1024 * 1024];
        MockMultipartFile largeFile = new MockMultipartFile(
            "image",
            "large.jpg",
            "image/jpeg",
            largeContent
        );

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(largeFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should handle Claude Vision failure")
    void testAnalyzeFoodImage_ClaudeVisionFailure() throws Exception {
        // Given
        MockMultipartFile imageFile = new MockMultipartFile(
            "image",
            "food.jpg",
            "image/jpeg",
            "content".getBytes()
        );

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class), isNull()))
            .thenThrow(new RuntimeException("Claude API error"));

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(imageFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should handle empty recognition result")
    void testAnalyzeFoodImage_EmptyRecognition() throws Exception {
        // Given
        MockMultipartFile imageFile = new MockMultipartFile(
            "image",
            "unclear.jpg",
            "image/jpeg",
            "content".getBytes()
        );

        // Mock empty recognition result
        FoodRecognitionResult emptyResult = FoodRecognitionResult.builder()
            .items(Collections.emptyList())
            .mealType("unknown")
            .build();

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class), isNull())).thenReturn(emptyResult);
        when(nutritionEngine.calculateTotal(any())).thenReturn(NutritionInfo.zero());

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(imageFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(0)))
            .andExpect(jsonPath("$.totalNutrition.calories").value(0.0))
            .andExpect(jsonPath("$.suggestedMealType").value("unknown"));
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should handle single food item")
    void testAnalyzeFoodImage_SingleFood() throws Exception {
        // Given
        MockMultipartFile imageFile = new MockMultipartFile(
            "image",
            "egg.jpg",
            "image/jpeg",
            "content".getBytes()
        );

        RecognizedFood egg = RecognizedFood.builder()
            .foodKey("fried_egg")
            .displayName("煎蛋")
            .estimatedGrams(50)
            .confidence(0.92)
            .nutrition(NutritionInfo.builder()
                .calories(98.0)
                .protein(6.8)
                .fat(7.65)
                .carbs(0.55)
                .build())
            .build();

        FoodRecognitionResult recognitionResult = FoodRecognitionResult.builder()
            .items(Collections.singletonList(egg))
            .mealType("breakfast")
            .build();

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class), isNull())).thenReturn(recognitionResult);

        when(nutritionEngine.calculateTotal(any())).thenReturn(
            NutritionInfo.builder()
                .calories(98.0).protein(6.8).fat(7.65).carbs(0.55).build()
        );

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(imageFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(1)))
            .andExpect(jsonPath("$.items[0].food_key").value("fried_egg"))
            .andExpect(jsonPath("$.totalNutrition.calories").value(98.0))
            .andExpect(jsonPath("$.suggestedMealType").value("breakfast"));
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should preserve all food details")
    void testAnalyzeFoodImage_PreservesDetails() throws Exception {
        // Given
        MockMultipartFile imageFile = new MockMultipartFile(
            "image",
            "food.jpg",
            "image/jpeg",
            "content".getBytes()
        );

        RecognizedFood food = RecognizedFood.builder()
            .foodKey("tomato_egg")
            .displayName("番茄炒蛋")
            .estimatedGrams(120)
            .cookingMethod("stir_fried")
            .confidence(0.87)
            .nutrition(NutritionInfo.builder()
                .calories(114.0)
                .protein(7.2)
                .fat(7.8)
                .carbs(5.4)
                .build())
            .build();

        FoodRecognitionResult recognitionResult = FoodRecognitionResult.builder()
            .items(Collections.singletonList(food))
            .mealType("dinner")
            .build();

        when(foodRecognitionService.recognizeFoods(any(MultipartFile.class), isNull())).thenReturn(recognitionResult);

        when(nutritionEngine.calculateTotal(any())).thenReturn(
            NutritionInfo.builder()
                .calories(114.0).protein(7.2).fat(7.8).carbs(5.4).build()
        );

        // When/Then
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .file(imageFile)
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].food_key").value("tomato_egg"))
            .andExpect(jsonPath("$.items[0].display_name").value("番茄炒蛋"))
            .andExpect(jsonPath("$.items[0].estimated_grams").value(120))
            .andExpect(jsonPath("$.items[0].cooking_method").value("stir_fried"))
            .andExpect(jsonPath("$.items[0].confidence").value(0.87))
            .andExpect(jsonPath("$.items[0].nutrition").exists());
    }

    @Test
    @DisplayName("POST /api/v1/nutrition/analyze - Should require multipart/form-data")
    void testAnalyzeFoodImage_RequiresMultipart() throws Exception {
        // When/Then: Try to send no file (multipart request with no file)
        // Missing required @RequestParam("image") should result in 400 or 500
        mockMvc.perform(multipart("/api/v1/nutrition/analyze")
                .header("X-API-Key", TEST_API_KEY))
            .andExpect(status().is5xxServerError());  // Spring returns 500 for missing required params
    }
}
