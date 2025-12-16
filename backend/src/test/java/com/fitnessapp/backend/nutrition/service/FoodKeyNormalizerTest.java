package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.service.core.FoodKeyNormalizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for FoodKeyNormalizer
 */
@DisplayName("FoodKeyNormalizer Tests")
class FoodKeyNormalizerTest {

    private FoodKeyNormalizer normalizer;

    @BeforeEach
    void setUp() {
        normalizer = new FoodKeyNormalizer();
    }

    // ============ Basic Normalization Tests ============

    @Test
    @DisplayName("Should handle null input")
    void testNormalize_Null() {
        assertThat(normalizer.normalize(null)).isEqualTo("unknown");
    }

    @Test
    @DisplayName("Should handle empty input")
    void testNormalize_Empty() {
        assertThat(normalizer.normalize("")).isEqualTo("unknown");
        assertThat(normalizer.normalize("   ")).isEqualTo("unknown");
    }

    @Test
    @DisplayName("Should convert to lowercase")
    void testNormalize_Lowercase() {
        assertThat(normalizer.normalize("FRIED_RICE")).isEqualTo("fried_rice");
        assertThat(normalizer.normalize("Steamed Rice")).isEqualTo("steamed_rice");
    }

    @Test
    @DisplayName("Should replace spaces with underscores")
    void testNormalize_SpacesToUnderscores() {
        assertThat(normalizer.normalize("fried rice")).isEqualTo("fried_rice");
        assertThat(normalizer.normalize("beef stir fry")).isEqualTo("beef_stir_fry");
    }

    @Test
    @DisplayName("Should remove special characters")
    void testNormalize_RemoveSpecialChars() {
        assertThat(normalizer.normalize("fried-rice")).isEqualTo("fried_rice");
        assertThat(normalizer.normalize("chicken (grilled)")).isEqualTo("chicken_grilled");
        assertThat(normalizer.normalize("beef @ home")).isEqualTo("beef_home");
    }

    @Test
    @DisplayName("Should collapse multiple underscores")
    void testNormalize_CollapseUnderscores() {
        assertThat(normalizer.normalize("fried__rice")).isEqualTo("fried_rice");
        assertThat(normalizer.normalize("beef___stir___fry")).isEqualTo("beef_stir_fry");
    }

    // ============ Phrase Mapping Tests ============

