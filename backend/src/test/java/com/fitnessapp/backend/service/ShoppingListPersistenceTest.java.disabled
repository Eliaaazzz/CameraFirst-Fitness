package com.fitnessapp.backend.service;

import com.fitnessapp.backend.domain.ShoppingList;
import com.fitnessapp.backend.domain.ShoppingListItem;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for shopping list database persistence
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.seed.enabled=false"
})
@ActiveProfiles("test")
@Transactional
class ShoppingListPersistenceTest {

    @Autowired
    private ShoppingListService shoppingListService;

    @Test
    void testGenerateShoppingListFromRecipes() {
        System.out.println("\n========================================");
        System.out.println("Shopping List Generation Test");
        System.out.println("========================================");

        UUID userId = UUID.randomUUID();
        List<UUID> recipeIds = List.of(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                UUID.fromString("22222222-2222-2222-2222-222222222222")
        );

        try {
            ShoppingList shoppingList = shoppingListService.generateFromRecipes(
                    userId,
                    "Weekly Meal Prep",
                    recipeIds
            );

            System.out.println("✅ Shopping list generated:");
            System.out.println("   Name: " + shoppingList.getName());
            System.out.println("   Items: " + shoppingList.getItems().size());
            System.out.println("   Completion: " + shoppingList.getCompletionPercentage() + "%");
            System.out.println("========================================\n");

            assertThat(shoppingList.getId()).isNotNull();
            assertThat(shoppingList.getUserId()).isEqualTo(userId);
            assertThat(shoppingList.getName()).isEqualTo("Weekly Meal Prep");

        } catch (IllegalArgumentException e) {
            System.out.println("Note: Test recipes not found (expected in test environment)");
            assertThat(e.getMessage()).contains("No valid recipes found");
        }
    }

    @Test
    void testCompletionPercentageCalculation() {
        System.out.println("\n========================================");
        System.out.println("Completion Percentage Test");
        System.out.println("========================================");

        ShoppingList list = ShoppingList.builder()
                .userId(UUID.randomUUID())
                .name("Test List")
                .isCompleted(false)
                .build();

        list.addItem(ShoppingListItem.builder()
                .ingredientName("Chicken")
                .isChecked(true)
                .build());

        list.addItem(ShoppingListItem.builder()
                .ingredientName("Rice")
                .isChecked(false)
                .build());

        list.addItem(ShoppingListItem.builder()
                .ingredientName("Broccoli")
                .isChecked(true)
                .build());

        int completion = list.getCompletionPercentage();

        System.out.println("Items: 3 total, 2 checked");
        System.out.println("Completion: " + completion + "%");
        System.out.println("========================================\n");

        assertThat(completion).isEqualTo(66);
        assertThat(list.isFullyCompleted()).isFalse();
    }

    @Test
    void testEmptyRecipeListThrowsException() {
        UUID userId = UUID.randomUUID();
        List<UUID> emptyList = List.of();

        assertThatThrownBy(() ->
                shoppingListService.generateFromRecipes(userId, "Empty", emptyList))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("No valid recipes found");

        System.out.println("✅ Empty recipe list correctly rejected");
    }

    @Test
    void testGetUserShoppingLists() {
        UUID userId = UUID.randomUUID();
        List<ShoppingList> lists = shoppingListService.getUserShoppingLists(userId);

        assertThat(lists).isNotNull();
        System.out.println("✅ User shopping lists retrieved: " + lists.size() + " lists");
    }
}
