package com.fitnessapp.backend.goals.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Request DTO for saving generated goals to the database
 */
@Data
public class SaveGoalRequest {

    @NotNull(message = "userId is required")
    private UUID userId;

    @NotNull(message = "goalType is required")
    private String goalType;

    // Daily calories
    @NotNull
    private DailyCalories dailyCalories;

    // Macros
    @NotNull
    private MacrosGrams macrosGrams;

    // Other targets
    private Integer sugarLimitGPerDay;
    private Integer fiberTargetGPerDay;

    // Weekly activity plan
    private WeeklyActivityPlan weeklyActivityPlan;

    // Milestones
    private List<MilestoneItem> milestonesChecklist;

    // Safety note
    private String safetyNote;

    // Input parameters (optional, for regeneration)
    private String sex;
    private Integer heightCm;
    private Integer weightKg;
    private Integer age;
    private String activityLevel;

    @Data
    public static class DailyCalories {
        private Integer min;
        private Integer target;
        private Integer max;
        private String rationale;
    }

    @Data
    public static class MacrosGrams {
        private Integer proteinG;
        private Integer carbsG;
        private Integer fatG;
        private String notes;
    }

    @Data
    public static class WeeklyActivityPlan {
        private Integer cardioMinutesPerWeek;
        private Integer strengthSessionsPerWeek;
        private Integer stepsPerDayTarget;
        private String notes;
    }

    @Data
    public static class MilestoneItem {
        private String id;
        private String title;
        private String frequency;
        private String metric;
    }
}
