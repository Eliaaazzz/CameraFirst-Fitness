package com.fitnessapp.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.seed.enabled=true"
})
class SeedDataLoaderTest {

    @Autowired
    private WorkoutVideoRepository workoutVideoRepository;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Test
    void seedsWorkoutsAndRecipes() {
        assertThat(workoutVideoRepository.count()).isGreaterThanOrEqualTo(120);
        assertThat(recipeRepository.countActual()).isGreaterThanOrEqualTo(60);
        assertThat(ingredientRepository.count()).isGreaterThanOrEqualTo(6);
    }
}
