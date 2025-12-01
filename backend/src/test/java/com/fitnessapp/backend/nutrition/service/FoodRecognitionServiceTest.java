package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

/**
 * Unit tests for FoodRecognitionService
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FoodRecognitionService Tests")
class FoodRecognitionServiceTest {

    @Mock
    private FoodRecognitionProvider claudeProvider;
    
    @Mock
    private FoodRecognitionProvider openaiProvider;
    
    @Mock
    private NutritionEngine nutritionEngine;
    
    @Mock
    private Executor executor;
    
    private FoodRecognitionService service;
    
    @BeforeEach
    void setUp() {
        // Setup provider names and priorities (always needed for sorting)
        lenient().when(claudeProvider.getProviderName()).thenReturn("claude");
        lenient().when(claudeProvider.getModelName()).thenReturn("claude-3-5-sonnet");
        lenient().when(claudeProvider.getPriority()).thenReturn(10);
        
        lenient().when(openaiProvider.getProviderName()).thenReturn("openai");
        lenient().when(openaiProvider.getModelName()).thenReturn("gpt-4-vision");
        lenient().when(openaiProvider.getPriority()).thenReturn(20);
        
        List<FoodRecognitionProvider> providers = Arrays.asList(claudeProvider, openaiProvider);
        service = new FoodRecognitionService(providers, nutritionEngine, executor);
    }
    
    @Test
    @DisplayName("Should recognize foods using highest priority provider")
    void shouldUseHighestPriorityProvider() throws IOException {
        // Given
        MockMultipartFile image = createMockImage();
        when(claudeProvider.isAvailable()).thenReturn(true);
        
        FoodRecognitionResult expected = createMockResult();
        when(claudeProvider.recognizeFoods(any(MultipartFile.class))).thenReturn(expected);
        
        // When
        FoodRecognitionResult result = service.recognizeFoods(image);
        
        // Then
        assertThat(result).isEqualTo(expected);
        verify(claudeProvider).recognizeFoods(any(MultipartFile.class));
        verify(openaiProvider, never()).recognizeFoods(any(MultipartFile.class));
    }
    
    @Test
    @DisplayName("Should use specific provider when requested")
    void shouldUseSpecificProvider() throws IOException {
        // Given
        MockMultipartFile image = createMockImage();
        when(openaiProvider.isAvailable()).thenReturn(true);
        
        FoodRecognitionResult expected = createMockResult();
        when(openaiProvider.recognizeFoods(any(MultipartFile.class))).thenReturn(expected);
        
        // When
        FoodRecognitionResult result = service.recognizeFoods(image, "openai");
        
        // Then
        assertThat(result).isEqualTo(expected);
        verify(openaiProvider).recognizeFoods(any(MultipartFile.class));
        verify(claudeProvider, never()).recognizeFoods(any(MultipartFile.class));
    }
    
    @Test
    @DisplayName("Should fallback to secondary provider on failure")
    void shouldFallbackOnFailure() throws IOException {
        // Given
        MockMultipartFile image = createMockImage();
        when(claudeProvider.isAvailable()).thenReturn(true);
        when(openaiProvider.isAvailable()).thenReturn(true);
        
        when(claudeProvider.recognizeFoods(any(MultipartFile.class)))
            .thenThrow(new RuntimeException("Claude API error"));
            
        FoodRecognitionResult expected = createMockResult();
        when(openaiProvider.recognizeFoods(any(MultipartFile.class))).thenReturn(expected);
        
        // When
        FoodRecognitionResult result = service.recognizeFoods(image);
        
        // Then
        assertThat(result).isEqualTo(expected);
        verify(claudeProvider).recognizeFoods(any(MultipartFile.class));
        verify(openaiProvider).recognizeFoods(any(MultipartFile.class));
    }
    
    @Test
    @DisplayName("Should throw exception when no providers available")
    void shouldThrowWhenNoProvidersAvailable() {
        // Given
        MockMultipartFile image = createMockImage();
        when(claudeProvider.isAvailable()).thenReturn(false);
        when(openaiProvider.isAvailable()).thenReturn(false);
        
        // When/Then
        assertThatThrownBy(() -> service.recognizeFoods(image))
            .isInstanceOf(FoodRecognitionException.class)
            .hasMessageContaining("No AI food recognition providers available");
    }
    
    @Test
    @DisplayName("Should enrich result with nutrition data")
    void shouldEnrichWithNutrition() throws IOException {
        // Given
        MockMultipartFile image = createMockImage();
        when(claudeProvider.isAvailable()).thenReturn(true);
        
        RecognizedFood rice = RecognizedFood.builder()
            .foodKey("rice")
            .displayName("白米饭")
            .build();
            
        FoodRecognitionResult result = FoodRecognitionResult.builder()
            .items(Collections.singletonList(rice))
            .build();
            
        when(claudeProvider.recognizeFoods(any(MultipartFile.class))).thenReturn(result);
        
        // When
        service.recognizeFoods(image);
        
        // Then
        verify(nutritionEngine).enrichWithNutrition(rice);
    }
    
    @Test
    @DisplayName("Should return available providers list")
    void shouldReturnAvailableProviders() {
        // Given
        when(claudeProvider.isAvailable()).thenReturn(true);
        when(openaiProvider.isAvailable()).thenReturn(false);
        
        // When
        List<FoodRecognitionService.ProviderInfo> providers = service.getAvailableProviders();
        
        // Then
        assertThat(providers).hasSize(2);
        assertThat(providers).extracting(FoodRecognitionService.ProviderInfo::name)
            .containsExactly("claude", "openai");
        assertThat(providers.get(0).available()).isTrue();
        assertThat(providers.get(1).available()).isFalse();
    }
    
    @Test
    @DisplayName("Should check service availability")
    void shouldCheckServiceAvailability() {
        // Given
        when(claudeProvider.isAvailable()).thenReturn(false);
        when(openaiProvider.isAvailable()).thenReturn(true);
        
        // When/Then
        assertThat(service.isServiceAvailable()).isTrue();
        
        // Given - all unavailable
        when(openaiProvider.isAvailable()).thenReturn(false);
        
        // When/Then
        assertThat(service.isServiceAvailable()).isFalse();
    }
    
    private MockMultipartFile createMockImage() {
        return new MockMultipartFile(
            "image",
            "food.jpg",
            "image/jpeg",
            "fake-image".getBytes()
        );
    }
    
    private FoodRecognitionResult createMockResult() {
        RecognizedFood food = RecognizedFood.builder()
            .foodKey("rice")
            .displayName("白米饭")
            .estimatedGrams(200)
            .confidence(0.95)
            .build();
            
        return FoodRecognitionResult.builder()
            .items(Collections.singletonList(food))
            .mealType("lunch")
            .build();
    }
}
