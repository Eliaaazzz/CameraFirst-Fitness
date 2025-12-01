package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for NutritionEngine
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NutritionEngine Tests")
class NutritionEngineTest {

    @Mock
    private NutritionLookupService nutritionLookupService;

    private NutritionEngine nutritionEngine;

    // Mock nutrition data (per 100g)
    private static final NutritionInfo STEAMED_RICE = NutritionInfo.builder()
            .calories(116.0).protein(2.6).fat(0.3).carbs(25.6).build();
    private static final NutritionInfo CHICKEN_BREAST = NutritionInfo.builder()
            .calories(133.0).protein(28.0).fat(2.0).carbs(0.0).build();
    private static final NutritionInfo FRIED_EGG = NutritionInfo.builder()
            .calories(196.0).protein(13.6).fat(15.3).carbs(1.1).build();
    private static final NutritionInfo BRAISED_PORK = NutritionInfo.builder()
            .calories(340.0).protein(14.0).fat(28.0).carbs(5.0).build();
    private static final NutritionInfo STIR_FRIED_VEG = NutritionInfo.builder()
            .calories(38.0).protein(2.3).fat(2.1).carbs(3.2).build();
    private static final NutritionInfo DEFAULT_NUTRITION = NutritionInfo.builder()
            .calories(150.0).protein(8.0).fat(6.0).carbs(15.0).build();

    @BeforeEach
    void setUp() {
        nutritionEngine = new NutritionEngineImpl(nutritionLookupService);
    }

    @Test
    @DisplayName("Should calculate nutrition for steamed rice correctly")
    void testCalculateNutrition_SteamedRice() {
        // Given: 200g of steamed rice
        when(nutritionLookupService.lookupNutrition("steamed_rice")).thenReturn(STEAMED_RICE);

        // When
        NutritionInfo result = nutritionEngine.calculateNutrition("steamed_rice", 200);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualTo(232.0);
        assertThat(result.getProtein()).isEqualTo(5.2);
        assertThat(result.getFat()).isEqualTo(0.6);
        assertThat(result.getCarbs()).isEqualTo(51.2);
    }

