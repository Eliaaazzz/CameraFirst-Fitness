package com.fitnessapp.backend.weight.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.repository.UserRepository;
import com.fitnessapp.backend.weight.entity.WeightLog;

@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "app.seed.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = WeightLogRepositoryTest.TestConfig.class)
@DisplayName("WeightLogRepository Integration Tests")
class WeightLogRepositoryTest {

    @Configuration
    @EnableJpaRepositories(basePackages = {
        "com.fitnessapp.backend.weight.repository",
        "com.fitnessapp.backend.user.repository"
    })
    @EntityScan(basePackages = {
        "com.fitnessapp.backend.weight.entity",
        "com.fitnessapp.backend.user.entity"
    })
    static class TestConfig {
    }

    private static PostgreSQLContainer<?> postgres;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(),
            "Postgres container not available; skipping test");
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @BeforeAll
    static void requireDocker() {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(),
            "Docker not available; skipping WeightLogRepositoryTest");
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
    private WeightLogRepository weightLogRepository;

    @Autowired
    private UserRepository userRepository;

    private User user;
    private UUID userId;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        weightLogRepository.deleteAll();

        user = userRepository.save(User.builder()
            .email("weight-test-" + UUID.randomUUID() + "@test.com")
            .timeBucket(2)
            .level("INTERMEDIATE")
            .build());

        userId = user.getId();
        today = LocalDate.now();
    }

    // =========================================================================
    // findByUserIdAndLogDate Tests
    // =========================================================================

    @Nested
    @DisplayName("findByUserIdAndLogDate()")
    class FindByUserIdAndLogDateTests {

        @Test
        @DisplayName("should find weight log by user and date")
        void shouldFindWeightLogByUserAndDate() {
            // Given
            WeightLog log = weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.5"))
                .logDate(today)
                .build());

            // When
            Optional<WeightLog> found = weightLogRepository.findByUserIdAndLogDate(userId, today);

            // Then
            assertThat(found).isPresent();
            assertThat(found.get().getWeightKg()).isEqualByComparingTo(new BigDecimal("75.5"));
        }

        @Test
        @DisplayName("should return empty when no log exists for date")
        void shouldReturnEmptyWhenNoLogExistsForDate() {
            // Given
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.5"))
                .logDate(today.minusDays(1))
                .build());

            // When
            Optional<WeightLog> found = weightLogRepository.findByUserIdAndLogDate(userId, today);

            // Then
            assertThat(found).isEmpty();
        }

        @Test
        @DisplayName("should not find other user's log")
        void shouldNotFindOtherUsersLog() {
            // Given
            User otherUser = userRepository.save(User.builder()
                .email("other-" + UUID.randomUUID() + "@test.com")
                .timeBucket(1)
                .level("BEGINNER")
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(otherUser.getId())
                .weightKg(new BigDecimal("80.0"))
                .logDate(today)
                .build());

            // When
            Optional<WeightLog> found = weightLogRepository.findByUserIdAndLogDate(userId, today);

            // Then
            assertThat(found).isEmpty();
        }
    }

    // =========================================================================
    // findByUserIdAndDateRange Tests
    // =========================================================================

    @Nested
    @DisplayName("findByUserIdAndDateRange()")
    class FindByUserIdAndDateRangeTests {

        @Test
        @DisplayName("should return logs within date range ordered by date descending")
        void shouldReturnLogsWithinDateRangeOrderedDesc() {
            // Given
            LocalDate startDate = today.minusDays(7);

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.0"))
                .logDate(today)
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("74.0"))
                .logDate(today.minusDays(3))
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("73.0"))
                .logDate(today.minusDays(7))
                .build());

            // Log outside range - should not be included
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("72.0"))
                .logDate(today.minusDays(10))
                .build());

            // When
            List<WeightLog> logs = weightLogRepository.findByUserIdAndDateRange(
                userId, startDate, today);

            // Then
            assertThat(logs).hasSize(3);
            assertThat(logs.get(0).getWeightKg()).isEqualByComparingTo(new BigDecimal("75.0")); // Most recent
            assertThat(logs.get(1).getWeightKg()).isEqualByComparingTo(new BigDecimal("74.0"));
            assertThat(logs.get(2).getWeightKg()).isEqualByComparingTo(new BigDecimal("73.0")); // Oldest in range
        }

        @Test
        @DisplayName("should return empty list when no logs in range")
        void shouldReturnEmptyListWhenNoLogsInRange() {
            // Given
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.0"))
                .logDate(today.minusDays(30))
                .build());

            // When
            List<WeightLog> logs = weightLogRepository.findByUserIdAndDateRange(
                userId, today.minusDays(7), today);

            // Then
            assertThat(logs).isEmpty();
        }
    }

    // =========================================================================
    // findFirstByUserIdOrderByLogDateDesc Tests
    // =========================================================================

    @Nested
    @DisplayName("findFirstByUserIdOrderByLogDateDesc()")
    class FindMostRecentTests {

        @Test
        @DisplayName("should return most recent weight log")
        void shouldReturnMostRecentWeightLog() {
            // Given
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("73.0"))
                .logDate(today.minusDays(5))
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.0"))
                .logDate(today)
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("74.0"))
                .logDate(today.minusDays(2))
                .build());

            // When
            Optional<WeightLog> mostRecent = weightLogRepository
                .findFirstByUserIdOrderByLogDateDesc(userId);

            // Then
            assertThat(mostRecent).isPresent();
            assertThat(mostRecent.get().getWeightKg()).isEqualByComparingTo(new BigDecimal("75.0"));
            assertThat(mostRecent.get().getLogDate()).isEqualTo(today);
        }

        @Test
        @DisplayName("should return empty when user has no logs")
        void shouldReturnEmptyWhenUserHasNoLogs() {
            // When
            Optional<WeightLog> mostRecent = weightLogRepository
                .findFirstByUserIdOrderByLogDateDesc(userId);

            // Then
            assertThat(mostRecent).isEmpty();
        }
    }

    // =========================================================================
    // findRecentByUserId Tests
    // =========================================================================

    @Nested
    @DisplayName("findRecentByUserId()")
    class FindRecentByUserIdTests {

        @Test
        @DisplayName("should return limited number of recent logs")
        void shouldReturnLimitedNumberOfRecentLogs() {
            // Given - Create 5 logs
            for (int i = 0; i < 5; i++) {
                weightLogRepository.save(WeightLog.builder()
                    .userId(userId)
                    .weightKg(new BigDecimal("70").add(new BigDecimal(i)))
                    .logDate(today.minusDays(i))
                    .build());
            }

            // When - Request only 3
            List<WeightLog> logs = weightLogRepository.findRecentByUserId(userId, 3);

            // Then
            assertThat(logs).hasSize(3);
            // Should be ordered by date descending
            assertThat(logs.get(0).getLogDate()).isEqualTo(today);
            assertThat(logs.get(1).getLogDate()).isEqualTo(today.minusDays(1));
            assertThat(logs.get(2).getLogDate()).isEqualTo(today.minusDays(2));
        }
    }

    // =========================================================================
    // countByUserId Tests
    // =========================================================================

    @Nested
    @DisplayName("countByUserId()")
    class CountByUserIdTests {

        @Test
        @DisplayName("should count all logs for user")
        void shouldCountAllLogsForUser() {
            // Given
            for (int i = 0; i < 3; i++) {
                weightLogRepository.save(WeightLog.builder()
                    .userId(userId)
                    .weightKg(new BigDecimal("75.0"))
                    .logDate(today.minusDays(i))
                    .build());
            }

            // When
            long count = weightLogRepository.countByUserId(userId);

            // Then
            assertThat(count).isEqualTo(3);
        }

        @Test
        @DisplayName("should return zero when user has no logs")
        void shouldReturnZeroWhenUserHasNoLogs() {
            // When
            long count = weightLogRepository.countByUserId(userId);

            // Then
            assertThat(count).isZero();
        }
    }

    // =========================================================================
    // Unique Constraint Tests
    // =========================================================================

    @Nested
    @DisplayName("Unique Constraint (user_id, log_date)")
    class UniqueConstraintTests {

        @Test
        @DisplayName("should allow same user to log on different dates")
        void shouldAllowSameUserToDogOnDifferentDates() {
            // Given & When
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.0"))
                .logDate(today)
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("74.5"))
                .logDate(today.minusDays(1))
                .build());

            // Then
            long count = weightLogRepository.countByUserId(userId);
            assertThat(count).isEqualTo(2);
        }

        @Test
        @DisplayName("should allow different users to log on same date")
        void shouldAllowDifferentUsersToLogOnSameDate() {
            // Given
            User otherUser = userRepository.save(User.builder()
                .email("another-" + UUID.randomUUID() + "@test.com")
                .timeBucket(1)
                .level("BEGINNER")
                .build());

            // When
            weightLogRepository.save(WeightLog.builder()
                .userId(userId)
                .weightKg(new BigDecimal("75.0"))
                .logDate(today)
                .build());

            weightLogRepository.save(WeightLog.builder()
                .userId(otherUser.getId())
                .weightKg(new BigDecimal("80.0"))
                .logDate(today)
                .build());

            // Then
            assertThat(weightLogRepository.countByUserId(userId)).isEqualTo(1);
            assertThat(weightLogRepository.countByUserId(otherUser.getId())).isEqualTo(1);
        }
    }
}
