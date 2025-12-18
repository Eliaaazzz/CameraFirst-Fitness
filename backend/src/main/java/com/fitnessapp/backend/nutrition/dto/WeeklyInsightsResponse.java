package com.fitnessapp.backend.nutrition.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for weekly nutrition insights
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyInsightsResponse {
  private DateRange dateRange;
  private Summary summary;
  private List<DailyData> dailyData;
  private MacrosDistribution macrosDistribution;
  private SugarWarning sugarWarning;
  private UserGoal userGoal;
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DateRange {
    private String startDate;
    private String endDate;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Summary {
    private Long totalMeals;
    private Long totalCalories;
    private Double averageDailyCalories;
    private Double averageProtein;
    private Double averageCarbs;
    private Double averageFat;
    private Double averageSugar;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DailyData {
    private String date;
    private CaloriesData calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    private Double sugar;
    private Integer mealCount;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CaloriesData {
    private Integer actual;
    private Integer target;
    private Double percentage;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MacrosDistribution {
    private MacroDetail protein;
    private MacroDetail carbs;
    private MacroDetail fat;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MacroDetail {
    private Double grams;
    private Double percentage;
    private Integer caloriesFromMacro;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SugarWarning {
    private Boolean hasWarning;
    private Double averageDailySugar;
    private Double recommendedLimit;
    private Integer daysExceeded;
    private String message;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class UserGoal {
    private Integer dailyCalorieTarget;
    private Integer dailyProteinTarget;
    private Integer dailyCarbsTarget;
    private Integer dailyFatTarget;
  }
}
