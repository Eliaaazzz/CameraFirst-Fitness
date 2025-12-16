package com.fitnessapp.backend.nutrition.enums;

/**
 * Food density categories for accurate portion size estimation.
 *
 * Different food types have vastly different densities and typical serving sizes.
 * A "medium portion" of salad is much lighter than a "medium portion" of steak.
 * This enum provides category-specific gram ranges for portion size calculations.
 *
 * The AI vision model classifies foods into these categories, and the portion
 * size (S/M/L) is then mapped to category-specific gram values.
 */
public enum FoodDensityCategory {

    /**
     * Low density, high volume foods.
     * Examples: Salads, Spinach, Lettuce, Mixed greens
     * Range: 50g (small side salad) - 200g (large salad bowl)
     */
    LEAFY_VEG("leafy_veg", 50, 100, 200, "Low-density leafy vegetables"),

    /**
     * Medium density carbohydrate staples.
     * Examples: Rice, Pasta, Potatoes, Bread, Noodles
     * Range: 100g (small side) - 350g (large main portion)
     */
    CARB_STAPLE("carb_staple", 100, 200, 350, "Carbohydrate staples"),

    /**
     * High density solid proteins.
     * Examples: Steak, Chicken breast, Fish fillet, Pork chop
     * Range: 120g (small cut) - 350g (large main dish)
     */
    MEAT_MAIN("meat_main", 120, 200, 350, "Meat and protein mains"),

    /**
     * High volume liquid-based foods.
     * Examples: Soups, Stews, Broths, Curries with liquid
     * Range: 200g (cup) - 500g (large bowl)
     */
    LIQUID_SOUP("liquid_soup", 200, 350, 500, "Soups and liquid-based dishes"),

    /**
     * Calorie-dense fats and condiments.
     * Examples: Butter, Oil, Mayo, Dressings, Sauces
     * Range: 10g (light drizzle) - 40g (generous portion)
     */
    FATS_DRESSING("fats_dressing", 10, 20, 40, "Fats, oils, and dressings"),

    /**
     * Garnishes, aromatics, and small condiment additions.
     * Examples: Garlic, Ginger, Fresh herbs, Chili, Scallions, Cilantro
     * These are used in small quantities for flavor, not as main ingredients.
     * Range: 3g (single clove) - 20g (generous garnish)
     */
    GARNISH("garnish", 3, 10, 20, "Garnishes and aromatics"),

    /**
     * Mixed dishes with multiple components.
     * Examples: Stir-fry, Fried rice, Buddha bowl, Bento box
     * Range: 150g (small) - 400g (large)
     */
    MIXED_DISH("mixed_dish", 150, 300, 450, "Mixed dishes and combination meals"),

    /**
     * Fruits (varying density).
     * Examples: Apple, Banana, Berries, Melon
     * Range: 80g (small fruit) - 250g (large serving)
     */
    FRUIT("fruit", 80, 150, 250, "Fruits"),

    /**
     * Dairy products.
     * Examples: Milk, Yogurt, Cheese
     * Range: 100g (small serving) - 300g (large serving)
     */
    DAIRY("dairy", 100, 200, 300, "Dairy products"),

    /**
     * Snacks and small bites.
     * Examples: Chips, Crackers, Nuts, Small pastries
     * Range: 30g (small handful) - 100g (large snack)
     */
    SNACK("snack", 30, 60, 100, "Snacks and small bites"),

    /**
     * Beverages (non-water).
     * Examples: Juice, Smoothie, Coffee drinks, Milk
     * Range: 200ml (small cup) - 500ml (large glass)
     */
    BEVERAGE("beverage", 200, 350, 500, "Beverages"),

    /**
     * Default fallback for unclassified foods.
     * Uses moderate range suitable for typical meal portions.
     * Range: 100g - 300g
     */
    GENERIC("generic", 100, 200, 300, "Generic food item");

    private final String displayName;
    private final int smallGrams;
    private final int mediumGrams;
    private final int largeGrams;
    private final String description;

    FoodDensityCategory(String displayName, int smallGrams, int mediumGrams, int largeGrams, String description) {
        this.displayName = displayName;
        this.smallGrams = smallGrams;
        this.mediumGrams = mediumGrams;
        this.largeGrams = largeGrams;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getSmallGrams() {
        return smallGrams;
    }

    public int getMediumGrams() {
        return mediumGrams;
    }

    public int getLargeGrams() {
        return largeGrams;
    }

    public String getDescription() {
        return description;
    }

    /**
     * Get grams for a specific portion size within this category.
     *
     * @param portionSize The portion size (SMALL, MEDIUM, LARGE)
     * @return Grams appropriate for this category and portion size
     */
    public int getGramsForPortion(PortionSize portionSize) {
        if (portionSize == null) {
            return mediumGrams;
        }
        return switch (portionSize) {
            case SMALL -> smallGrams;
            case MEDIUM -> mediumGrams;
            case LARGE -> largeGrams;
        };
    }

    /**
     * Parse density category from string (case-insensitive).
     *
     * @param value String value to parse
     * @return Matching FoodDensityCategory or GENERIC if not found
     */
    public static FoodDensityCategory fromString(String value) {
        if (value == null || value.isBlank()) {
            return GENERIC;
        }

        String normalized = value.toLowerCase().trim().replace("-", "_").replace(" ", "_");

        for (FoodDensityCategory category : values()) {
            if (category.displayName.equalsIgnoreCase(normalized) ||
                category.name().equalsIgnoreCase(normalized)) {
                return category;
            }
        }

        return GENERIC;
    }

    /**
     * Get the gram range as a human-readable string.
     */
    public String getGramRange() {
        return String.format("%dg - %dg", smallGrams, largeGrams);
    }
}