    @Test
    @DisplayName("Should calculate nutrition for chicken breast correctly")
    void testCalculateNutrition_ChickenBreast() {
        // Given: 150g of chicken breast
        when(nutritionLookupService.lookupNutrition("chicken_breast")).thenReturn(CHICKEN_BREAST);

        // When
        NutritionInfo result = nutritionEngine.calculateNutrition("chicken_breast", 150);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualTo(199.5);
        assertThat(result.getProtein()).isEqualTo(42.0);
        assertThat(result.getFat()).isEqualTo(3.0);
        assertThat(result.getCarbs()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should use default values for unknown food")
    void testCalculateNutrition_UnknownFood() {
        // Given: 100g of unknown food
        when(nutritionLookupService.lookupNutrition("unknown_food_xyz")).thenReturn(DEFAULT_NUTRITION);

        // When
        NutritionInfo result = nutritionEngine.calculateNutrition("unknown_food_xyz", 100);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualTo(150.0);
        assertThat(result.getProtein()).isEqualTo(8.0);
        assertThat(result.getFat()).isEqualTo(6.0);
        assertThat(result.getCarbs()).isEqualTo(15.0);
    }

    @Test
    @DisplayName("Should handle zero grams")
    void testCalculateNutrition_ZeroGrams() {
        // Given
        when(nutritionLookupService.lookupNutrition("steamed_rice")).thenReturn(STEAMED_RICE);

        // When
        NutritionInfo result = nutritionEngine.calculateNutrition("steamed_rice", 0);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualTo(0.0);
        assertThat(result.getProtein()).isEqualTo(0.0);
        assertThat(result.getFat()).isEqualTo(0.0);
        assertThat(result.getCarbs()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should enrich RecognizedFood with nutrition")
    void testEnrichWithNutrition() {
        // Given
        when(nutritionLookupService.lookupNutrition("fried_egg")).thenReturn(FRIED_EGG);

        RecognizedFood food = RecognizedFood.builder()
            .foodKey("fried_egg")
            .displayName("Fried Egg")
            .estimatedGrams(50)
            .confidence(0.95)
            .build();

        // When
        nutritionEngine.enrichWithNutrition(food);

        // Then
        assertThat(food.getNutrition()).isNotNull();
        assertThat(food.getNutrition().getCalories()).isEqualTo(98.0); // 196 * 0.5
        assertThat(food.getNutrition().getProtein()).isEqualTo(6.8); // 13.6 * 0.5
    }

    @Test
    @DisplayName("Should default to 100g when grams is null")
    void testEnrichWithNutrition_NullGrams() {
        // Given
        when(nutritionLookupService.lookupNutrition("steamed_rice")).thenReturn(STEAMED_RICE);

        RecognizedFood food = RecognizedFood.builder()
            .foodKey("steamed_rice")
            .displayName("White Rice")
            .estimatedGrams(null)
            .build();

        // When
        nutritionEngine.enrichWithNutrition(food);

        // Then
        assertThat(food.getEstimatedGrams()).isEqualTo(100);
        assertThat(food.getNutrition()).isNotNull();
        assertThat(food.getNutrition().getCalories()).isEqualTo(116.0);
    }

    @Test
    @DisplayName("Should calculate total nutrition from multiple foods")
    void testCalculateTotal_MultipleFoods() {
        // Given
        List<RecognizedFood> foods = Arrays.asList(
            RecognizedFood.builder()
                .foodKey("steamed_rice")
                .estimatedGrams(200)
                .nutrition(NutritionInfo.builder()
                    .calories(232.0).protein(5.2).fat(0.6).carbs(51.2).build())
                .build(),
            RecognizedFood.builder()
                .foodKey("braised_pork")
                .estimatedGrams(100)
                .nutrition(NutritionInfo.builder()
                    .calories(340.0).protein(14.0).fat(28.0).carbs(5.0).build())
                .build(),
            RecognizedFood.builder()
                .foodKey("stir_fried_vegetables")
                .estimatedGrams(150)
                .nutrition(NutritionInfo.builder()
                    .calories(57.0).protein(3.45).fat(3.15).carbs(4.8).build())
                .build()
        );

        // When
        NutritionInfo total = nutritionEngine.calculateTotal(foods);

        // Then
        assertThat(total).isNotNull();
        assertThat(total.getCalories()).isEqualTo(629.0); // 232 + 340 + 57
        assertThat(total.getProtein()).isEqualTo(22.65); // 5.2 + 14 + 3.45
        assertThat(total.getFat()).isEqualTo(31.75); // 0.6 + 28 + 3.15
        assertThat(total.getCarbs()).isEqualTo(61.0); // 51.2 + 5 + 4.8
    }

    @Test
    @DisplayName("Should enrich foods without nutrition before calculating total")
    void testCalculateTotal_EnrichesAutomatically() {
        // Given: Foods without pre-calculated nutrition
        when(nutritionLookupService.lookupNutrition("steamed_rice")).thenReturn(STEAMED_RICE);
        when(nutritionLookupService.lookupNutrition("fried_egg")).thenReturn(FRIED_EGG);

        List<RecognizedFood> foods = Arrays.asList(
            RecognizedFood.builder()
                .foodKey("steamed_rice")
                .estimatedGrams(200)
                .build(),
            RecognizedFood.builder()
                .foodKey("fried_egg")
                .estimatedGrams(50)
                .build()
        );

        // When
        NutritionInfo total = nutritionEngine.calculateTotal(foods);

        // Then
        assertThat(total).isNotNull();
        assertThat(total.getCalories()).isGreaterThan(0);
        // Verify foods were enriched
        assertThat(foods.get(0).getNutrition()).isNotNull();
        assertThat(foods.get(1).getNutrition()).isNotNull();
    }

    @Test
    @DisplayName("Should handle empty food list")
    void testCalculateTotal_EmptyList() {
        // When
        NutritionInfo total = nutritionEngine.calculateTotal(Arrays.asList());

        // Then
        assertThat(total).isNotNull();
        assertThat(total.getCalories()).isEqualTo(0.0);
        assertThat(total.getProtein()).isEqualTo(0.0);
        assertThat(total.getFat()).isEqualTo(0.0);
        assertThat(total.getCarbs()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should calculate nutrition for all supported foods")
    void testCalculateNutrition_AllSupportedFoods() {
        // Test all foods call lookupNutrition
        when(nutritionLookupService.lookupNutrition(anyString())).thenReturn(STEAMED_RICE);

        String[] foods = {
            "steamed_rice", "fried_rice", "noodles",
            "braised_pork", "chicken_breast", "beef", "beef_stir_fry",
            "boiled_egg", "fried_egg", "scrambled_egg",
            "stir_fried_vegetables", "tomato_egg", "tofu"
        };

        for (String foodKey : foods) {
            NutritionInfo result = nutritionEngine.calculateNutrition(foodKey, 100);

            assertThat(result).isNotNull();
            assertThat(result.getCalories()).isGreaterThan(0);
            // Most foods have protein (except pure carbs might be low)
            assertThat(result.getProtein()).isGreaterThanOrEqualTo(0);
        }
    }

    @Test
    @DisplayName("Should round values to 2 decimal places")
    void testCalculateNutrition_Rounding() {
        // Given: 33g of chicken breast
        when(nutritionLookupService.lookupNutrition("chicken_breast")).thenReturn(CHICKEN_BREAST);

        // When
        NutritionInfo result = nutritionEngine.calculateNutrition("chicken_breast", 33);

        // Then
        assertThat(result).isNotNull();
        // Check that we don't have more than 2 decimal places
        String caloriesStr = String.valueOf(result.getCalories());
        int decimalIndex = caloriesStr.indexOf('.');
        if (decimalIndex >= 0) {
            int decimalPlaces = caloriesStr.length() - decimalIndex - 1;
            assertThat(decimalPlaces).isLessThanOrEqualTo(2);
        }
    }
}
