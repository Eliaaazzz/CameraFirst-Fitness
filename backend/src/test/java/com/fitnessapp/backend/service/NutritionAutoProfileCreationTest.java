package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService;
import com.fitnessapp.backend.nutrition.service.core.NutritionTrackingService.NutritionSummary;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.user.service.UserService;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test to verify that nutrition APIs auto-create default profiles
 * when they don't exist, preventing 500 errors.
 */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=validate",
    "spring.flyway.enabled=true",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = NutritionAutoProfileCreationTest.TestJpaConfig.class)
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Nutrition Auto Profile Creation Test")
class NutritionAutoProfileCreationTest {

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
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  private NutritionTrackingService nutritionTrackingService;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserProfileRepository userProfileRepository;

  @Autowired
  private MealLogRepository mealLogRepository;

  private User testUser;

  @BeforeEach
  void setUp() {
    nutritionTrackingService = new NutritionTrackingService(
        mealLogRepository,
        userProfileRepository,
        userRepository,
        mock(UserService.class));

    // Clean database
    mealLogRepository.deleteAll();
    userProfileRepository.deleteAll();
    userRepository.deleteAll();

    // Create a user WITHOUT a profile
    testUser = User.builder()
        .email("no-profile@test.com")
        .timeBucket(20)
        .level("beginner")
        .dietTilt("balanced")
        .build();
    testUser = userRepository.save(testUser);

    assertThat(userProfileRepository.findByUserId(testUser.getId())).isEmpty();
  }

  @Test
  @DisplayName("Daily summary auto-creates profile when missing")
  void dailySummaryAutoCreatesProfile() {
    NutritionSummary summary = nutritionTrackingService.dailySummary(testUser.getId(), LocalDate.now());

    assertThat(summary).isNotNull();
    assertThat(summary.days()).isEqualTo(1);
    assertThat(summary.calories().target()).isIn(2000, 2000.0, new java.math.BigDecimal("2000"));
    assertThat(summary.protein().target()).isIn(130, 130.0, new java.math.BigDecimal("130"));

    UserProfile createdProfile = userProfileRepository.findByUserId(testUser.getId()).orElse(null);
    assertThat(createdProfile).isNotNull();
    assertThat(createdProfile.getDailyCalorieTarget()).isEqualTo(2000);
    assertThat(createdProfile.getDailyProteinTarget()).isEqualTo(130);
    assertThat(createdProfile.getDailyCarbsTarget()).isEqualTo(220);
    assertThat(createdProfile.getDailyFatTarget()).isEqualTo(70);
  }

  @Test
  @DisplayName("Weekly summary auto-creates profile when missing")
  void weeklySummaryAutoCreatesProfile() {
    NutritionSummary summary = nutritionTrackingService.weeklySummary(
        testUser.getId(),
        LocalDate.now().with(java.time.DayOfWeek.MONDAY)
    );

    assertThat(summary).isNotNull();
    assertThat(summary.days()).isEqualTo(7);
    assertThat(summary.calories().target()).isIn(14000, 14000.0, new java.math.BigDecimal("14000"));

    UserProfile createdProfile = userProfileRepository.findByUserId(testUser.getId()).orElse(null);
    assertThat(createdProfile).isNotNull();
  }

  @SpringBootConfiguration
  @EnableAutoConfiguration
  @EntityScan(basePackageClasses = {User.class, UserProfile.class, MealLog.class})
  @EnableJpaRepositories(basePackageClasses = {UserRepository.class, UserProfileRepository.class, MealLogRepository.class})
  static class TestJpaConfig {
  }
}
