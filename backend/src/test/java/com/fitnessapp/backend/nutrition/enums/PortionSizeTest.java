package com.fitnessapp.backend.nutrition.enums;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Unit tests for PortionSize enum with density category integration
 */
@DisplayName("PortionSize Tests")
class PortionSizeTest {

    @Test
    @DisplayName("calculateGrams() without category should use GENERIC defaults")
    void calculateGramsWithoutCategory() {
        assertThat(PortionSize.SMALL.calculateGrams()).isEqualTo(100);
        assertThat(PortionSize.MEDIUM.calculateGrams()).isEqualTo(200);
        assertThat(PortionSize.LARGE.calculateGrams()).isEqualTo(300);
    }

    @ParameterizedTest
    @DisplayName("calculateGrams(category) should return category-specific values")
    @CsvSource({
        "SMALL, LEAFY_VEG, 50",
        "MEDIUM, LEAFY_VEG, 100",
        "LARGE, LEAFY_VEG, 200",
        "SMALL, CARB_STAPLE, 100",
        "MEDIUM, CARB_STAPLE, 200",
        "LARGE, CARB_STAPLE, 350",
        "SMALL, MEAT_MAIN, 120",
        "MEDIUM, MEAT_MAIN, 200",
        "LARGE, MEAT_MAIN, 350",
        "SMALL, FATS_DRESSING, 10",
        "MEDIUM, FATS_DRESSING, 20",
        "LARGE, FATS_DRESSING, 40"
    })
    void calculateGramsWithCategory(String portionStr, String categoryStr, int expectedGrams) {
        PortionSize portion = PortionSize.valueOf(portionStr);
        FoodDensityCategory category = FoodDensityCategory.valueOf(categoryStr);

        assertThat(portion.calculateGrams(category)).isEqualTo(expectedGrams);
    }

    @Test
    @DisplayName("calculateGrams(null) should use GENERIC category")
    void calculateGramsWithNullCategory() {
        assertThat(PortionSize.SMALL.calculateGrams(null)).isEqualTo(100);
        assertThat(PortionSize.MEDIUM.calculateGrams(null)).isEqualTo(200);
        assertThat(PortionSize.LARGE.calculateGrams(null)).isEqualTo(300);
    }

    @ParameterizedTest
    @DisplayName("fromString should parse portion sizes correctly")
    @CsvSource({
        "small, SMALL",
        "SMALL, SMALL",
        "Small, SMALL",
        "medium, MEDIUM",
        "MEDIUM, MEDIUM",
        "large, LARGE",
        "LARGE, LARGE"
    })
    void fromStringParsesCorrectly(String input, String expected) {
        assertThat(PortionSize.fromString(input)).isEqualTo(PortionSize.valueOf(expected));
    }

    @Test
    @DisplayName("fromString should return MEDIUM for null or invalid")
    void fromStringReturnsDefaultForInvalid() {
        assertThat(PortionSize.fromString(null)).isEqualTo(PortionSize.MEDIUM);
        assertThat(PortionSize.fromString("")).isEqualTo(PortionSize.MEDIUM);
        assertThat(PortionSize.fromString("   ")).isEqualTo(PortionSize.MEDIUM);
        assertThat(PortionSize.fromString("extra_large")).isEqualTo(PortionSize.MEDIUM);
        assertThat(PortionSize.fromString("xl")).isEqualTo(PortionSize.MEDIUM);
    }

    @Test
    @DisplayName("getDisplayName should return lowercase name")
    void getDisplayNameReturnsLowercase() {
        assertThat(PortionSize.SMALL.getDisplayName()).isEqualTo("small");
        assertThat(PortionSize.MEDIUM.getDisplayName()).isEqualTo("medium");
        assertThat(PortionSize.LARGE.getDisplayName()).isEqualTo("large");
    }

    @Test
    @DisplayName("getDetailedDescription should include gram examples")
    void getDetailedDescriptionIncludesExamples() {
        String smallDesc = PortionSize.SMALL.getDetailedDescription();
        assertThat(smallDesc).contains("50g"); // leafy veg
        assertThat(smallDesc).contains("100g"); // carbs
        assertThat(smallDesc).contains("120g"); // meat
        assertThat(smallDesc).contains("10g"); // fats

        String mediumDesc = PortionSize.MEDIUM.getDetailedDescription();
        assertThat(mediumDesc).contains("100g"); // leafy veg
        assertThat(mediumDesc).contains("200g"); // carbs/meat
        assertThat(mediumDesc).contains("20g"); // fats
    }

    @Test
    @DisplayName("Real-world scenario: butter vs steak portions")
    void realWorldScenario_ButterVsSteak() {
        // A "large" portion of butter should be much smaller than a "small" portion of steak
        int largeButter = PortionSize.LARGE.calculateGrams(FoodDensityCategory.FATS_DRESSING);
        int smallSteak = PortionSize.SMALL.calculateGrams(FoodDensityCategory.MEAT_MAIN);

        assertThat(largeButter).isEqualTo(40);
        assertThat(smallSteak).isEqualTo(120);
        assertThat(largeButter).isLessThan(smallSteak);
    }

    @Test
    @DisplayName("Real-world scenario: salad vs soup portions")
    void realWorldScenario_SaladVsSoup() {
        // A large salad (leafy) is smaller in grams than a large soup
        int largeSalad = PortionSize.LARGE.calculateGrams(FoodDensityCategory.LEAFY_VEG);
        int largeSoup = PortionSize.LARGE.calculateGrams(FoodDensityCategory.LIQUID_SOUP);

        assertThat(largeSalad).isEqualTo(200);
        assertThat(largeSoup).isEqualTo(500);
        assertThat(largeSoup).isGreaterThan(largeSalad);
    }

    @Test
    @DisplayName("Real-world scenario: rice side dish vs main course")
    void realWorldScenario_RiceSideVsMain() {
        // A small portion of carbs (side dish rice) should be reasonable
        int smallRice = PortionSize.SMALL.calculateGrams(FoodDensityCategory.CARB_STAPLE);
        int largeRice = PortionSize.LARGE.calculateGrams(FoodDensityCategory.CARB_STAPLE);

        assertThat(smallRice).isEqualTo(100);
        assertThat(largeRice).isEqualTo(350);
    }
}
