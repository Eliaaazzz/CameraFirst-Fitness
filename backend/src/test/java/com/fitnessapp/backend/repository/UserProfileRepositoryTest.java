package com.fitnessapp.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserProfileRepositoryTest {

  private static PostgreSQLContainer<?> postgres;

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container not available; skipping test");
    registry.add("spring.datasource.url", () -> postgres.getJdbcUrl());
    registry.add("spring.datasource.username", () -> postgres.getUsername());
    registry.add("spring.datasource.password", () -> postgres.getPassword());
    registry.add("spring.datasource.driver-class-name", () -> postgres.getDriverClassName());
    registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  @BeforeAll
  static void requireDocker() {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Docker not available for Testcontainers; skipping UserProfileRepositoryTest");
  }

  private static void ensurePostgres() {
    if (postgres != null && postgres.isRunning()) {
      return;
    }
    boolean docker;
    try {
      Class<?> factory = Class.forName("org.testcontainers.DockerClientFactory");
      Object instance = factory.getMethod("instance").invoke(null);
      docker = (boolean) factory.getMethod("isDockerAvailable").invoke(instance);
    } catch (Throwable ignored) {
      docker = false;
    }
    if (!docker) {
      return;
    }
    PostgreSQLContainer<?> container = new PostgreSQLContainer<>("pgvector/pgvector:pg16");
    try {
      container.start();
      postgres = container;
    } catch (Throwable ex) {
      container.close();
      postgres = null;
    }
  }

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserProfileRepository userProfileRepository;

  @Test
  void saveAndFetchProfile() {
    User user = userRepository.save(User.builder()
        .email("profile@test.com")
        .timeBucket(1)
        .level("BEGINNER")
        .dietTilt("BALANCED")
        .build());

    assertThat(user.getId()).as("user id should be generated").isNotNull();

    UserProfile profile = new UserProfile();
    profile.setUser(user);
    profile.setHeightCm(180);
    profile.setWeightKg(new BigDecimal("75.5"));
    profile.setFitnessGoal(FitnessGoal.MAINTAIN);
    profile.setDietaryPreference(DietaryPreference.NONE);
    profile.setDailyCalorieTarget(2200);

    userProfileRepository.save(profile);

    UserProfile persisted = userProfileRepository.findByUserId(user.getId()).orElseThrow();

    assertThat(persisted.getUserId()).isEqualTo(user.getId());
    assertThat(persisted.getHeightCm()).isEqualTo(180);
    assertThat(persisted.getWeightKg()).isEqualTo(new BigDecimal("75.5"));
    assertThat(persisted.getFitnessGoal()).isEqualTo(FitnessGoal.MAINTAIN);
    assertThat(persisted.getDietaryPreference()).isEqualTo(DietaryPreference.NONE);
    assertThat(persisted.getCreatedAt()).isNotNull();
    assertThat(persisted.getUpdatedAt()).isNotNull();
  }
}
