package com.fitnessapp.backend.nutrition.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import com.fitnessapp.backend.nutrition.repository.FoodNutritionRepository;
import com.fitnessapp.backend.nutrition.service.core.FoodKeyNormalizer;
import com.fitnessapp.backend.nutrition.service.core.NutritionLookupService;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("NutritionLookupService Metadata Tests")
class NutritionLookupServiceMetadataTest {

  @Mock
  private FoodNutritionRepository foodNutritionRepository;

  @Mock
  private FoodKeyNormalizer foodKeyNormalizer;

  private NutritionLookupService nutritionLookupService;

  @BeforeEach
  void setUp() {
    nutritionLookupService = new NutritionLookupService(foodNutritionRepository, foodKeyNormalizer);
  }

  @Test
  void shouldApplyMultiplierForExactMatchWhenCookingMethodProvided() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("Chicken")
        .form("Breast")
        .cookingMethodStr("FRIED")
        .searchTerms(List.of("chicken_breast_fried"))
        .build();

    when(foodKeyNormalizer.normalize("chicken_breast_fried")).thenReturn("chicken_breast_fried");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("chicken_breast_fried"))
        .thenReturn(Optional.of(food("chicken_breast_fried", 200.0, 25.0, 10.0, 5.0)));

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("300.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("25.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("15.00"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("7.50"));
  }

  @Test
  void shouldApplyCookingMultiplierForBaseMatch() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("Chicken")
        .cookingMethodStr("FRIED")
        .searchTerms(List.of("chicken_breast"))
        .build();

    when(foodKeyNormalizer.normalize("chicken_breast")).thenReturn("chicken_breast");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("chicken_breast"))
        .thenReturn(Optional.of(food("chicken_breast", 100.0, 20.0, 2.0, 0.0)));

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("20.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("3.00"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("0.00"));
  }

  @Test
  void shouldApplyBreadedMultiplier() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("Chicken")
        .cookingMethodStr("BREADED")
        .searchTerms(List.of("chicken"))
        .build();

    when(foodKeyNormalizer.normalize("chicken")).thenReturn("chicken");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("chicken"))
        .thenReturn(Optional.of(food("chicken", 100.0, 20.0, 2.0, 0.0)));

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("160.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("20.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("3.20"));
  }

  @Test
  void shouldReturnDefaultNutritionForNullMetadata() {
    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(null);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("8.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("6.0"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("15.0"));
  }

  @Test
  void shouldFallbackToKeywordSearchWhenExactAndFuzzyDoNotMatch() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("UnknownFood")
        .searchTerms(Collections.singletonList("unknown_food"))
        .build();

    when(foodKeyNormalizer.normalize("unknown_food")).thenReturn("unknown_food");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("unknown_food")).thenReturn(Optional.empty());
    when(foodNutritionRepository.findByFoodKeySimilar("unknown_food", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.findByDisplayNameSimilar("unknown_food", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.searchByKeyword("unknown_food"))
        .thenReturn(List.of(food("unknown_food_match", 180.0, 9.0, 7.0, 22.0)));

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("180.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("9.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("7.0"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("22.0"));
  }

  @Test
  void shouldReturnDefaultWhenNoCandidateMatches() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("Mystery")
        .searchTerms(List.of("mystery_food"))
        .build();

    when(foodKeyNormalizer.normalize("mystery_food")).thenReturn("mystery_food");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("mystery_food")).thenReturn(Optional.empty());
    when(foodNutritionRepository.findByFoodKeySimilar("mystery_food", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.findByDisplayNameSimilar("mystery_food", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.searchByKeyword("mystery_food")).thenReturn(Collections.emptyList());

    when(foodKeyNormalizer.normalize("Mystery")).thenReturn("mystery");
    when(foodNutritionRepository.findByFoodKeyAndIsActiveTrue("mystery")).thenReturn(Optional.empty());
    when(foodNutritionRepository.findByFoodKeySimilar("mystery", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.findByDisplayNameSimilar("mystery", 1)).thenReturn(Collections.emptyList());
    when(foodNutritionRepository.searchByKeyword("mystery")).thenReturn(Collections.emptyList());

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("8.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("6.0"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("15.0"));
  }

  private FoodNutrition food(String key, double calories, double protein, double fat, double carbs) {
    return FoodNutrition.builder()
        .foodKey(key)
        .displayName(key)
        .calories(BigDecimal.valueOf(calories))
        .protein(BigDecimal.valueOf(protein))
        .fat(BigDecimal.valueOf(fat))
        .carbs(BigDecimal.valueOf(carbs))
        .isActive(true)
        .build();
  }
}
