package com.fitnessapp.backend.nutrition.enums;

/**
 * Portion size levels for food estimation.
 * Used when exact grams are not provided.
 * 
 * Sizes reflect typical meal portions, not ingredient measurements.
 * Based on typical restaurant/home meal servings.
 */
public enum PortionSize {
    SMALL("small", 150, "Small portion (~150g, light meal or side)"),
    MEDIUM("medium", 250, "Medium portion (~250g, standard meal)"),
    LARGE("large", 350, "Large portion (~350g, generous meal)");
    
    private final String displayName;
    private final int baseGrams;
    private final String description;
    
    PortionSize(String displayName, int baseGrams, String description) {
        this.displayName = displayName;
        this.baseGrams = baseGrams;
        this.description = description;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public int getBaseGrams() {
        return baseGrams;
    }
    
    public String getDescription() {
        return description;
    }
    
    /**
     * Get the grams for this portion size.
     * 
     * @return Grams for this portion size
     */
    public int calculateGrams() {
        return baseGrams;
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
