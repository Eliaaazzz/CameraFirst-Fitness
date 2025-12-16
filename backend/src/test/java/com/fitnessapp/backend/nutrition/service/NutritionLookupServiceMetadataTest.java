package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.nutrition.service.core.FoodKeyNormalizer;
import com.fitnessapp.backend.nutrition.service.core.FoodSearchStrategyService;
import com.fitnessapp.backend.nutrition.service.core.NutritionLookupService;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for NutritionLookupService metadata-based lookup
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("NutritionLookupService Metadata Tests")
class NutritionLookupServiceMetadataTest {

    @Mock
    private com.fitnessapp.backend.nutrition.repository.FoodNutritionRepository foodNutritionRepository;

    @Mock
    private com.fitnessapp.backend.nutrition.repository.FoodSynonymRepository foodSynonymRepository;

    @Mock
    private FoodKeyNormalizer foodKeyNormalizer;

    @Mock
    private com.fitnessapp.backend.usda.service.UsdaFoodSearchService usdaFoodSearchService;

    @Mock
    private FoodSearchStrategyService foodSearchStrategyService;

    private NutritionLookupService nutritionLookupService;

    @BeforeEach
    void setUp() {
        nutritionLookupService = new NutritionLookupService(
                foodNutritionRepository,
                foodSynonymRepository,
                foodKeyNormalizer,
                usdaFoodSearchService,
                foodSearchStrategyService
        );
    }

    @Test
    @DisplayName("Should use exact match without multiplier")
    void shouldUseExactMatchWithoutMultiplier() {
        // Given: Exact match for fried chicken (priority 3)
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .form("Breast")
                .cookingMethodStr("FRIED")
                .searchTerms(Arrays.asList("Chicken", "Breast"))
                .build();

        UsdaFood friedChicken = createMockFoodWithNutrition(1L, "Chicken breast, fried",
                200.0, 25.0, 10.0, 5.0);
        
        FoodSearchStrategyService.SearchResult searchResult = 
                new FoodSearchStrategyService.SearchResult(friedChicken, 3, 0.95, "Exact match");

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.of(searchResult));

        // When
        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("200.0"));
        assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("25.0"));
        assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("10.0"));
    }

    @Test
    @DisplayName("Should apply cooking multiplier for base match")
    void shouldApplyCookingMultiplier() {
        // Given: Base match for raw chicken, needs FRIED multiplier (1.3x)
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .form("Breast")
                .cookingMethodStr("FRIED")
                .searchTerms(Arrays.asList("Chicken", "Breast"))
                .build();

        UsdaFood rawChicken = createMockFoodWithNutrition(1L, "Chicken breast, raw",
                100.0, 20.0, 2.0, 0.0);
        
        FoodSearchStrategyService.SearchResult searchResult = 
                new FoodSearchStrategyService.SearchResult(
                        rawChicken, 1, 0.75, "Base match (raw form, will apply cooking multiplier)");

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.of(searchResult));

        // When
        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

        // Then - FRIED multiplier is 1.5x
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0")); // 100 * 1.5
        assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("20.0")); // Protein unchanged
        assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("3.00")); // 2.0 * 1.5
    }

    @Test
    @DisplayName("Should apply BREADED multiplier (1.6x)")
    void shouldApplyBreadedMultiplier() {
        // Given: Raw chicken with BREADED cooking method
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .cookingMethodStr("BREADED")
                .searchTerms(Collections.singletonList("Chicken"))
                .build();

        UsdaFood rawChicken = createMockFoodWithNutrition(1L, "Chicken, raw",
                100.0, 20.0, 2.0, 0.0);
        
        FoodSearchStrategyService.SearchResult searchResult = 
                new FoodSearchStrategyService.SearchResult(rawChicken, 1, 0.7, "Base match");

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.of(searchResult));

        // When
        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

        // Then - BREADED multiplier is 1.6x
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("160.0")); // 100 * 1.6
        assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("3.20")); // 2.0 * 1.6
    }

    @Test
    @DisplayName("Should not apply multiplier for STEAMED (1.0x)")
    void shouldNotApplyMultiplierForSteamed() {
        // Given: Raw fish with STEAMED cooking method
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Fish")
                .cookingMethodStr("STEAMED")
                .searchTerms(Collections.singletonList("Fish"))
                .build();

        UsdaFood rawFish = createMockFoodWithNutrition(1L, "Fish, raw",
                100.0, 20.0, 5.0, 0.0);
        
        FoodSearchStrategyService.SearchResult searchResult = 
                new FoodSearchStrategyService.SearchResult(rawFish, 1, 0.8, "Base match");

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.of(searchResult));

        // When
        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

        // Then - STEAMED multiplier is 1.0x (no change)
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("100.0"));
        assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("20.0"));
        assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("5.0"));
    }

    @Test
    @DisplayName("Should return default nutrition when metadata is null")
    void shouldReturnDefaultForNullMetadata() {
        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(null);
        
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
        assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("8.0"));
    }

    @Test
    @DisplayName("Should fallback to traditional lookup when no match found")
    void shouldFallbackToTraditionalLookup() {
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("UnknownFood")
                .searchTerms(Collections.singletonList("unknown_food"))
                .build();

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.empty());
        when(foodKeyNormalizer.normalize("unknown_food"))
                .thenReturn("unknown_food");
        when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("unknown_food"))
                .thenReturn(Optional.empty());
        when(foodSynonymRepository.findBySynonymIgnoreCase("unknown_food"))
                .thenReturn(Optional.empty());
        when(foodNutritionRepository.findByFoodKeySimilar("unknown_food", 1))
                .thenReturn(Collections.emptyList());

        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);
        
        // Should return default nutrition
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    }

    @Test
    @DisplayName("Should handle food without nutrition data")
    void shouldHandleFoodWithoutNutrition() {
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .searchTerms(Collections.singletonList("Chicken"))
                .build();

        UsdaFood foodWithoutNutrition = new UsdaFood();
        foodWithoutNutrition.setId(1L);
        foodWithoutNutrition.setName("Chicken");
        foodWithoutNutrition.setNutrition(null); // No nutrition data

        FoodSearchStrategyService.SearchResult searchResult = 
                new FoodSearchStrategyService.SearchResult(foodWithoutNutrition, 2, 0.9, "Found");

        when(foodSearchStrategyService.findBestMatch(any(FoodMetadata.class)))
                .thenReturn(Optional.of(searchResult));

        NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);
        
        // Should return default nutrition
        assertThat(result).isNotNull();
        assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    }

    private UsdaFood createMockFoodWithNutrition(Long id, String name,
                                                 Double calories, Double protein, 
                                                 Double fat, Double carbs) {
        UsdaFood food = new UsdaFood();
        food.setId(id);
        food.setName(name);
        food.setDescription(name);
        food.setFdcId(String.valueOf(id));

        UsdaFoodNutrition nutrition = new UsdaFoodNutrition();
        nutrition.setId(id);
        nutrition.setCalories(BigDecimal.valueOf(calories));
        nutrition.setProteinG(BigDecimal.valueOf(protein));
        nutrition.setFatG(BigDecimal.valueOf(fat));
        nutrition.setCarbsG(BigDecimal.valueOf(carbs));
        nutrition.setFood(food);

        food.setNutrition(nutrition);
        return food;
    }
}
