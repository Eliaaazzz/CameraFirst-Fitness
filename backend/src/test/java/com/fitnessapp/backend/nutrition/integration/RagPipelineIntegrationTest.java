package com.fitnessapp.backend.nutrition.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import com.fitnessapp.backend.nutrition.repository.FoodNutritionRepository;
import com.fitnessapp.backend.nutrition.service.core.FoodKeyNormalizer;
import com.fitnessapp.backend.nutrition.service.core.NutritionEngine;
import com.fitnessapp.backend.nutrition.service.core.NutritionEngineImpl;
import com.fitnessapp.backend.nutrition.service.core.NutritionLookupService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = RagPipelineIntegrationTest.TestJpaConfig.class)
@Import({FoodKeyNormalizer.class, NutritionLookupService.class, NutritionEngineImpl.class})
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("RAG Pipeline Integration Tests")
class RagPipelineIntegrationTest {

  @Container
  private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("pgvector/pgvector:pg16")
      .withDatabaseName("fitness_test")
      .withUsername("test")
      .withPassword("test");

  @DynamicPropertySource
  static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  @Autowired
  private FoodNutritionRepository foodNutritionRepository;

  @Autowired
  private NutritionLookupService nutritionLookupService;

  @Autowired
  private NutritionEngine nutritionEngine;

  @Autowired
  private EntityManager entityManager;

  @BeforeEach
  void setUp() {
    entityManager.createNativeQuery("CREATE EXTENSION IF NOT EXISTS pg_trgm").executeUpdate();
    foodNutritionRepository.deleteAll();
    seedTestData();
  }

  @Test
  void shouldLookupUsingMetadataAndApplyCookingMultiplier() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("Chicken")
        .form("Breast")
        .cookingMethodStr("FRIED")
        .searchTerms(List.of("chicken_breast"))
        .build();

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("20.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("3.00"));
  }

  @Test
  void shouldEnrichRecognizedFoodAndScaleByEstimatedWeight() {
    RecognizedFood food = RecognizedFood.builder()
        .foodKey("salmon_grilled")
        .displayName("Grilled Salmon")
        .estimatedGrams(150)
        .cookingMethod("GRILLED")
        .metadata(FoodMetadata.builder()
            .baseIngredient("Salmon")
            .form("Fillet")
            .cookingMethodStr("GRILLED")
            .searchTerms(List.of("salmon_grilled"))
            .estimatedWeightG(150)
            .build())
        .build();

    nutritionEngine.enrichWithNutrition(food);

    assertThat(food.getNutrition()).isNotNull();
    assertThat(food.getNutrition().getCalories()).isEqualByComparingTo(new BigDecimal("390.00"));
    assertThat(food.getNutrition().getProtein()).isEqualByComparingTo(new BigDecimal("33.00"));
    assertThat(food.getNutrition().getFat()).isEqualByComparingTo(new BigDecimal("23.40"));
  }

  @Test
  void shouldFallbackToDefaultNutritionWhenNoMatchFound() {
    FoodMetadata metadata = FoodMetadata.builder()
        .baseIngredient("UnknownFood")
        .searchTerms(List.of("unknown_food"))
        .build();

    NutritionInfo result = nutritionLookupService.lookupNutritionWithMetadata(metadata);

    assertThat(result.getCalories()).isEqualByComparingTo(new BigDecimal("150.0"));
    assertThat(result.getProtein()).isEqualByComparingTo(new BigDecimal("8.0"));
    assertThat(result.getFat()).isEqualByComparingTo(new BigDecimal("6.0"));
    assertThat(result.getCarbs()).isEqualByComparingTo(new BigDecimal("15.0"));
  }

  private void seedTestData() {
    foodNutritionRepository.save(food("chicken_breast", "Chicken Breast", 100.0, 20.0, 2.0, 0.0));
    foodNutritionRepository.save(food("salmon_grilled", "Salmon, Grilled", 200.0, 22.0, 12.0, 0.0));
    foodNutritionRepository.save(food("steamed_rice", "Steamed Rice", 130.0, 2.7, 0.3, 28.0));
  }

  private FoodNutrition food(String key, String name, double calories, double protein, double fat, double carbs) {
    return FoodNutrition.builder()
        .foodKey(key)
        .displayName(name)
        .calories(BigDecimal.valueOf(calories))
        .protein(BigDecimal.valueOf(protein))
        .fat(BigDecimal.valueOf(fat))
        .carbs(BigDecimal.valueOf(carbs))
        .isActive(true)
        .build();
  }

  @SpringBootConfiguration
  @EnableAutoConfiguration
  @EntityScan(basePackageClasses = FoodNutrition.class)
  @EnableJpaRepositories(basePackageClasses = FoodNutritionRepository.class)
  static class TestJpaConfig {
  }
}
