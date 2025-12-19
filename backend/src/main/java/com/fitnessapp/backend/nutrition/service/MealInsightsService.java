package com.fitnessapp.backend.nutrition.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository.DailyNutritionSummary;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository.WeeklySummary;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for generating weekly nutrition insights
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealInsightsService {

  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;

  @PersistenceContext
  private EntityManager entityManager;

  // Default targets
  private static final int DEFAULT_DAILY_CALORIES = 2000;
  private static final int DEFAULT_DAILY_PROTEIN = 130;
  private static final int DEFAULT_DAILY_CARBS = 220;
  private static final int DEFAULT_DAILY_FAT = 70;
  private static final int DEFAULT_DAILY_SUGAR = 25;

  /**
   * Generate weekly insights for a user
   *
   * @param userId User ID
   * @param endDate End date (defaults to today in user's timezone), looks back 7 days
   * @param timezone User's IANA timezone (e.g., "Australia/Sydney"), defaults to UTC
   * @return Weekly insights response
   */
  public WeeklyInsightsResponse getWeeklyInsights(UUID userId, LocalDate endDate, String timezone) {
    // Parse timezone, default to UTC if not provided or invalid
    ZoneId zone = ZoneOffset.UTC;
    if (timezone != null && !timezone.isEmpty()) {
      try {
        zone = ZoneId.of(timezone);
      } catch (Exception e) {
        log.warn("Invalid timezone '{}', using UTC", timezone);
      }
    }
    
    LocalDate end = endDate != null ? endDate : LocalDate.now(zone);
    LocalDate start = end.minusDays(6); // 7 days including end date

    log.info("Generating weekly insights for user: {}, from {} to {} (timezone: {})", userId, start, end, zone);

    // Calculate date range in user's timezone
    OffsetDateTime startDateTime = start.atStartOfDay(zone).toOffsetDateTime();
    OffsetDateTime endDateTime = end.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

    // Get user goals
    UserProfile profile = fetchFreshUserProfile(userId);
    int calorieTarget = profile != null && profile.getDailyCalorieTarget() != null
        ? profile.getDailyCalorieTarget() : DEFAULT_DAILY_CALORIES;
    int proteinTarget = profile != null && profile.getDailyProteinTarget() != null
        ? profile.getDailyProteinTarget() : DEFAULT_DAILY_PROTEIN;
    int carbsTarget = profile != null && profile.getDailyCarbsTarget() != null
        ? profile.getDailyCarbsTarget() : DEFAULT_DAILY_CARBS;
    int fatTarget = profile != null && profile.getDailyFatTarget() != null
        ? profile.getDailyFatTarget() : DEFAULT_DAILY_FAT;

    // Get weekly summary
    WeeklySummary weeklySummary = mealLogRepository.getWeeklySummary(userId, startDateTime, endDateTime);

    long totalMeals = weeklySummary != null && weeklySummary.getTotalMeals() != null
        ? weeklySummary.getTotalMeals() : 0;
    long totalCalories = weeklySummary != null && weeklySummary.getTotalCalories() != null
        ? weeklySummary.getTotalCalories() : 0;
    double totalProtein = weeklySummary != null && weeklySummary.getTotalProtein() != null
        ? weeklySummary.getTotalProtein().doubleValue() : 0;
    double totalCarbs = weeklySummary != null && weeklySummary.getTotalCarbs() != null
        ? weeklySummary.getTotalCarbs().doubleValue() : 0;
    double totalFat = weeklySummary != null && weeklySummary.getTotalFat() != null
        ? weeklySummary.getTotalFat().doubleValue() : 0;

    double avgDailyCalories = totalCalories / 7.0;
    double avgProtein = totalProtein / 7.0;
    double avgCarbs = totalCarbs / 7.0;
    double avgFat = totalFat / 7.0;
    double avgSugar = 0; // We don't track sugar currently

    // Get daily breakdown
    List<DailyNutritionSummary> dailySummaries = mealLogRepository.getDailyNutritionSummary(
        userId, startDateTime, endDateTime);

    List<DailyData> dailyData = new ArrayList<>();
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM d");

    for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
      final LocalDate currentDate = date;
      DailyNutritionSummary daySummary = dailySummaries.stream()
          .filter(s -> s.getDate() != null && s.getDate().equals(currentDate))
          .findFirst()
          .orElse(null);

      long dayCalories = daySummary != null && daySummary.getTotalCalories() != null
          ? daySummary.getTotalCalories() : 0;
      double dayProtein = daySummary != null && daySummary.getTotalProtein() != null
          ? daySummary.getTotalProtein().doubleValue() : 0;
      double dayCarbs = daySummary != null && daySummary.getTotalCarbs() != null
          ? daySummary.getTotalCarbs().doubleValue() : 0;
      double dayFat = daySummary != null && daySummary.getTotalFat() != null
          ? daySummary.getTotalFat().doubleValue() : 0;
      long mealCount = daySummary != null && daySummary.getMealCount() != null
          ? daySummary.getMealCount() : 0;

      double percentage = calorieTarget > 0 ? (dayCalories * 100.0 / calorieTarget) : 0;

      dailyData.add(new DailyData(
          date.format(formatter),
          new CaloriesData(dayCalories, calorieTarget, percentage),
          dayProtein,
          dayCarbs,
          dayFat,
          0, // sugar
          mealCount
      ));
    }

    // Calculate macros distribution
    double totalMacroCalories = (totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9);

    double proteinPercentage = totalMacroCalories > 0 ? (totalProtein * 4 * 100 / totalMacroCalories) : 0;
    double carbsPercentage = totalMacroCalories > 0 ? (totalCarbs * 4 * 100 / totalMacroCalories) : 0;
    double fatPercentage = totalMacroCalories > 0 ? (totalFat * 9 * 100 / totalMacroCalories) : 0;

    MacrosDistribution macros = new MacrosDistribution(
        new MacroDetail(totalProtein, proteinPercentage, (long)(totalProtein * 4)),
        new MacroDetail(totalCarbs, carbsPercentage, (long)(totalCarbs * 4)),
        new MacroDetail(totalFat, fatPercentage, (long)(totalFat * 9))
    );

    // Sugar warning (placeholder - we don't track sugar)
    SugarWarning sugarWarning = new SugarWarning(
        false,
        0,
        DEFAULT_DAILY_SUGAR,
        0,
        ""
    );

    // User goals
    UserGoal userGoal = new UserGoal(
        calorieTarget,
        proteinTarget,
        carbsTarget,
        fatTarget
    );

    return new WeeklyInsightsResponse(
        new DateRange(start.toString(), end.toString()),
        new Summary(totalMeals, totalCalories, avgDailyCalories, avgProtein, avgCarbs, avgFat, avgSugar),
        dailyData,
        macros,
        sugarWarning,
        userGoal
    );
  }

  /**
   * Fetch the latest user profile from the database to avoid stale goal values.
   */
  private UserProfile fetchFreshUserProfile(UUID userId) {
    UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
    if (profile != null) {
      try {
        entityManager.refresh(profile);
      } catch (IllegalArgumentException e) {
        log.warn("Failed to refresh user profile for {}, returning loaded entity", userId);
      }
    }
    return profile;
  }

  // Response DTOs
  public record WeeklyInsightsResponse(
      DateRange dateRange,
      Summary summary,
      List<DailyData> dailyData,
      MacrosDistribution macrosDistribution,
      SugarWarning sugarWarning,
      UserGoal userGoal
  ) {}

  public record DateRange(String startDate, String endDate) {}

  public record Summary(
      long totalMeals,
      long totalCalories,
      double averageDailyCalories,
      double averageProtein,
      double averageCarbs,
      double averageFat,
      double averageSugar
  ) {}

  public record DailyData(
      String date,
      CaloriesData calories,
      double protein,
      double carbs,
      double fat,
      double sugar,
      long mealCount
  ) {}

  public record CaloriesData(long actual, long target, double percentage) {}

  public record MacrosDistribution(
      MacroDetail protein,
      MacroDetail carbs,
      MacroDetail fat
  ) {}

  public record MacroDetail(double grams, double percentage, long caloriesFromMacro) {}

  public record SugarWarning(
      boolean hasWarning,
      double averageDailySugar,
      int recommendedLimit,
      int daysExceeded,
      String message
  ) {}

  public record UserGoal(
      Integer dailyCalorieTarget,
      Integer dailyProteinTarget,
      Integer dailyCarbsTarget,
      Integer dailyFatTarget
  ) {}
}
