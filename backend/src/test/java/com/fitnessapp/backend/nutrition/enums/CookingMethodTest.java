package com.fitnessapp.backend.nutrition.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for CookingMethod enum
 */
@DisplayName("CookingMethod Enum Tests")
class CookingMethodTest {

    @Test
    @DisplayName("Should parse cooking method from display name")
    void shouldParseFromDisplayName() {
        assertThat(CookingMethod.fromString("fried")).isEqualTo(CookingMethod.FRIED);
        assertThat(CookingMethod.fromString("steamed")).isEqualTo(CookingMethod.STEAMED);
        assertThat(CookingMethod.fromString("grilled")).isEqualTo(CookingMethod.GRILLED);
        assertThat(CookingMethod.fromString("raw")).isEqualTo(CookingMethod.RAW);
    }

    @Test
    @DisplayName("Should parse cooking method from alternative name")
    void shouldParseFromAlternativeName() {
        assertThat(CookingMethod.fromString("deep-fried")).isEqualTo(CookingMethod.FRIED);
        assertThat(CookingMethod.fromString("broiled")).isEqualTo(CookingMethod.GRILLED);
        assertThat(CookingMethod.fromString("pan-fried")).isEqualTo(CookingMethod.STIR_FRIED);
        assertThat(CookingMethod.fromString("battered")).isEqualTo(CookingMethod.BREADED);
    }

    @Test
    @DisplayName("Should parse cooking method from enum name")
    void shouldParseFromEnumName() {
        assertThat(CookingMethod.fromString("FRIED")).isEqualTo(CookingMethod.FRIED);
        assertThat(CookingMethod.fromString("STIR_FRIED")).isEqualTo(CookingMethod.STIR_FRIED);
        assertThat(CookingMethod.fromString("BREADED")).isEqualTo(CookingMethod.BREADED);
    }

    @Test
    @DisplayName("Should be case insensitive")
    void shouldBeCaseInsensitive() {
        assertThat(CookingMethod.fromString("FRIED")).isEqualTo(CookingMethod.FRIED);
        assertThat(CookingMethod.fromString("Fried")).isEqualTo(CookingMethod.FRIED);
        assertThat(CookingMethod.fromString("fried")).isEqualTo(CookingMethod.FRIED);
    }

    @Test
    @DisplayName("Should return UNKNOWN for null or empty string")
    void shouldReturnUnknownForNullOrEmpty() {
        assertThat(CookingMethod.fromString(null)).isEqualTo(CookingMethod.UNKNOWN);
        assertThat(CookingMethod.fromString("")).isEqualTo(CookingMethod.UNKNOWN);
        assertThat(CookingMethod.fromString("   ")).isEqualTo(CookingMethod.UNKNOWN);
    }

    @Test
    @DisplayName("Should return UNKNOWN for unrecognized value")
    void shouldReturnUnknownForUnrecognized() {
        assertThat(CookingMethod.fromString("xyz123")).isEqualTo(CookingMethod.UNKNOWN);
        assertThat(CookingMethod.fromString("microwaved")).isEqualTo(CookingMethod.UNKNOWN);
    }

    @Test
    @DisplayName("Should have correct calorie multipliers")
    void shouldHaveCorrectCalorieMultipliers() {
        assertThat(CookingMethod.RAW.getCalorieMultiplier()).isEqualTo(1.0);
        assertThat(CookingMethod.STEAMED.getCalorieMultiplier()).isEqualTo(1.0);
        assertThat(CookingMethod.BOILED.getCalorieMultiplier()).isEqualTo(1.0);
        assertThat(CookingMethod.GRILLED.getCalorieMultiplier()).isEqualTo(1.3);
        assertThat(CookingMethod.ROASTED.getCalorieMultiplier()).isEqualTo(1.3);
        assertThat(CookingMethod.STIR_FRIED.getCalorieMultiplier()).isEqualTo(1.3);
        assertThat(CookingMethod.FRIED.getCalorieMultiplier()).isEqualTo(1.5);
        assertThat(CookingMethod.BREADED.getCalorieMultiplier()).isEqualTo(1.6);
    }

    @Test
    @DisplayName("Should match description containing cooking method")
    void shouldMatchDescription() {
        assertThat(CookingMethod.FRIED.matchesDescription("Chicken, fried, with skin")).isTrue();
        assertThat(CookingMethod.FRIED.matchesDescription("Deep-fried chicken nuggets")).isTrue();
        assertThat(CookingMethod.GRILLED.matchesDescription("Salmon, grilled")).isTrue();
        assertThat(CookingMethod.GRILLED.matchesDescription("Broiled fish fillet")).isTrue();
        assertThat(CookingMethod.STEAMED.matchesDescription("Steamed vegetables")).isTrue();
    }

    @Test
    @DisplayName("Should not match description without cooking method")
    void shouldNotMatchDescriptionWithoutMethod() {
        assertThat(CookingMethod.FRIED.matchesDescription("Chicken breast, raw")).isFalse();
        assertThat(CookingMethod.GRILLED.matchesDescription("Raw salmon fillet")).isFalse();
        assertThat(CookingMethod.STEAMED.matchesDescription(null)).isFalse();
    }

    @Test
    @DisplayName("Should have correct display names")
    void shouldHaveCorrectDisplayNames() {
        assertThat(CookingMethod.FRIED.getDisplayName()).isEqualTo("fried");
        assertThat(CookingMethod.STEAMED.getDisplayName()).isEqualTo("steamed");
        assertThat(CookingMethod.GRILLED.getDisplayName()).isEqualTo("grilled");
        assertThat(CookingMethod.RAW.getDisplayName()).isEqualTo("raw");
    }

    @Test
    @DisplayName("Should have correct alternative names")
    void shouldHaveCorrectAlternativeNames() {
        assertThat(CookingMethod.FRIED.getAlternativeName()).isEqualTo("deep-fried");
        assertThat(CookingMethod.GRILLED.getAlternativeName()).isEqualTo("broiled");
        assertThat(CookingMethod.STIR_FRIED.getAlternativeName()).isEqualTo("pan-fried");
        assertThat(CookingMethod.RAW.getAlternativeName()).isEqualTo("uncooked");
    }
}
