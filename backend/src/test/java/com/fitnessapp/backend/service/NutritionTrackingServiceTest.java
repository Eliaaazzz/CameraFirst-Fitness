package com.fitnessapp.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NutritionTrackingServiceTest {

  @Mock
  private MealLogRepository mealLogRepository;

  @Mock
  private UserProfileRepository userProfileRepository;

  @Mock
  private UserRepository userRepository;

  private NutritionTrackingService service;

  private UUID userId;

  @BeforeEach
  void setUp() {
    service = new NutritionTrackingService(mealLogRepository, userProfileRepository, userRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void logMealDefaultsTimestamp() {
    MealLog request = MealLog.builder()
        .userId(userId)
        .mealType("breakfast")
        .calories(400)
        .build();

    when(mealLogRepository.save(any(MealLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

    MealLog saved = service.logMeal(request);

    assertThat(saved.getConsumedAt()).isNotNull();
  }

  @Test
  void dailySummaryAggregatesTotals() {
    LocalDate targetDate = LocalDate.of(2025, 11, 4);

    when(mealLogRepository.sumCalories(any(), any(), any())).thenReturn(1800L);
    when(mealLogRepository.sumProtein(any(), any(), any())).thenReturn(120.0);
    when(mealLogRepository.sumCarbs(any(), any(), any())).thenReturn(150.0);
    when(mealLogRepository.sumFat(any(), any(), any())).thenReturn(45.0);

    UserProfile profile = new UserProfile();
    profile.setUserId(userId);
    profile.setUser(User.builder().id(userId).email("x@test.com").timeBucket(1).level("BEGINNER").dietTilt("BALANCED").build());
    profile.setDailyCalorieTarget(2200);
    profile.setDailyProteinTarget(160);
    profile.setDailyCarbsTarget(240);
    profile.setDailyFatTarget(70);
    when(userProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

    var summary = service.dailySummary(userId, targetDate);

    assertThat(summary.calories().actual()).isEqualTo(1800);
    assertThat(summary.calories().target()).isEqualTo(2200);
    assertThat(summary.calories().percent()).isBetween(80.0, 82.0);
    assertThat(summary.protein().actual()).isEqualTo(120.0);
    assertThat(summary.protein().target()).isEqualTo(160.0);
  }
}
