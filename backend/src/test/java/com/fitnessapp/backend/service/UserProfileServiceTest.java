package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(UserProfileService.class)
class UserProfileServiceTest {

  private static PostgreSQLContainer<?> postgres;

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container not available; skipping test");
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
    registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
  }

  @BeforeAll
  static void requireDocker() {
    ensurePostgres();
    Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Docker not available; skipping UserProfileServiceTest");
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
    PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine");
    try {
      container.start();
      postgres = container;
    } catch (Throwable ex) {
      container.close();
      postgres = null;
    }
  }

  @Autowired
  private UserProfileService service;

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private UserProfileRepository userProfileRepository;

  private User user;

  @BeforeEach
  void setUp() {
    user = userRepository.save(User.builder()
        .email("service@test.com")
        .timeBucket(2)
        .level("INTERMEDIATE")
        .dietTilt("LEAN")
        .build());
  }

  @Test
  void upsertProfileCalculatesBmi() {
    UserProfile payload = new UserProfile();
    payload.setHeightCm(180);
    payload.setWeightKg(78.0);
    payload.setFitnessGoal(FitnessGoal.GAIN_MUSCLE);
    payload.setDietaryPreference(DietaryPreference.MEDITERRANEAN);
    payload.setDailyCalorieTarget(2600);
    payload.getAllergens().add(Allergen.SEAFOOD);

    UserProfile saved = service.upsertProfile(user.getId(), payload);

    assertThat(saved.getUserId()).isEqualTo(user.getId());
    assertThat(saved.getBmi()).isEqualTo(24.07);
    assertThat(saved.getAllergens()).containsExactly(Allergen.SEAFOOD);

    UserProfile secondPayload = new UserProfile();
    secondPayload.setHeightCm(180);
    secondPayload.setWeightKg(70.0);
    secondPayload.setFitnessGoal(FitnessGoal.LOSE_WEIGHT);
    secondPayload.getAllergens().add(Allergen.LACTOSE);

    UserProfile updated = service.upsertProfile(user.getId(), secondPayload);

    assertThat(updated.getBmi()).isEqualTo(21.6);
    assertThat(updated.getFitnessGoal()).isEqualTo(FitnessGoal.LOSE_WEIGHT);
    assertThat(updated.getAllergens()).containsExactly(Allergen.LACTOSE);
    assertThat(userProfileRepository.count()).isEqualTo(1);
  }

  @Test
  void upsertThrowsWhenUserMissing() {
    UserProfile payload = new UserProfile();
    payload.setHeightCm(175);
    payload.setWeightKg(70.0);

    assertThatThrownBy(() -> service.upsertProfile(UUID.randomUUID(), payload))
        .isInstanceOf(EntityNotFoundException.class)
        .hasMessageContaining("User not found");
  }
}