    @ParameterizedTest
    @CsvSource({
        "white rice, steamed_rice",
        "plain rice, steamed_rice",
        "cooked rice, steamed_rice",
        "egg fried rice, fried_rice",
        "yangzhou fried rice, fried_rice"
    })
    @DisplayName("Should map rice variations to canonical form")
    void testNormalize_RiceVariations(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "stir fry vegetables, stir_fried_vegetables",
        "stir fried vegetables, stir_fried_vegetables",
        "mixed vegetables, stir_fried_vegetables",
        "sauteed vegetables, stir_fried_vegetables"
    })
    @DisplayName("Should map vegetable variations to canonical form")
    void testNormalize_VegetableVariations(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "hard boiled egg, boiled_egg",
        "soft boiled egg, boiled_egg",
        "sunny side up, fried_egg",
        "over easy, fried_egg",
        "scrambled eggs, scrambled_egg",
        "tomato and egg, tomato_egg",
        "egg and tomato, tomato_egg"
    })
    @DisplayName("Should map egg variations to canonical form")
    void testNormalize_EggVariations(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "braised pork belly, braised_pork",
        "red cooked pork, braised_pork",
        "dongpo pork, braised_pork",
        "pork belly, braised_pork"
    })
    @DisplayName("Should map pork variations to canonical form")
    void testNormalize_PorkVariations(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "kung pao chicken, kung_pao_chicken",
        "gong bao chicken, kung_pao_chicken",
        "grilled chicken, chicken_breast",
        "chicken fillet, chicken_breast"
    })
    @DisplayName("Should map chicken variations to canonical form")
    void testNormalize_ChickenVariations(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    // ============ Chinese Phrase Mapping Tests ============

    @ParameterizedTest
    @CsvSource({
        "番茄炒蛋, tomato_egg",
        "西红柿炒蛋, tomato_egg",
        "红烧肉, braised_pork",
        "东坡肉, braised_pork",
        "宫保鸡丁, kung_pao_chicken",
        "宫爆鸡丁, kung_pao_chicken",
        "麻婆豆腐, mapo_tofu",
        "蛋炒饭, fried_rice",
        "扬州炒饭, fried_rice",
        "白米饭, steamed_rice",
        "米饭, steamed_rice",
        "白饭, steamed_rice"
    })
    @DisplayName("Should map Chinese food names to canonical form")
    void testNormalize_ChineseNames(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    // ============ Spelling Correction Tests ============

    @ParameterizedTest
    @CsvSource({
        "vegatable, vegetable",
        "vegatables, vegetables",
        "chiken, chicken",
        "chickin, chicken",
        "beaf, beef",
        "boild, boiled",
        "scrambed, scrambled"
    })
    @DisplayName("Should correct common misspellings")
    void testNormalize_SpellingCorrections(String input, String expected) {
        assertThat(normalizer.normalize(input)).isEqualTo(expected);
    }

    // ============ Filler Word Removal Tests ============

    @Test
    @DisplayName("Should remove filler words")
    void testNormalize_FillerWords() {
        assertThat(normalizer.normalize("bowl of rice")).isEqualTo("steamed_rice");
        assertThat(normalizer.normalize("chicken with sauce")).isEqualTo("chicken_sauce");
        assertThat(normalizer.normalize("a bowl of noodles")).isEqualTo("bowl_noodles");
    }

    // ============ Similarity Calculation Tests ============

    @Test
    @DisplayName("Should calculate similarity correctly")
    void testCalculateSimilarity() {
        // Exact match
        assertThat(normalizer.calculateSimilarity("fried_rice", "fried_rice")).isEqualTo(1.0);
        
        // Similar strings
        double similarity = normalizer.calculateSimilarity("fried_rice", "fried rice");
        assertThat(similarity).isEqualTo(1.0); // After normalization, they're the same
        
        // Different strings
        similarity = normalizer.calculateSimilarity("fried_rice", "steamed_rice");
        assertThat(similarity).isLessThan(1.0);
        assertThat(similarity).isGreaterThan(0.5); // Still somewhat similar
        
        // Very different strings
        similarity = normalizer.calculateSimilarity("chicken", "tofu");
        assertThat(similarity).isLessThan(0.5);
    }

    @Test
    @DisplayName("Should handle null in similarity calculation")
    void testCalculateSimilarity_Null() {
        assertThat(normalizer.calculateSimilarity(null, "test")).isEqualTo(0.0);
        assertThat(normalizer.calculateSimilarity("test", null)).isEqualTo(0.0);
        assertThat(normalizer.calculateSimilarity(null, null)).isEqualTo(0.0);
    }

    // ============ Pattern Matching Tests ============

    @Test
    @DisplayName("Should match patterns with wildcards")
    void testMatchesPattern() {
        assertThat(normalizer.matchesPattern("fried_rice", "fried*")).isTrue();
        assertThat(normalizer.matchesPattern("fried_rice", "*rice")).isTrue();
        assertThat(normalizer.matchesPattern("fried_rice", "fried_rice")).isTrue();
        assertThat(normalizer.matchesPattern("fried_rice", "steamed*")).isFalse();
    }

    // ============ Edge Cases ============

    @Test
    @DisplayName("Should handle diacritics")
    void testNormalize_Diacritics() {
        assertThat(normalizer.normalize("crème brûlée")).isEqualTo("creme_brulee");
        assertThat(normalizer.normalize("café")).isEqualTo("cafe");
    }

    @Test
    @DisplayName("Should preserve numbers")
    void testNormalize_Numbers() {
        assertThat(normalizer.normalize("dish 1")).isEqualTo("dish_1");
        assertThat(normalizer.normalize("type2")).isEqualTo("type2");
    }

    @Test
    @DisplayName("Should handle mixed content")
    void testNormalize_MixedContent() {
        assertThat(normalizer.normalize("Beef Stir-Fry #1")).isEqualTo("beef_stir_fry_1");
    }
}
