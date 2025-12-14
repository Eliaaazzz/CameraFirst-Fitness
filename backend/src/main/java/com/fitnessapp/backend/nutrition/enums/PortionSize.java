package com.fitnessapp.backend.nutrition.enums;

/**
 * Portion size levels for food estimation.
 * Used when exact grams are not provided.
 */
public enum PortionSize {
    SMALL("small", 0.7, "Small portion (e.g., 70g for 100g standard)"),
    MEDIUM("medium", 1.0, "Medium/standard portion (100g standard)"),
    LARGE("large", 1.5, "Large portion (e.g., 150g for 100g standard)");
    
    private final String displayName;
    private final double multiplier;
    private final String description;
    
    PortionSize(String displayName, double multiplier, String description) {
        this.displayName = displayName;
        this.multiplier = multiplier;
        this.description = description;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public double getMultiplier() {
        return multiplier;
    }
    
    public String getDescription() {
        return description;
    }
    
    /**
     * Calculate grams based on portion size and standard serving (100g).
     * 
     * @param standardGrams The standard serving size (typically 100g)
     * @return Actual grams for this portion size
     */
    public int calculateGrams(int standardGrams) {
        return (int) (standardGrams * multiplier);
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
