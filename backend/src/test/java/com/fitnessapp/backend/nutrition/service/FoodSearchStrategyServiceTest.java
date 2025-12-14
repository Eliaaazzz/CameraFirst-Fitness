package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.nutrition.strategy.BaseMatchStrategy;
import com.fitnessapp.backend.nutrition.strategy.ExactMatchStrategy;
import com.fitnessapp.backend.nutrition.strategy.FoodMatchStrategy;
import com.fitnessapp.backend.nutrition.strategy.MethodMatchStrategy;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for FoodSearchStrategyService
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FoodSearchStrategyService Tests")
class FoodSearchStrategyServiceTest {

    @Mock
    private UsdaFoodRepository usdaFoodRepository;

    private FoodSearchStrategyService searchService;

    @BeforeEach
    void setUp() {
        // Create strategy instances
        ExactMatchStrategy exactMatchStrategy = new ExactMatchStrategy(usdaFoodRepository);
        MethodMatchStrategy methodMatchStrategy = new MethodMatchStrategy(usdaFoodRepository);
        BaseMatchStrategy baseMatchStrategy = new BaseMatchStrategy(usdaFoodRepository);
        
        List<FoodMatchStrategy> strategies = Arrays.asList(
            exactMatchStrategy,
            methodMatchStrategy,
            baseMatchStrategy
        );
        
        searchService = new FoodSearchStrategyService(usdaFoodRepository, strategies);
    }

    @Test
    @DisplayName("Should find exact match with cooking method and modifiers")
    void shouldFindExactMatch() {
        // Given: Looking for fried chicken breast with breading
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .form("Breast")
                .cookingMethodStr("FRIED")
                .modifiers(Arrays.asList("Breaded", "Crispy"))
                .searchTerms(Arrays.asList("Chicken", "Breast"))
                .build();

        UsdaFood friedChicken = createMockFood(1L, "Chicken, breast, fried, breaded");
        when(usdaFoodRepository.count()).thenReturn(1L); // USDA data available
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(Collections.singletonList(friedChicken));
        when(usdaFoodRepository.searchByAlias(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getFood().getName()).contains("fried");
        assertThat(result.get().getPriority()).isEqualTo(3); // Highest priority
        assertThat(result.get().getMatchScore()).isGreaterThan(0.8);
    }

    @Test
    @DisplayName("Should find method match when exact match not available")
    void shouldFindMethodMatch() {
        // Given: Looking for grilled salmon
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Salmon")
                .form("Fillet")
                .cookingMethodStr("GRILLED")
                .searchTerms(Arrays.asList("Salmon", "Fillet"))
                .build();

        UsdaFood grilledSalmon = createMockFood(1L, "Salmon, grilled");
        when(usdaFoodRepository.count()).thenReturn(1L);
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(Collections.singletonList(grilledSalmon));
        when(usdaFoodRepository.searchByAlias(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getFood().getName()).contains("grilled");
        assertThat(result.get().getPriority()).isGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("Should find base match for raw form")
    void shouldFindBaseMatch() {
        // Given: Looking for fried beef, but only raw beef available
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Beef")
                .cookingMethodStr("FRIED")
                .searchTerms(Collections.singletonList("Beef"))
                .build();

        UsdaFood rawBeef = createMockFood(1L, "Beef, raw");
        
        // Mock all possible queries
        when(usdaFoodRepository.count()).thenReturn(1L);
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenAnswer(invocation -> {
                    String query = invocation.getArgument(0);
                    if (query.equals("Beef")) {
                        return Collections.singletonList(rawBeef);
                    }
                    return Collections.emptyList();
                });
        when(usdaFoodRepository.searchByAlias(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getFood().getName()).contains("raw");
        assertThat(result.get().getPriority()).isEqualTo(1); // Lower priority (needs multiplier)
        assertThat(result.get().getMatchReason()).contains("cooking multiplier");
    }

    @Test
    @DisplayName("Should return empty when no metadata provided")
    void shouldReturnEmptyForNullMetadata() {
        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(null);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should return empty when no search terms provided")
    void shouldReturnEmptyForNoSearchTerms() {
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .searchTerms(Collections.emptyList())
                .build();

        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should return empty when no foods found")
    void shouldReturnEmptyWhenNoFoodsFound() {
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("UnknownFood")
                .searchTerms(Collections.singletonList("UnknownFood"))
                .build();

        when(usdaFoodRepository.count()).thenReturn(1L);
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(Collections.emptyList());
        when(usdaFoodRepository.searchByAlias(anyString()))
                .thenReturn(Collections.emptyList());

        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should prefer exact match over method match")
    void shouldPreferExactMatchOverMethodMatch() {
        // Given: Both exact and method matches available
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Chicken")
                .form("Breast")
                .cookingMethodStr("FRIED")
                .modifiers(Collections.singletonList("Breaded"))
                .searchTerms(Arrays.asList("Chicken", "Breast"))
                .build();

        UsdaFood exactMatch = createMockFood(1L, "Chicken breast, fried, breaded, with skin");
        UsdaFood methodMatch = createMockFood(2L, "Chicken, fried");

        when(usdaFoodRepository.count()).thenReturn(1L);
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(Arrays.asList(exactMatch, methodMatch));
        when(usdaFoodRepository.searchByAlias(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getPriority()).isEqualTo(3); // Exact match priority
        assertThat(result.get().getMatchScore()).isGreaterThan(0.8);
    }

    @Test
    @DisplayName("Should match via alias")
    void shouldMatchViaAlias() {
        FoodMetadata metadata = FoodMetadata.builder()
                .baseIngredient("Salmon")
                .searchTerms(Collections.singletonList("Salmon"))
                .build();

        UsdaFood salmon = createMockFood(1L, "Salmo salar, raw");
        
        when(usdaFoodRepository.count()).thenReturn(1L);
        when(usdaFoodRepository.findByNameContainingIgnoreCase(anyString()))
                .thenReturn(Collections.emptyList());
        when(usdaFoodRepository.searchByAlias("Salmon"))
                .thenReturn(Collections.singletonList(salmon));

        Optional<FoodSearchStrategyService.SearchResult> result = searchService.findBestMatch(metadata);
        assertThat(result).isPresent();
    }

    private UsdaFood createMockFood(Long id, String name) {
        UsdaFood food = new UsdaFood();
        food.setId(id);
        food.setName(name);
        food.setDescription(name);
        food.setFdcId(String.valueOf(id));
        return food;
    }
}
