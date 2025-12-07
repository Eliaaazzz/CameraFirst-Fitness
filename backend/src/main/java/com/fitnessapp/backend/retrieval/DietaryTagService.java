package com.fitnessapp.backend.retrieval;

import com.fitnessapp.backend.recipe.entity.Recipe;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service for detecting and managing dietary tags on recipes
 * Tags include: vegan, vegetarian, gluten-free, keto, low-carb, high-protein, etc.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DietaryTagService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    // Animal products for vegan detection
    private static final Set<String> ANIMAL_PRODUCTS = Set.of(
            "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp",
            "turkey", "egg", "eggs", "milk", "cheese", "butter", "yogurt",
            "cream", "bacon", "ham", "steak", "lamb", "duck", "honey",
            "gelatin", "lard", "whey"
    );

    // Meat products (for vegetarian detection)
    private static final Set<String> MEAT_PRODUCTS = Set.of(
            "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp",
            "turkey", "bacon", "ham", "steak", "lamb", "duck", "meat", "seafood"
    );

    // Gluten sources
    private static final Set<String> GLUTEN_SOURCES = Set.of(
            "wheat", "bread", "pasta", "flour", "barley", "rye", "couscous",
            "noodles", "soy sauce", "beer", "cereal", "cracker", "tortilla",
            "bun", "roll"
    );

    // Dairy products
    private static final Set<String> DAIRY_PRODUCTS = Set.of(
            "milk", "cheese", "butter", "yogurt", "cream", "whey",
            "lactose", "curd", "ghee"
    );

    /**
     * Detect all applicable dietary tags for a recipe
     */
    public Set<String> detectTags(Recipe recipe) {
        Set<String> tags = new HashSet<>();

        // Get ingredient names
        List<String> ingredients = recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getName().toLowerCase())
                .toList();

        // Get nutrition data
        Map<String, Object> nutrition = parseNutrition(recipe.getNutritionSummary());

        // Vegan detection (no animal products)
        boolean hasAnimalProducts = ingredients.stream()
                .anyMatch(ing -> ANIMAL_PRODUCTS.stream()
                        .anyMatch(animal -> ing.contains(animal)));
        if (!hasAnimalProducts && !ingredients.isEmpty()) {
            tags.add("vegan");
            tags.add("vegetarian");
            log.debug("Recipe '{}' tagged as vegan", recipe.getTitle());
        }

        // Vegetarian (no meat, but allows dairy/eggs)
        boolean hasMeat = ingredients.stream()
                .anyMatch(ing -> MEAT_PRODUCTS.stream()
                        .anyMatch(meat -> ing.contains(meat)));
        if (!hasMeat && hasAnimalProducts && !ingredients.isEmpty()) {
            tags.add("vegetarian");
            log.debug("Recipe '{}' tagged as vegetarian", recipe.getTitle());
        }

        // Gluten-free detection
        boolean hasGluten = ingredients.stream()
                .anyMatch(ing -> GLUTEN_SOURCES.stream()
                        .anyMatch(gluten -> ing.contains(gluten)));
        if (!hasGluten && !ingredients.isEmpty()) {
            tags.add("gluten-free");
            log.debug("Recipe '{}' tagged as gluten-free", recipe.getTitle());
        }

        // Dairy-free detection
        boolean hasDairy = ingredients.stream()
                .anyMatch(ing -> DAIRY_PRODUCTS.stream()
                        .anyMatch(dairy -> ing.contains(dairy)));
        if (!hasDairy && !ingredients.isEmpty()) {
            tags.add("dairy-free");
            log.debug("Recipe '{}' tagged as dairy-free", recipe.getTitle());
        }

        // Keto (low carb, high fat)
        Number carbs = (Number) nutrition.get("carbs");
        Number fat = (Number) nutrition.get("fat");
        if (carbs != null && fat != null) {
            if (carbs.floatValue() < 20 && fat.floatValue() > 15) {
                tags.add("keto");
                tags.add("low-carb");
                log.debug("Recipe '{}' tagged as keto", recipe.getTitle());
            }
        }

        // Low-carb (but not necessarily keto)
        if (carbs != null && carbs.floatValue() < 30 && !tags.contains("keto")) {
            tags.add("low-carb");
            log.debug("Recipe '{}' tagged as low-carb", recipe.getTitle());
        }

        // High protein
        Number protein = (Number) nutrition.get("protein");
        if (protein != null && protein.floatValue() >= 30) {
            tags.add("high-protein");
            log.debug("Recipe '{}' tagged as high-protein", recipe.getTitle());
        }

        // Low calorie
        Number calories = (Number) nutrition.get("calories");
        if (calories != null && calories.intValue() < 400) {
            tags.add("low-calorie");
            log.debug("Recipe '{}' tagged as low-calorie", recipe.getTitle());
        }

        return tags;
    }

    /**
     * Update recipe dietary tags in database
     */
    @Transactional
    public void updateRecipeTags(UUID recipeId, Set<String> tags) {
        String[] tagArray = tags.toArray(new String[0]);
        jdbcTemplate.update(
                "UPDATE recipe SET dietary_tags = ? WHERE id = ?",
                tagArray, recipeId
        );
        log.info("Updated recipe {} with {} tags: {}", recipeId, tags.size(), tags);
    }

    /**
     * Auto-tag all recipes in the database
     * This can be run as a batch job or manually via admin endpoint
     */
    @Transactional
    public int autoTagAllRecipes() {
        log.info("Starting auto-tagging of all recipes...");

        Integer count = jdbcTemplate.queryForObject(
                "SELECT auto_tag_all_recipes()",
                Integer.class
        );

        log.info("Auto-tagging complete: {} recipes tagged", count);
        return count != null ? count : 0;
    }

    /**
     * Get tag statistics
     */
    public Map<String, Integer> getTagStatistics() {
        List<Map<String, Object>> results = jdbcTemplate.queryForList("""
            SELECT unnest(dietary_tags) as tag, COUNT(*) as count
            FROM recipe
            WHERE dietary_tags IS NOT NULL AND array_length(dietary_tags, 1) > 0
            GROUP BY tag
            ORDER BY count DESC
            """);

        Map<String, Integer> stats = new LinkedHashMap<>();
        for (Map<String, Object> row : results) {
            stats.put((String) row.get("tag"), ((Number) row.get("count")).intValue());
        }
        return stats;
    }

    /**
     * Parse nutrition JSONB to Map
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseNutrition(JsonNode nutritionNode) {
        if (nutritionNode == null || nutritionNode.isEmpty()) {
            return Map.of();
        }
        try {
            return objectMapper.convertValue(nutritionNode, Map.class);
        } catch (Exception e) {
            log.warn("Failed to parse nutrition: {}", e.getMessage());
            return Map.of();
        }
    }
}
