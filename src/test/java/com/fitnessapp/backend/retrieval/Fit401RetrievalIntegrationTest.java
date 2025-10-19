package com.fitnessapp.backend.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.retrieval.dto.ImageRequest;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestInstance.Lifecycle;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "app.seed.enabled=true",
                "spring.jpa.hibernate.ddl-auto=none"
        })
@TestInstance(Lifecycle.PER_CLASS)
class Fit401RetrievalIntegrationTest {

    private static PostgreSQLContainer<?> postgres;

    @DynamicPropertySource
    static void registerDataSource(DynamicPropertyRegistry registry) {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container unavailable for FIT-401 tests");
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @BeforeAll
    void spinUpContainer() {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container unavailable for FIT-401 tests");
    }

    private static void ensurePostgres() {
        if (postgres != null && postgres.isRunning()) {
            return;
        }
        try {
            postgres = new PostgreSQLContainer<>("postgres:16-alpine");
            postgres.start();
        } catch (Throwable ex) {
            postgres = null;
        }
    }

    @Autowired
    private WorkoutRetrievalService workoutRetrievalService;

    @Autowired
    private RecipeRetrievalService recipeRetrievalService;

    @Autowired
    private ImageQueryService imageQueryService;

    @Test
    void dumbbellPhotoReturnsDiverseBeginnerWorkouts() {
        ImageRequest metadata = ImageRequest.builder()
                .userHint("dumbbells")
                .userHint("beginner")
                .userHint("20 min")
                .build();

        ImageQueryService.WorkoutDetectionResult detection = imageQueryService.detectWorkoutContext(metadata);
        assertThat(detection.getEquipment()).isEqualTo("dumbbells");
        assertThat(detection.getLevel()).isEqualTo("beginner");

        var workouts = workoutRetrievalService.findWorkouts(
                detection.getEquipment(),
                detection.getLevel(),
                detection.getDurationMinutes());

        assertThat(workouts).hasSize(4);
        assertThat(workouts)
                .allSatisfy(card -> {
                    assertThat(card.getEquipment()).contains("dumbbells");
                    assertThat(card.getDurationMinutes()).isBetween(15, 25);
                });
        long uniqueBodyParts = workouts.stream()
                .flatMap(card -> card.getBodyParts().stream())
                .map(String::toLowerCase)
                .distinct()
                .count();
        assertThat(uniqueBodyParts).isGreaterThanOrEqualTo(2);
    }

    @Test
    void matPhotoSurfacesIntermediateCoreWorkouts() {
        ImageRequest metadata = ImageRequest.builder()
                .userHint("mat")
                .userHint("intermediate")
                .userHint("30 minutes")
                .build();

        ImageQueryService.WorkoutDetectionResult detection = imageQueryService.detectWorkoutContext(metadata);
        assertThat(detection.getEquipment()).isEqualTo("mat");
        assertThat(detection.getLevel()).isEqualTo("intermediate");

        var workouts = workoutRetrievalService.findWorkouts(
                detection.getEquipment(),
                detection.getLevel(),
                detection.getDurationMinutes());

        assertThat(workouts).hasSize(4);
        assertThat(workouts)
                .allSatisfy(card -> {
                    assertThat(card.getEquipment()).contains("mat");
                    assertThat(card.getDurationMinutes()).isBetween(25, 35);
                });
    }

    @Test
    void chickenPhotoReturnsQuickChickenRecipes() {
        ImageRequest metadata = ImageRequest.builder()
                .userHint("chicken breast")
                .userHint("45 min")
                .build();

        ImageQueryService.RecipeDetectionResult detection = imageQueryService.detectRecipeContext(metadata);
        assertThat(detection.getIngredients()).contains("chicken");
        assertThat(detection.getMaxTimeMinutes()).isGreaterThanOrEqualTo(30);

        var recipes = recipeRetrievalService.findRecipes(detection.getIngredients(), detection.getMaxTimeMinutes());

        assertThat(recipes).hasSize(3);
        assertThat(recipes)
                .allSatisfy(card -> {
                    assertThat(card.getTimeMinutes()).isLessThanOrEqualTo(detection.getMaxTimeMinutes());
                    if (card.getNutrition() != null) {
                        Object primaryIngredient = card.getNutrition().get("primaryIngredient");
                        assertThat(primaryIngredient).isNotNull();
                        assertThat(primaryIngredient.toString().toLowerCase()).contains("chicken");
                    }
                });
    }

    @Test
    void emptyDetectionFallsBackToQuickEasyRecipes() {
        ImageQueryService.RecipeDetectionResult detection = imageQueryService.detectRecipeContext(ImageRequest.builder().build());
        assertThat(detection.getIngredients()).isEmpty();

        var recipes = recipeRetrievalService.findRecipes(List.of(), detection.getMaxTimeMinutes());

        assertThat(recipes).hasSize(3);
        assertThat(recipes)
                .allSatisfy(card -> {
                    assertThat(card.getTimeMinutes()).isLessThanOrEqualTo(20);
                    assertThat(card.getDifficulty()).isEqualToIgnoringCase("easy");
                });
    }

    @Test
    void retrievalRespondsWithinPerformanceBudget() {
        ImageRequest metadata = ImageRequest.builder()
                .userHint("dumbbells")
                .userHint("beginner")
                .userHint("22 min")
                .build();
        ImageQueryService.WorkoutDetectionResult detection = imageQueryService.detectWorkoutContext(metadata);
        long start = System.nanoTime();
        var workouts = workoutRetrievalService.findWorkouts(
                detection.getEquipment(),
                detection.getLevel(),
                detection.getDurationMinutes());
        long elapsed = System.nanoTime() - start;

        assertThat(workouts).isNotEmpty();
        long elapsedMs = TimeUnit.NANOSECONDS.toMillis(elapsed);
        assertThat(elapsedMs).isLessThan(300);
    }
}
