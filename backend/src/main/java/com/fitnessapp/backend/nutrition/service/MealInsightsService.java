package com.fitnessapp.backend.nutrition.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.CaloriesData;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.DailyData;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.DateRange;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.MacroDetail;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.MacrosDistribution;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.SugarWarning;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.Summary;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.UserGoal;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for meal insights and analytics
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealInsightsService {

  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  
  private static final int DAYS_IN_WEEK = 7;
  private static final BigDecimal RECOMMENDED_DAILY_SUGAR_LIMIT = new BigDecimal("50.0");
  
  // Calorie conversion factors (calories per gram)
  private static final BigDecimal CALORIES_PER_GRAM_PROTEIN = new BigDecimal("4");
  private static final BigDecimal CALORIES_PER_GRAM_CARBS = new BigDecimal("4");
  private static final BigDecimal CALORIES_PER_GRAM_FAT = new BigDecimal("9");

  /**
   * Get weekly nutrition insights for a user
   * 
   * @param userId User ID
   * @param endDate End date (defaults to today), will look back 7 days
   * @return Weekly insights data
   */
  public WeeklyInsightsResponse getWeeklyInsights(UUID userId, LocalDate endDate) {
    log.info("Generating weekly insights for user: {}, endDate: {}", userId, endDate);
    
    // Get user profile for goals
    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));
    
    // Calculate date range (last 7 days)
    LocalDate end = endDate != null ? endDate : LocalDate.now();
    LocalDate start = end.minusDays(DAYS_IN_WEEK - 1);
    
    OffsetDateTime startDateTime = start.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime endDateTime = end.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
    
    // Fetch weekly summary
    MealLogRepository.WeeklySummary weeklySummary = 
        mealLogRepository.getWeeklySummary(userId, startDateTime, endDateTime);
    
    // Fetch daily summaries
    List<MealLogRepository.DailyNutritionSummary> dailySummaries = 
        mealLogRepository.getDailyNutritionSummary(userId, startDateTime, endDateTime);
    
    // Build response
    return buildWeeklyInsightsResponse(
        profile, 
        weeklySummary, 
        dailySummaries, 
        start, 
        end
    );
  }
  
  private WeeklyInsightsResponse buildWeeklyInsightsResponse(
      UserProfile profile,
      MealLogRepository.WeeklySummary weeklySummary,
      List<MealLogRepository.DailyNutritionSummary> dailySummaries,
      LocalDate start,
      LocalDate end
  ) {
    // Extract totals (with null safety)
    long totalMeals = weeklySummary.getTotalMeals() != null ? weeklySummary.getTotalMeals() : 0L;
    long totalCalories = weeklySummary.getTotalCalories() != null ? weeklySummary.getTotalCalories() : 0L;
    BigDecimal totalProtein = weeklySummary.getTotalProtein() != null ? weeklySummary.getTotalProtein() : BigDecimal.ZERO;
    BigDecimal totalCarbs = weeklySummary.getTotalCarbs() != null ? weeklySummary.getTotalCarbs() : BigDecimal.ZERO;
    BigDecimal totalFat = weeklySummary.getTotalFat() != null ? weeklySummary.getTotalFat() : BigDecimal.ZERO;
    
    // Calculate averages
    double avgDailyCalories = totalCalories / (double) DAYS_IN_WEEK;
    double avgProtein = totalProtein.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    double avgCarbs = totalCarbs.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    double avgFat = totalFat.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    
    // Build daily data
    List<DailyData> dailyDataList = buildDailyDataList(dailySummaries, profile);
    
    // Build macros distribution
    MacrosDistribution macrosDistribution = buildMacrosDistribution(totalProtein, totalCarbs, totalFat);
    
    // Build sugar warning (placeholder for now)
    SugarWarning sugarWarning = buildSugarWarning();
    
    // Build user goals
    UserGoal userGoal = UserGoal.builder()
        .dailyCalorieTarget(profile.getDailyCalorieTarget())
        .dailyProteinTarget(profile.getDailyProteinTarget())
        .dailyCarbsTarget(profile.getDailyCarbsTarget())
        .dailyFatTarget(profile.getDailyFatTarget())
        .build();
    
    return WeeklyInsightsResponse.builder()
        .dateRange(DateRange.builder()
            .startDate(start.toString())
            .endDate(end.toString())
            .build())
        .summary(Summary.builder()
            .totalMeals(totalMeals)
            .totalCalories(totalCalories)
            .averageDailyCalories(Math.round(avgDailyCalories * 10.0) / 10.0)
            .averageProtein(Math.round(avgProtein * 10.0) / 10.0)
            .averageCarbs(Math.round(avgCarbs * 10.0) / 10.0)
            .averageFat(Math.round(avgFat * 10.0) / 10.0)
            .averageSugar(0.0) // TODO: Add sugar field
            .build())
        .dailyData(dailyDataList)
        .macrosDistribution(macrosDistribution)
        .sugarWarning(sugarWarning)
        .userGoal(userGoal)
        .build();
  }
  
  private List<DailyData> buildDailyDataList(
      List<MealLogRepository.DailyNutritionSummary> summaries,
      UserProfile profile
  ) {
    List<DailyData> dailyDataList = new ArrayList<>();
    Integer calorieTarget = profile.getDailyCalorieTarget() != null ? profile.getDailyCalorieTarget() : 2000;
    
    for (MealLogRepository.DailyNutritionSummary summary : summaries) {
      long actualCalories = summary.getTotalCalories() != null ? summary.getTotalCalories() : 0L;
      double percentage = calorieTarget > 0 ? (actualCalories / (double) calorieTarget) * 100.0 : 0.0;
      
      DailyData dailyData = DailyData.builder()
          .date(summary.getDate().toString())
          .calories(CaloriesData.builder()
              .actual((int) actualCalories)
              .target(calorieTarget)
              .percentage(Math.round(percentage * 10.0) / 10.0)
              .build())
          .protein(summary.getTotalProtein() != null ? Math.round(summary.getTotalProtein().doubleValue() * 10.0) / 10.0 : 0.0)
          .carbs(summary.getTotalCarbs() != null ? Math.round(summary.getTotalCarbs().doubleValue() * 10.0) / 10.0 : 0.0)
          .fat(summary.getTotalFat() != null ? Math.round(summary.getTotalFat().doubleValue() * 10.0) / 10.0 : 0.0)
          .sugar(0.0) // TODO: Add sugar field
          .mealCount(summary.getMealCount() != null ? summary.getMealCount().intValue() : 0)
          .build();
      
      dailyDataList.add(dailyData);
    }
    
    return dailyDataList;
  }
  
  private MacrosDistribution buildMacrosDistribution(
      BigDecimal totalProtein, 
      BigDecimal totalCarbs, 
      BigDecimal totalFat
  ) {
    // Calculate calories from each macro
    BigDecimal caloriesFromProtein = totalProtein.multiply(CALORIES_PER_GRAM_PROTEIN);
    BigDecimal caloriesFromCarbs = totalCarbs.multiply(CALORIES_PER_GRAM_CARBS);
    BigDecimal caloriesFromFat = totalFat.multiply(CALORIES_PER_GRAM_FAT);
    
    // Calculate total calories
    BigDecimal totalCalories = caloriesFromProtein
        .add(caloriesFromCarbs)
        .add(caloriesFromFat);
    
    // Prevent division by zero
    if (totalCalories.compareTo(BigDecimal.ZERO) == 0) {
      return MacrosDistribution.builder()
          .protein(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromMacro(0).build())
          .carbs(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromMacro(0).build())
          .fat(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromMacro(0).build())
          .build();
    }
    
    // Calculate percentages
    double proteinPercent = caloriesFromProtein
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    double carbsPercent = caloriesFromCarbs
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    double fatPercent = caloriesFromFat
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    return MacrosDistribution.builder()
        .protein(MacroDetail.builder()
            .grams(Math.round(totalProtein.doubleValue() * 10.0) / 10.0)
            .percentage(Math.round(proteinPercent * 10.0) / 10.0)
            .caloriesFromMacro(caloriesFromProtein.intValue())
            .build())
        .carbs(MacroDetail.builder()
            .grams(Math.round(totalCarbs.doubleValue() * 10.0) / 10.0)
            .percentage(Math.round(carbsPercent * 10.0) / 10.0)
            .caloriesFromMacro(caloriesFromCarbs.intValue())
            .build())
        .fat(MacroDetail.builder()
            .grams(Math.round(totalFat.doubleValue() * 10.0) / 10.0)
            .percentage(Math.round(fatPercent * 10.0) / 10.0)
            .caloriesFromMacro(caloriesFromFat.intValue())
            .build())
        .build();
  }
  
  private SugarWarning buildSugarWarning() {
    // TODO: Current meal_log table doesn't have sugar field
    // This returns placeholder data until sugar tracking is implemented
    
    return SugarWarning.builder()
        .hasWarning(false)
        .averageDailySugar(0.0)
        .recommendedLimit(RECOMMENDED_DAILY_SUGAR_LIMIT.doubleValue())
        .daysExceeded(0)
        .message("Sugar tracking not available yet. Please update your meal logs.")
        .build();
  }
}
