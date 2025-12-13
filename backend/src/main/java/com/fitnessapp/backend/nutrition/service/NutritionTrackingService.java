package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.user.entity.User;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import com.fitnessapp.backend.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionTrackingService {

  // Default nutrition targets for users without a profile
  private static final int DEFAULT_DAILY_CALORIES = 2000;
  private static final int DEFAULT_DAILY_PROTEIN = 130;
  private static final int DEFAULT_DAILY_CARBS = 220;
  private static final int DEFAULT_DAILY_FAT = 70;

  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  private final UserRepository userRepository;

  @Transactional
  public MealLog logMeal(MealLog payload) {
    if (payload.getConsumedAt() == null) {
      payload.setConsumedAt(OffsetDateTime.now());
    }
    return mealLogRepository.save(payload);
  }

  @Transactional(readOnly = true)
  public NutritionSummary dailySummary(UUID userId, LocalDate date) {
    OffsetDateTime start = startOfDay(date);
    OffsetDateTime end = start.plusDays(1);
    return buildSummary(userId, start, end, 1);
  }

  @Transactional(readOnly = true)
  public NutritionSummary weeklySummary(UUID userId, LocalDate weekStart) {
    OffsetDateTime start = startOfDay(weekStart);
    OffsetDateTime end = start.plusDays(7);
    return buildSummary(userId, start, end, 7);
  }

  @Transactional(readOnly = true)
  public List<MealLog> mealsBetween(UUID userId, LocalDate startDate, LocalDate endDate) {
    OffsetDateTime start = startOfDay(startDate);
    OffsetDateTime end = startOfDay(endDate).plusDays(1);
    return mealLogRepository.findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(userId, start, end);
  }

  private NutritionSummary buildSummary(UUID userId, OffsetDateTime start, OffsetDateTime end, int days) {
    int calories = Optional.ofNullable(mealLogRepository.sumCalories(userId, start, end))
        .map(Long::intValue).orElse(0);
    BigDecimal protein = Optional.ofNullable(mealLogRepository.sumProtein(userId, start, end)).orElse(BigDecimal.ZERO);
    BigDecimal carbs = Optional.ofNullable(mealLogRepository.sumCarbs(userId, start, end)).orElse(BigDecimal.ZERO);
    BigDecimal fat = Optional.ofNullable(mealLogRepository.sumFat(userId, start, end)).orElse(BigDecimal.ZERO);

    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseGet(() -> createDefaultProfile(userId));

    int targetCalories = Optional.ofNullable(profile.getDailyCalorieTarget()).orElse(2000) * days;
    BigDecimal targetProtein = BigDecimal.valueOf(Optional.ofNullable(profile.getDailyProteinTarget()).orElse(130) * days);
    BigDecimal targetCarbs = BigDecimal.valueOf(Optional.ofNullable(profile.getDailyCarbsTarget()).orElse(220) * days);
    BigDecimal targetFat = BigDecimal.valueOf(Optional.ofNullable(profile.getDailyFatTarget()).orElse(70) * days);

    List<String> alerts = generateNutritionAlerts(
        new NutritionMetric(calories, targetCalories),
        new NutritionMetric(protein, targetProtein),
        new NutritionMetric(carbs, targetCarbs),
        new NutritionMetric(fat, targetFat),
        days
    );

    return new NutritionSummary(
        start,
        end,
        days,
        new NutritionMetric(calories, targetCalories),
        new NutritionMetric(protein, targetProtein),
        new NutritionMetric(carbs, targetCarbs),
        new NutritionMetric(fat, targetFat),
        alerts
    );
  }

  private OffsetDateTime startOfDay(LocalDate date) {
    return date.atStartOfDay().atOffset(ZoneOffset.UTC);
  }

  /**
   * Create a default user profile with standard nutrition targets
   * This ensures the nutrition tracking API never fails due to missing profiles
   * 
   * @param userId The user ID to create a profile for
   * @return The newly created default profile, or a transient profile if user doesn't exist
   */
  @Transactional
  private UserProfile createDefaultProfile(UUID userId) {
    log.warn("Creating default user profile for userId: {} as none exists", userId);
    
    // Try to get the user entity (required for @MapsId relationship)
    Optional<User> userOptional = userRepository.findById(userId);
    User user;
    
    if (userOptional.isEmpty()) {
      // If user doesn't exist, create and save the user first
      log.warn("User {} doesn't exist, creating default user", userId);
      User newUser = User.builder()
          .id(userId)
          .email("user-" + userId + "@generated.fitnessapp.com")
          .timeBucket(20)
          .level("beginner")
          .dietTilt("lighter")
          .authProvider(com.fitnessapp.backend.auth.AuthProvider.LOCAL)
          .build();
      
      try {
        user = userRepository.save(newUser);
        log.info("Created default user: {}", userId);
      } catch (Exception e) {
        log.error("Failed to create default user {}: {}", userId, e.getMessage());
        // Return a transient default profile without saving
        return createTransientProfile(userId);
      }
    } else {
      user = userOptional.get();
    }
    
    // Create profile using builder - @MapsId will derive the ID from the user relationship
    UserProfile defaultProfile = UserProfile.builder()
        .user(user)
        .dailyCalorieTarget(DEFAULT_DAILY_CALORIES)
        .dailyProteinTarget(DEFAULT_DAILY_PROTEIN)
        .dailyCarbsTarget(DEFAULT_DAILY_CARBS)
        .dailyFatTarget(DEFAULT_DAILY_FAT)
        .fitnessGoal(com.fitnessapp.backend.user.entity.FitnessGoal.MAINTAIN)
        .dietaryPreference(com.fitnessapp.backend.user.entity.DietaryPreference.NONE)
        .build();
    
    try {
      return userProfileRepository.save(defaultProfile);
    } catch (Exception e) {
      log.error("Failed to save default profile for user {}: {}", userId, e.getMessage());
      // Return a transient default profile without saving
      return createTransientProfile(userId);
    }
  }
  
  /**
   * Create a transient (non-persisted) profile with default values
   * Used as a fallback when database operations fail
   */
  private UserProfile createTransientProfile(UUID userId) {
    log.warn("Creating transient profile for userId: {}", userId);
    return UserProfile.builder()
        .dailyCalorieTarget(DEFAULT_DAILY_CALORIES)
        .dailyProteinTarget(DEFAULT_DAILY_PROTEIN)
        .dailyCarbsTarget(DEFAULT_DAILY_CARBS)
        .dailyFatTarget(DEFAULT_DAILY_FAT)
        .fitnessGoal(com.fitnessapp.backend.user.entity.FitnessGoal.MAINTAIN)
        .dietaryPreference(com.fitnessapp.backend.user.entity.DietaryPreference.NONE)
        .build();
  }

  public record NutritionSummary(OffsetDateTime rangeStart,
                                 OffsetDateTime rangeEnd,
                                 int days,
                                 NutritionMetric calories,
                                 NutritionMetric protein,
                                 NutritionMetric carbs,
                                 NutritionMetric fat,
                                 List<String> alerts) {}

  public record NutritionMetric(BigDecimal actual, BigDecimal target) {
    public NutritionMetric(int actual, int target) {
      this(BigDecimal.valueOf(actual), BigDecimal.valueOf(target));
    }

    public double percent() {
      if (target.compareTo(BigDecimal.ZERO) <= 0) {
        return 0.0;
      }
      BigDecimal percentage = actual.divide(target, 4, java.math.RoundingMode.HALF_UP)
          .multiply(BigDecimal.valueOf(100));
      return Math.min(999.0, percentage.doubleValue());
    }
  }

  /**
   * 根据营养摄入与目标的比例生成预警信息
   * 超过120%为超标，低于50%为摄入不足
   */
  private List<String> generateNutritionAlerts(
      NutritionMetric calories,
      NutritionMetric protein,
      NutritionMetric carbs,
      NutritionMetric fat,
      int days
  ) {
    List<String> alerts = new java.util.ArrayList<>();
    String period = days == 1 ? "今日" : "本周";

    BigDecimal threshold120 = new BigDecimal("1.2");
    BigDecimal threshold70 = new BigDecimal("0.7");
    BigDecimal threshold60 = new BigDecimal("0.6");
    BigDecimal threshold50 = new BigDecimal("0.5");

    if (calories.actual.compareTo(calories.target.multiply(threshold120)) > 0) {
      int excess = calories.actual.subtract(calories.target).intValue();
      alerts.add(String.format("⚠️ %s卡路里超标 %d kcal (%.0f%%)，建议适量减少摄入",
          period, excess, calories.percent()));
    } else if (calories.actual.compareTo(calories.target.multiply(threshold50)) < 0) {
      int deficit = calories.target.subtract(calories.actual).intValue();
      alerts.add(String.format("⚠️ %s卡路里摄入不足 %d kcal (仅%.0f%%)，可能影响训练表现",
          period, deficit, calories.percent()));
    }

    if (protein.actual.compareTo(protein.target.multiply(threshold120)) > 0) {
      alerts.add(String.format("⚠️ %s蛋白质超标 %.0fg (%.0f%%)，过量可能增加肾脏负担",
          period, protein.actual.subtract(protein.target).doubleValue(), protein.percent()));
    } else if (protein.actual.compareTo(protein.target.multiply(threshold70)) < 0) {
      alerts.add(String.format("⚠️ %s蛋白质不足 (仅%.0f%%)，建议增加优质蛋白来源",
          period, protein.percent()));
    }

    if (carbs.actual.compareTo(carbs.target.multiply(threshold120)) > 0) {
      alerts.add(String.format("⚠️ %s碳水化合物超标 %.0fg (%.0f%%)，注意控制主食摄入",
          period, carbs.actual.subtract(carbs.target).doubleValue(), carbs.percent()));
    } else if (carbs.actual.compareTo(carbs.target.multiply(threshold60)) < 0) {
      alerts.add(String.format("⚠️ %s碳水摄入过低 (%.0f%%)，可能导致训练能量不足",
          period, carbs.percent()));
    }

    if (fat.actual.compareTo(fat.target.multiply(threshold120)) > 0) {
      alerts.add(String.format("⚠️ %s脂肪超标 %.0fg (%.0f%%)，建议减少油炸/高脂食物",
          period, fat.actual.subtract(fat.target).doubleValue(), fat.percent()));
    } else if (fat.actual.compareTo(fat.target.multiply(threshold50)) < 0) {
      alerts.add(String.format("⚠️ %s脂肪摄入不足 (%.0f%%)，适量脂肪有助于激素合成",
          period, fat.percent()));
    }

    return alerts;
  }
}
