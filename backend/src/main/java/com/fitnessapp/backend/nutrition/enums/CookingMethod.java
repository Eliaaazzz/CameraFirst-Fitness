package com.fitnessapp.backend.nutrition.enums;

/**
 * Enumeration of cooking methods for food analysis.
 * Used to match against USDA database entries and apply cooking multipliers.
 */
public enum CookingMethod {
    RAW("raw", "uncooked", 1.0),
    STEAMED("steamed", "steam", 1.0),
    BOILED("boiled", "cooked", 1.0),
    GRILLED("grilled", "broiled", 1.1),
    ROASTED("roasted", "baked", 1.1),
    FRIED("fried", "deep-fried", 1.3),
    STIR_FRIED("stir-fried", "pan-fried", 1.2),
    BREADED("breaded", "battered", 1.4),
    PROCESSED("processed", "prepared", 1.0),
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
