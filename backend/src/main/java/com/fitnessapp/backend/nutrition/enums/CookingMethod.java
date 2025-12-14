package com.fitnessapp.backend.nutrition.enums;

/**
 * Enumeration of cooking methods for food analysis.
 * Used to match against USDA database entries and apply cooking multipliers.
 */
public enum CookingMethod {
    /**
     * Raw/uncooked - baseline nutrition values apply directly.
     */
    RAW("raw", "uncooked", 1.0),

    /**
     * Steamed - minimal nutrient change, slight water absorption possible.
     */
    STEAMED("steamed", "steam", 1.0),

    /**
     * Boiled - some nutrient leaching into water, minimal calorie change.
     */
    BOILED("boiled", "cooked", 1.0),

    /**
     * Grilled/Broiled - significant water loss (20-30%), concentrates calories.
     * Meat loses moisture, so per-gram calorie density increases.
     */
    GRILLED("grilled", "broiled", 1.3),

    /**
     * Roasted/Baked - significant water loss (25-35%), concentrates calories.
     * Similar to grilling, dry heat causes moisture evaporation.
     */
    ROASTED("roasted", "baked", 1.3),

    /**
     * Deep-fried - oil absorption + water loss, significant calorie increase.
     * Foods absorb oil while losing moisture.
     */
    FRIED("fried", "deep-fried", 1.5),

    /**
     * Stir-fried/Pan-fried - moderate oil absorption, some water loss.
     * Less oil than deep frying, but still significant.
     */
    STIR_FRIED("stir-fried", "pan-fried", 1.3),

    /**
     * Breaded/Battered - coating adds carbs + oil absorption.
     * Combination of batter/breading calories and frying.
     */
    BREADED("breaded", "battered", 1.6),

    /**
     * Processed/Prepared - varies widely, use base multiplier.
     */
    PROCESSED("processed", "prepared", 1.0),

    /**
     * Unknown cooking method - conservative estimate.
     */
    UNKNOWN("unknown", "", 1.0);

    private final String displayName;
    private final String alternativeName;
    private final double calorieMultiplier;

    CookingMethod(String displayName, String alternativeName, double calorieMultiplier) {
        this.displayName = displayName;
        this.alternativeName = alternativeName;
        this.calorieMultiplier = calorieMultiplier;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getAlternativeName() {
        return alternativeName;
    }

    /**
     * Get the calorie multiplier for this cooking method.
     * Used when exact cooked entry is not found in database.
     */
    public double getCalorieMultiplier() {
        return calorieMultiplier;
    }

    /**
     * Parse cooking method from string (case-insensitive).
     */
    public static CookingMethod fromString(String value) {
        if (value == null || value.isBlank()) {
            return UNKNOWN;
        }
        
        String normalized = value.toLowerCase().trim();
        
        for (CookingMethod method : values()) {
            if (method.displayName.equalsIgnoreCase(normalized) ||
                method.alternativeName.equalsIgnoreCase(normalized) ||
                method.name().equalsIgnoreCase(normalized)) {
                return method;
            }
        }
        
        return UNKNOWN;
    }

    /**
     * Check if a database entry description matches this cooking method.
     */
    public boolean matchesDescription(String description) {
        if (description == null) {
            return false;
        }
        
        String lowerDesc = description.toLowerCase();
        return lowerDesc.contains(displayName.toLowerCase()) ||
               (!alternativeName.isEmpty() && lowerDesc.contains(alternativeName.toLowerCase()));
    }
}
