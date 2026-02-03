package com.fitnessapp.backend.weight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.weight.dto.WeightLogRequest;
import com.fitnessapp.backend.weight.dto.WeightLogResponse;
import com.fitnessapp.backend.weight.dto.WeightStatsResponse;
import com.fitnessapp.backend.weight.entity.WeightLog;
import com.fitnessapp.backend.weight.repository.WeightLogRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("WeightLogService Unit Tests")
class WeightLogServiceTest {

    @Mock
    private WeightLogRepository weightLogRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @InjectMocks
    private WeightLogService weightLogService;

    @Captor
    private ArgumentCaptor<WeightLog> weightLogCaptor;

    @Captor
    private ArgumentCaptor<UserProfile> userProfileCaptor;

    private UUID userId;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        today = LocalDate.now();
    }

    // =========================================================================
    // logWeight Tests
    // =========================================================================

    @Nested
    @DisplayName("logWeight()")
    class LogWeightTests {

        @Test
        @DisplayName("should create new weight log when no entry exists for the date")
        void shouldCreateNewWeightLog() {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("75.5"),
                today,
                new BigDecimal("18.5"),
                new BigDecimal("35.0"),
                "Morning weigh-in"
            );

            when(weightLogRepository.findByUserIdAndLogDate(userId, today))
                .thenReturn(Optional.empty());

            WeightLog savedLog = WeightLog.builder()
                .id(1L)
                .userId(userId)
                .weightKg(request.weightKg())
                .logDate(today)
                .bodyFatPercentage(request.bodyFatPercentage())
                .muscleMassKg(request.muscleMassKg())
                .note(request.note())
                .createdAt(OffsetDateTime.now())
                .build();

            when(weightLogRepository.save(any(WeightLog.class))).thenReturn(savedLog);
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            WeightLogResponse response = weightLogService.logWeight(userId, request);

            // Then
            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.weightKg()).isEqualByComparingTo(new BigDecimal("75.5"));
            assertThat(response.logDate()).isEqualTo(today);
            assertThat(response.bodyFatPercentage()).isEqualByComparingTo(new BigDecimal("18.5"));
            assertThat(response.note()).isEqualTo("Morning weigh-in");

            verify(weightLogRepository).save(weightLogCaptor.capture());
            WeightLog captured = weightLogCaptor.getValue();
            assertThat(captured.getUserId()).isEqualTo(userId);
            assertThat(captured.getWeightKg()).isEqualByComparingTo(new BigDecimal("75.5"));
        }

        @Test
        @DisplayName("should update existing weight log for the same date (upsert)")
        void shouldUpdateExistingWeightLog() {
            // Given
            WeightLog existingLog = WeightLog.builder()
                .id(1L)
                .userId(userId)
                .weightKg(new BigDecimal("74.0"))
                .logDate(today)
                .createdAt(OffsetDateTime.now())
                .build();

            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("75.5"),
                today,
                null,
                null,
                "Updated after lunch"
            );

            when(weightLogRepository.findByUserIdAndLogDate(userId, today))
                .thenReturn(Optional.of(existingLog));

            when(weightLogRepository.save(any(WeightLog.class))).thenAnswer(inv -> inv.getArgument(0));
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            WeightLogResponse response = weightLogService.logWeight(userId, request);

            // Then
            assertThat(response.weightKg()).isEqualByComparingTo(new BigDecimal("75.5"));
            assertThat(response.note()).isEqualTo("Updated after lunch");

            verify(weightLogRepository).save(weightLogCaptor.capture());
            WeightLog captured = weightLogCaptor.getValue();
            assertThat(captured.getId()).isEqualTo(1L); // Same ID = update
        }

        @Test
        @DisplayName("should update user profile weight and BMI when logging weight")
        void shouldUpdateUserProfileWeightAndBmi() {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("70.0"),
                today,
                new BigDecimal("15.0"),
                null,
                null
            );

            UserProfile profile = UserProfile.builder()
                .userId(userId)
                .heightCm(175)
                .weightKg(new BigDecimal("72.0"))
                .bmi(new BigDecimal("23.51"))
                .build();

            when(weightLogRepository.findByUserIdAndLogDate(userId, today))
                .thenReturn(Optional.empty());
            when(weightLogRepository.save(any(WeightLog.class))).thenAnswer(inv -> {
                WeightLog log = inv.getArgument(0);
                log.setId(1L);
                log.setCreatedAt(OffsetDateTime.now());
                return log;
            });
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
            when(userProfileRepository.save(any(UserProfile.class))).thenAnswer(inv -> inv.getArgument(0));

            // When
            weightLogService.logWeight(userId, request);

            // Then
            verify(userProfileRepository).save(userProfileCaptor.capture());
            UserProfile savedProfile = userProfileCaptor.getValue();

            assertThat(savedProfile.getWeightKg()).isEqualByComparingTo(new BigDecimal("70.0"));
            assertThat(savedProfile.getBodyFatPercentage()).isEqualByComparingTo(new BigDecimal("15.0"));
            // BMI = 70 / (1.75 * 1.75) = 22.86
            assertThat(savedProfile.getBmi()).isEqualByComparingTo(new BigDecimal("22.86"));
        }

        @Test
        @DisplayName("should use today as default date when no date provided")
        void shouldUseTodayAsDefaultDate() {
            // Given
            WeightLogRequest request = new WeightLogRequest(
                new BigDecimal("75.0"),
                null, // No date provided
                null,
                null,
                null
            );

            when(weightLogRepository.findByUserIdAndLogDate(eq(userId), any(LocalDate.class)))
                .thenReturn(Optional.empty());
            when(weightLogRepository.save(any(WeightLog.class))).thenAnswer(inv -> {
                WeightLog log = inv.getArgument(0);
                log.setId(1L);
                log.setCreatedAt(OffsetDateTime.now());
                return log;
            });
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            WeightLogResponse response = weightLogService.logWeight(userId, request);

            // Then
            assertThat(response.logDate()).isEqualTo(today);
        }
    }

    // =========================================================================
    // getWeightStats Tests
    // =========================================================================

    @Nested
    @DisplayName("getWeightStats()")
    class GetWeightStatsTests {

        @Test
        @DisplayName("should return empty stats when no weight logs exist")
        void shouldReturnEmptyStatsWhenNoLogs() {
            // Given
            when(weightLogRepository.findByUserIdAndDateRange(eq(userId), any(), any()))
                .thenReturn(List.of());

            // When
            WeightStatsResponse stats = weightLogService.getWeightStats(userId, 30);

            // Then
            assertThat(stats.currentWeight()).isNull();
            assertThat(stats.totalLogs()).isZero();
            assertThat(stats.trend()).isEqualTo("stable");
            assertThat(stats.progressMessage()).contains("Start logging");
        }

        @Test
        @DisplayName("should calculate weight loss trend correctly")
        void shouldCalculateWeightLossTrend() {
            // Given
            LocalDate startDate = today.minusDays(7);
            List<WeightLog> history = List.of(
                createWeightLog(1L, today, new BigDecimal("72.0")),           // Most recent
                createWeightLog(2L, today.minusDays(3), new BigDecimal("73.5")),
                createWeightLog(3L, startDate, new BigDecimal("75.0"))        // Oldest
            );

            UserProfile profile = UserProfile.builder()
                .userId(userId)
                .heightCm(175)
                .fitnessGoal(FitnessGoal.LOSE_WEIGHT)
                .build();

            when(weightLogRepository.findByUserIdAndDateRange(eq(userId), any(), any()))
                .thenReturn(history);
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            // When
            WeightStatsResponse stats = weightLogService.getWeightStats(userId, 30);

            // Then
            assertThat(stats.currentWeight()).isEqualByComparingTo(new BigDecimal("72.0"));
            assertThat(stats.startWeight()).isEqualByComparingTo(new BigDecimal("75.0"));
            assertThat(stats.weightChange()).isEqualByComparingTo(new BigDecimal("-3.00"));
            assertThat(stats.trend()).isEqualTo("losing");
            assertThat(stats.totalLogs()).isEqualTo(3);
            // BMI = 72 / (1.75 * 1.75) = 23.51
            assertThat(stats.bmi()).isEqualByComparingTo(new BigDecimal("23.51"));
        }

        @Test
        @DisplayName("should calculate weight gain trend correctly")
        void shouldCalculateWeightGainTrend() {
            // Given
            List<WeightLog> history = List.of(
                createWeightLog(1L, today, new BigDecimal("78.0")),
                createWeightLog(2L, today.minusDays(7), new BigDecimal("75.0"))
            );

            UserProfile profile = UserProfile.builder()
                .userId(userId)
                .heightCm(180)
                .fitnessGoal(FitnessGoal.GAIN_MUSCLE)
                .build();

            when(weightLogRepository.findByUserIdAndDateRange(eq(userId), any(), any()))
                .thenReturn(history);
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            // When
            WeightStatsResponse stats = weightLogService.getWeightStats(userId, 30);

            // Then
            assertThat(stats.weightChange()).isEqualByComparingTo(new BigDecimal("3.00"));
            assertThat(stats.trend()).isEqualTo("gaining");
            assertThat(stats.progressMessage()).contains("Gaining well");
        }

        @Test
        @DisplayName("should calculate stable trend when change is minimal")
        void shouldCalculateStableTrend() {
            // Given
            List<WeightLog> history = List.of(
                createWeightLog(1L, today, new BigDecimal("75.2")),
                createWeightLog(2L, today.minusDays(7), new BigDecimal("75.0"))
            );

            when(weightLogRepository.findByUserIdAndDateRange(eq(userId), any(), any()))
                .thenReturn(history);
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.empty());

            // When
            WeightStatsResponse stats = weightLogService.getWeightStats(userId, 30);

            // Then
            assertThat(stats.weightChange()).isEqualByComparingTo(new BigDecimal("0.20"));
            assertThat(stats.trend()).isEqualTo("stable");
        }

        @Test
        @DisplayName("should generate appropriate progress message for MAINTAIN goal")
        void shouldGenerateProgressMessageForMaintainGoal() {
            // Given
            List<WeightLog> history = List.of(
                createWeightLog(1L, today, new BigDecimal("75.3")),
                createWeightLog(2L, today.minusDays(14), new BigDecimal("75.0"))
            );

            UserProfile profile = UserProfile.builder()
                .userId(userId)
                .heightCm(175)
                .weightKg(new BigDecimal("75.0"))
                .fitnessGoal(FitnessGoal.MAINTAIN)
                .build();

            when(weightLogRepository.findByUserIdAndDateRange(eq(userId), any(), any()))
                .thenReturn(history);
            when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

            // When
            WeightStatsResponse stats = weightLogService.getWeightStats(userId, 30);

            // Then
            assertThat(stats.progressMessage()).contains("maintaining");
        }
    }

    // =========================================================================
    // getWeightHistory Tests
    // =========================================================================

    @Nested
    @DisplayName("getWeightHistory()")
    class GetWeightHistoryTests {

        @Test
        @DisplayName("should return weight history within date range")
        void shouldReturnWeightHistoryWithinDateRange() {
            // Given
            LocalDate startDate = today.minusDays(7);
            LocalDate endDate = today;

            List<WeightLog> logs = List.of(
                createWeightLog(1L, today, new BigDecimal("72.0")),
                createWeightLog(2L, today.minusDays(3), new BigDecimal("73.0"))
            );

            when(weightLogRepository.findByUserIdAndDateRange(userId, startDate, endDate))
                .thenReturn(logs);

            // When
            List<WeightLogResponse> history = weightLogService.getWeightHistory(userId, startDate, endDate);

            // Then
            assertThat(history).hasSize(2);
            assertThat(history.get(0).weightKg()).isEqualByComparingTo(new BigDecimal("72.0"));
            assertThat(history.get(1).weightKg()).isEqualByComparingTo(new BigDecimal("73.0"));
        }
    }

    // =========================================================================
    // deleteWeightLog Tests
    // =========================================================================

    @Nested
    @DisplayName("deleteWeightLog()")
    class DeleteWeightLogTests {

        @Test
        @DisplayName("should delete weight log when user owns it")
        void shouldDeleteWeightLogWhenUserOwnsIt() {
            // Given
            WeightLog log = createWeightLog(1L, today, new BigDecimal("75.0"));
            log.setUserId(userId);

            when(weightLogRepository.findById(1L)).thenReturn(Optional.of(log));

            // When
            weightLogService.deleteWeightLog(userId, 1L);

            // Then
            verify(weightLogRepository).delete(log);
        }

        @Test
        @DisplayName("should not delete weight log when user does not own it")
        void shouldNotDeleteWeightLogWhenUserDoesNotOwnIt() {
            // Given
            UUID otherUserId = UUID.randomUUID();
            WeightLog log = createWeightLog(1L, today, new BigDecimal("75.0"));
            log.setUserId(otherUserId);

            when(weightLogRepository.findById(1L)).thenReturn(Optional.of(log));

            // When
            weightLogService.deleteWeightLog(userId, 1L);

            // Then
            verify(weightLogRepository, never()).delete(any());
        }

        @Test
        @DisplayName("should do nothing when weight log does not exist")
        void shouldDoNothingWhenLogDoesNotExist() {
            // Given
            when(weightLogRepository.findById(999L)).thenReturn(Optional.empty());

            // When
            weightLogService.deleteWeightLog(userId, 999L);

            // Then
            verify(weightLogRepository, never()).delete(any());
        }
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private WeightLog createWeightLog(Long id, LocalDate date, BigDecimal weight) {
        return WeightLog.builder()
            .id(id)
            .userId(userId)
            .weightKg(weight)
            .logDate(date)
            .createdAt(OffsetDateTime.now())
            .build();
    }
}
