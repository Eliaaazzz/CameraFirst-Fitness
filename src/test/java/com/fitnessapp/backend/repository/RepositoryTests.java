package com.fitnessapp.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.domain.Ingredient;
import com.fitnessapp.backend.domain.Recipe;
import com.fitnessapp.backend.domain.RecipeIngredient;
import com.fitnessapp.backend.domain.RecipeIngredientId;
import com.fitnessapp.backend.domain.WorkoutVideo;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Assumptions;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RepositoryTests {
  static PostgreSQLContainer<?> postgres;

  @DynamicPropertySource
  static void dbProps(DynamicPropertyRegistry registry) {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container not available; skipping repo tests");
    registry.add("spring.datasource.url", () -> postgres.getJdbcUrl());
    registry.add("spring.datasource.username", () -> postgres.getUsername());
    registry.add("spring.datasource.password", () -> postgres.getPassword());
    registry.add("spring.datasource.driver-class-name", () -> postgres.getDriverClassName());
    registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  @BeforeAll
  static void requireDocker() {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Docker not available for Testcontainers; skipping repo tests");
  }

  private static void ensurePostgres() {
    if (postgres != null && postgres.isRunning()) {
      return;
    }
    boolean docker = false;
    try {
      Class<?> f = Class.forName("org.testcontainers.DockerClientFactory");
      Object inst = f.getMethod("instance").invoke(null);
      docker = (boolean) f.getMethod("isDockerAvailable").invoke(inst);
    } catch (Throwable ignored) {
      docker = false;
    }
    if (!docker) {
      return;
    }
    PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine");
    try {
      container.start();
      postgres = container;
    } catch (Throwable ex) {
      container.close();
      postgres = null;
    }
  }

  @Autowired WorkoutVideoRepository workoutRepo;
  @Autowired RecipeRepository recipeRepo;
  @Autowired IngredientRepository ingredientRepo;

  @Test
  void findByLevelAndDurationMinutesWorks() {
    WorkoutVideo a = WorkoutVideo.builder()
        .youtubeId("a1").title("A").level("beginner").durationMinutes(15)
        .viewCount(0L)
        .build();
    WorkoutVideo b = WorkoutVideo.builder()
        .youtubeId("b1").title("B").level("beginner").durationMinutes(30)
        .viewCount(0L)
        .build();
    workoutRepo.saveAll(List.of(a,b));
    List<WorkoutVideo> found = workoutRepo.findByLevelAndDurationMinutesLessThanEqual("beginner", 20);
    assertThat(found).extracting(WorkoutVideo::getYoutubeId).containsExactly("a1");
  }

  @Test
  void findByIngredientsContainingWorks() {
    ObjectMapper mapper = new ObjectMapper();
    Ingredient chicken = ingredientRepo.save(Ingredient.builder().name("chicken").build());
    Ingredient lemon = ingredientRepo.save(Ingredient.builder().name("lemon").build());

    Recipe r1 = recipeRepo.save(Recipe.builder()
        .title("Lemon Chicken")
        .timeMinutes(20)
        .difficulty("easy")
        .steps(mapper.createArrayNode())
        .swaps(mapper.createArrayNode())
        .nutritionSummary(mapper.createObjectNode())
        .build());
    Recipe r2 = recipeRepo.save(Recipe.builder()
        .title("Plain Chicken")
        .timeMinutes(15)
        .difficulty("easy")
        .steps(mapper.createArrayNode())
        .swaps(mapper.createArrayNode())
        .nutritionSummary(mapper.createObjectNode())
        .build());

    RecipeIngredient ri1 = RecipeIngredient.builder()
        .id(new RecipeIngredientId(r1.getId(), chicken.getId()))
        .recipe(r1)
        .ingredient(chicken)
        .quantity(new BigDecimal("1.0"))
        .unit("lb").build();
    RecipeIngredient ri2 = RecipeIngredient.builder()
        .id(new RecipeIngredientId(r1.getId(), lemon.getId()))
        .recipe(r1)
        .ingredient(lemon)
        .quantity(new BigDecimal("1.0"))
        .unit("ea").build();
    r1.getIngredients().addAll(List.of(ri1, ri2));
    recipeRepo.save(r1);

    RecipeIngredient ri3 = RecipeIngredient.builder()
        .id(new RecipeIngredientId(r2.getId(), chicken.getId()))
        .recipe(r2)
        .ingredient(chicken)
        .quantity(new BigDecimal("1.0"))
        .unit("lb").build();
    r2.getIngredients().add(ri3);
    recipeRepo.save(r2);

    List<Recipe> found = recipeRepo.findByIngredientsContaining(List.of("chicken","lemon"), 2);
    assertThat(found).extracting(Recipe::getTitle).containsExactly("Lemon Chicken");
  }
}
