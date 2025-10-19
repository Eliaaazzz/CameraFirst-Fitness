# JPA Many-to-Many with Composite Keys: The Two-Save Pattern

## Problem

When persisting a Recipe with Ingredients in a many-to-many relationship using composite primary keys, you cannot save everything in one step.

## Why?

The `RecipeIngredient` join table uses a composite key `(recipe_id, ingredient_id)`. However, `recipe.getId()` is **null** until the recipe is saved to the database. Without the recipe ID, you cannot construct the composite key.

```java
// ❌ FAILS - recipe.getId() is null!
Recipe recipe = new Recipe("Chicken Salad");
RecipeIngredient rel = new RecipeIngredient(
    new RecipeIngredientId(recipe.getId(), ingredient.getId())  // null!
);
```

## The Two-Save Pattern

```java
@Transactional
public Recipe persistRecipe(RecipeSeed seed) {
    // Step 1: Save recipe to get the ID
    Recipe recipe = Recipe.builder()
        .title("Chicken Salad")
        .build();
    recipe = recipeRepository.save(recipe);  // Now recipe.getId() exists
    
    // Step 2: Build relationships with the composite key
    for (String ingredientName : seed.getIngredients()) {
        Ingredient ingredient = findOrCreateIngredient(ingredientName);
        
        RecipeIngredient relation = RecipeIngredient.builder()
            .id(new RecipeIngredientId(
                recipe.getId(),      // ✅ Available now
                ingredient.getId()
            ))
            .recipe(recipe)
            .ingredient(ingredient)
            .build();
        
        recipe.getIngredients().add(relation);
    }
    
    // Step 3: Save again - cascade persists relationships
    return recipeRepository.save(recipe);
}
```

## Key Components

**RecipeIngredientId (Composite Key)**:
```java
@Embeddable
public class RecipeIngredientId implements Serializable {
    private UUID recipeId;
    private UUID ingredientId;
    
    // Must override equals() and hashCode()
}
```

**RecipeIngredient (Join Entity)**:
```java
@Entity
public class RecipeIngredient {
    @EmbeddedId
    private RecipeIngredientId id;
    
    @ManyToOne
    @MapsId("recipeId")  // Maps foreign key to composite key
    private Recipe recipe;
    
    @ManyToOne
    @MapsId("ingredientId")
    private Ingredient ingredient;
}
```

**Recipe**:
```java
@Entity
public class Recipe {
    @Id @GeneratedValue
    private UUID id;
    
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL)
    private Set<RecipeIngredient> ingredients;
}
```

## Critical Points

1. **@Transactional required** - Ensures both saves succeed or both rollback
2. **@MapsId annotation** - Prevents duplicate columns (foreign key = primary key component)
3. **Composite key must implement Serializable** - JPA specification requirement
4. **Override equals() and hashCode()** - Required for composite key classes

This pattern is the standard approach for JPA many-to-many relationships with composite keys and additional attributes (like quantity/unit).
