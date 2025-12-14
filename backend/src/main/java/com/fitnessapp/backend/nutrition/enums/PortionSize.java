package com.fitnessapp.backend.nutrition.enums;

/**
 * Portion size levels for food estimation.
 * Used when exact grams are not provided.
 *
 * The actual gram value depends on the food's density category.
 * Use {@link #calculateGrams(FoodDensityCategory)} to get category-specific grams.
 */
public enum PortionSize {
    SMALL("small", "Small portion (light meal or side)"),
    MEDIUM("medium", "Medium portion (standard meal)"),
    LARGE("large", "Large portion (generous meal)");

    private final String displayName;
    private final String description;

    PortionSize(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Calculate grams for this portion size using GENERIC category.
     * Prefer using {@link #calculateGrams(FoodDensityCategory)} for accurate results.
     *
     * @return Grams using generic category defaults (100/200/300g for S/M/L)
     */
    public int calculateGrams() {
        return calculateGrams(FoodDensityCategory.GENERIC);
    }

    /**
     * Calculate grams based on food density category.
     * This is the primary method to use for accurate portion estimation.
     *
     * @param category The food density category (e.g., LEAFY_VEG, MEAT_MAIN)
     * @return Grams appropriate for this portion size and category
     */
    public int calculateGrams(FoodDensityCategory category) {
        if (category == null) {
            category = FoodDensityCategory.GENERIC;
        }
        return category.getGramsForPortion(this);
    }

    /**
     * Get a description including example gram ranges for different categories.
     *
     * @return Detailed description with gram examples
     */
    public String getDetailedDescription() {
        return switch (this) {
            case SMALL -> "Small: Leafy veg ~50g, Carbs ~100g, Meat ~120g, Fats ~10g";
            case MEDIUM -> "Medium: Leafy veg ~100g, Carbs ~200g, Meat ~200g, Fats ~20g";
            case LARGE -> "Large: Leafy veg ~200g, Carbs ~350g, Meat ~350g, Fats ~40g";
        };
    }

    /**
     * Parse portion size from string.
     *
     * @param value String value (case-insensitive)
     * @return PortionSize or MEDIUM if not recognized
     */
    public static PortionSize fromString(String value) {
        if (value == null || value.isBlank()) {
            return MEDIUM;
        }

        String normalized = value.toLowerCase().trim();
        for (PortionSize size : values()) {
            if (size.displayName.equalsIgnoreCase(normalized) ||
                size.name().equalsIgnoreCase(normalized)) {
                return size;
            }
        }

        return MEDIUM; // Default to medium
    }
}
