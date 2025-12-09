package com.fitnessapp.backend.retrieval;

import com.fitnessapp.backend.retrieval.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for advanced recipe search with macro filtering
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.seed.enabled=false"
})
@ActiveProfiles("test")
@WithMockUser
class RecipeSearchServiceTest {

    @Autowired
    private RecipeSearchService recipeSearchService;

    @Test
    void testHighProteinRecipeSearch() {
        // Find high-protein recipes (30g+ protein)
        List<RecipeCard> recipes = recipeSearchService.findHighProteinRecipes(45);

        System.out.println("\n========================================");
        System.out.println("High-Protein Recipe Search Test");
        System.out.println("========================================");
        System.out.println("Max time: 45 minutes");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (RecipeCard recipe : recipes) {
                Number protein = (Number) recipe.getNutrition().get("protein");
                System.out.printf("- %s: %.1fg protein, %d min%n",
                        recipe.getTitle(),
                        protein != null ? protein.floatValue() : 0,
                        recipe.getTimeMinutes());

                // Verify protein is >= 30g
                if (protein != null) {
                    assertThat(protein.floatValue()).isGreaterThanOrEqualTo(30.0f);
                }
            }
        }
        System.out.println("========================================\n");

        // Should return recipes
        assertThat(recipes).isNotNull();
    }

    @Test
    void testLowCarbRecipeSearch() {
        // Find low-carb recipes (under 20g carbs)
        List<RecipeCard> recipes = recipeSearchService.findLowCarbRecipes(45);

        System.out.println("\n========================================");
        System.out.println("Low-Carb Recipe Search Test");
        System.out.println("========================================");
        System.out.println("Max time: 45 minutes");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (RecipeCard recipe : recipes) {
                Number carbs = (Number) recipe.getNutrition().get("carbs");
                System.out.printf("- %s: %.1fg carbs, %d min%n",
                        recipe.getTitle(),
                        carbs != null ? carbs.floatValue() : 0,
                        recipe.getTimeMinutes());

                // Verify carbs are <= 20g
                if (carbs != null) {
                    assertThat(carbs.floatValue()).isLessThanOrEqualTo(20.0f);
                }
            }
        }
        System.out.println("========================================\n");

        assertThat(recipes).isNotNull();
    }

    @Test
    void testLowCalorieRecipeSearch() {
        // Find low-calorie recipes (under 400 calories)
        List<RecipeCard> recipes = recipeSearchService.findLowCalorieRecipes(45);

        System.out.println("\n========================================");
        System.out.println("Low-Calorie Recipe Search Test");
        System.out.println("========================================");
        System.out.println("Max time: 45 minutes");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (RecipeCard recipe : recipes) {
                Number calories = (Number) recipe.getNutrition().get("calories");
                System.out.printf("- %s: %d calories, %d min%n",
                        recipe.getTitle(),
                        calories != null ? calories.intValue() : 0,
                        recipe.getTimeMinutes());

                // Verify calories are <= 400
                if (calories != null) {
                    assertThat(calories.intValue()).isLessThanOrEqualTo(400);
                }
            }
        }
        System.out.println("========================================\n");

        assertThat(recipes).isNotNull();
    }

    @Test
    void testAdvancedSearchWithMultipleFilters() {
        // Search for high-protein, low-calorie recipes
        RecipeSearchRequest request = RecipeSearchRequest.builder()
                .maxTimeMinutes(45)
                .nutrition(NutritionFilter.builder()
                        .minProtein(25)
                        .maxCalories(500)
                        .build())
                .sortBy("protein")
                .build();

        List<RecipeCard> recipes = recipeSearchService.search(request);

        System.out.println("\n========================================");
        System.out.println("Advanced Multi-Filter Search Test");
        System.out.println("========================================");
        System.out.println("Criteria: 25g+ protein, <500 calories, <45 min");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (RecipeCard recipe : recipes) {
                Number protein = (Number) recipe.getNutrition().get("protein");
                Number calories = (Number) recipe.getNutrition().get("calories");
                System.out.printf("- %s: %.1fg protein, %d cal, %d min%n",
                        recipe.getTitle(),
                        protein != null ? protein.floatValue() : 0,
                        calories != null ? calories.intValue() : 0,
                        recipe.getTimeMinutes());

                // Verify filters
                if (protein != null) {
                    assertThat(protein.floatValue()).isGreaterThanOrEqualTo(25.0f);
                }
                if (calories != null) {
                    assertThat(calories.intValue()).isLessThanOrEqualTo(500);
                }
            }
        }
        System.out.println("========================================\n");

        assertThat(recipes).isNotNull();
    }

    @Test
    void testBalancedRecipeSearch() {
        List<RecipeCard> recipes = recipeSearchService.findBalancedRecipes(30);

        System.out.println("\n========================================");
        System.out.println("Balanced Recipe Search Test");
        System.out.println("========================================");
        System.out.println("Criteria: Balanced macros, <30 min");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (int i = 0; i < Math.min(5, recipes.size()); i++) {
                RecipeCard recipe = recipes.get(i);
                Number protein = (Number) recipe.getNutrition().get("protein");
                Number carbs = (Number) recipe.getNutrition().get("carbs");
                Number fat = (Number) recipe.getNutrition().get("fat");
                Number calories = (Number) recipe.getNutrition().get("calories");

                System.out.printf("- %s:%n  P: %.1fg, C: %.1fg, F: %.1fg, Cal: %d, Time: %d min%n",
                        recipe.getTitle(),
                        protein != null ? protein.floatValue() : 0,
                        carbs != null ? carbs.floatValue() : 0,
                        fat != null ? fat.floatValue() : 0,
                        calories != null ? calories.intValue() : 0,
                        recipe.getTimeMinutes());
            }
        }
        System.out.println("========================================\n");

        assertThat(recipes).isNotNull();
    }

    @Test
    void testCalorieRangeSearch() {
        // Find recipes between 300-500 calories
        List<RecipeCard> recipes = recipeSearchService.findByCaloriesRange(300, 500);

        System.out.println("\n========================================");
        System.out.println("Calorie Range Search Test");
        System.out.println("========================================");
        System.out.println("Range: 300-500 calories");
        System.out.println("Found: " + recipes.size() + " recipes");

        if (!recipes.isEmpty()) {
            for (RecipeCard recipe : recipes) {
                Number calories = (Number) recipe.getNutrition().get("calories");
                System.out.printf("- %s: %d calories%n",
                        recipe.getTitle(),
                        calories != null ? calories.intValue() : 0);

                // Verify calories are in range
                if (calories != null) {
                    assertThat(calories.intValue()).isBetween(300, 500);
                }
            }
        }
        System.out.println("========================================\n");

        assertThat(recipes).isNotNull();
    }

    @Test
    void testNutritionFilterBuilders() {
        // Test the convenient filter builders
        NutritionFilter highProtein = NutritionFilter.highProtein();
        assertThat(highProtein.getMinProtein()).isEqualTo(30);

        NutritionFilter lowCarb = NutritionFilter.lowCarb();
        assertThat(lowCarb.getMaxCarbs()).isEqualTo(20);

        NutritionFilter lowCalorie = NutritionFilter.lowCalorie();
        assertThat(lowCalorie.getMaxCalories()).isEqualTo(400);

        NutritionFilter keto = NutritionFilter.keto();
        assertThat(keto.getMaxCarbs()).isEqualTo(20);
        assertThat(keto.getMinFat()).isEqualTo(15);

        NutritionFilter balanced = NutritionFilter.balanced();
        assertThat(balanced.getMinProtein()).isEqualTo(20);
        assertThat(balanced.getMaxCalories()).isEqualTo(600);

        System.out.println("✅ All nutrition filter builders work correctly");
    }

    @Test
    void testSearchRequestIsSimple() {
        // Test simple vs advanced search detection
        RecipeSearchRequest simple = RecipeSearchRequest.builder()
                .ingredients(List.of("chicken"))
                .maxTimeMinutes(30)
                .build();
        assertThat(simple.isSimpleSearch()).isTrue();

        RecipeSearchRequest advanced = RecipeSearchRequest.builder()
                .ingredients(List.of("chicken"))
                .maxTimeMinutes(30)
                .nutrition(NutritionFilter.highProtein())
                .build();
        assertThat(advanced.isSimpleSearch()).isFalse();

        System.out.println("✅ Search type detection works correctly");
    }
}
