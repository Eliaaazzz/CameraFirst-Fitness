package com.fitnessapp.backend.nutrition.service.core;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import com.fitnessapp.backend.nutrition.enums.FoodDensityCategory;

@DisplayName("FoodCategoryClassifier Tests")
class FoodCategoryClassifierTest {

    private final FoodCategoryClassifier classifier = new FoodCategoryClassifier();

    @ParameterizedTest
    @DisplayName("classifies common foods into the right density category")
    @CsvSource({
        "Caesar salad, LEAFY_VEG",
        "Steamed white rice, CARB_STAPLE",
        "Whole wheat bagel, CARB_STAPLE",
        "Grilled chicken breast, MEAT_MAIN",
        "Salmon fillet, MEAT_MAIN",
        "Beef stew, LIQUID_SOUP",
        "Chicken noodle soup, LIQUID_SOUP",
        "Olive oil drizzle, FATS_DRESSING",
        "Ranch dressing, FATS_DRESSING",
        "Fresh strawberries, FRUIT",
        "Greek yogurt, DAIRY",
        "Potato chips, SNACK",
        "Almond handful, SNACK",
        "Orange juice, BEVERAGE",
        "Minced garlic, GARNISH",
        "Fried rice, MIXED_DISH"
    })
    void classifiesCommonFoods(String name, String expected) {
        assertThat(classifier.classify(name)).isEqualTo(FoodDensityCategory.valueOf(expected));
    }

    @Test
    @DisplayName("compound cues win over the staples they contain (fried rice != rice)")
    void compoundCuesTakePrecedence() {
        assertThat(classifier.classify("fried rice")).isEqualTo(FoodDensityCategory.MIXED_DISH);
        assertThat(classifier.classify("chicken curry")).isEqualTo(FoodDensityCategory.MIXED_DISH);
        // plain rice still resolves to the staple
        assertThat(classifier.classify("jasmine rice")).isEqualTo(FoodDensityCategory.CARB_STAPLE);
    }

    @Test
    @DisplayName("unknown / null / blank names fall back to GENERIC")
    void unknownFallsBackToGeneric() {
        assertThat(classifier.classify(null)).isEqualTo(FoodDensityCategory.GENERIC);
        assertThat(classifier.classify("")).isEqualTo(FoodDensityCategory.GENERIC);
        assertThat(classifier.classify("   ")).isEqualTo(FoodDensityCategory.GENERIC);
        assertThat(classifier.classify("zorblax surprise")).isEqualTo(FoodDensityCategory.GENERIC);
    }

    @Test
    @DisplayName("densityGramsPerCm3 mirrors the classified category's density")
    void densityMirrorsCategory() {
        assertThat(classifier.densityGramsPerCm3("Caesar salad"))
            .isEqualTo(FoodDensityCategory.LEAFY_VEG.getGramsPerCm3());
        assertThat(classifier.densityGramsPerCm3("mystery goo"))
            .isEqualTo(FoodDensityCategory.GENERIC.getGramsPerCm3());
    }
}
