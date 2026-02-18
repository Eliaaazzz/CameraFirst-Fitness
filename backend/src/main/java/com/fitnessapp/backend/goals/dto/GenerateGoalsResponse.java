package com.fitnessapp.backend.goals.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for generated fitness goals.
 * Matches the exact schema required by the frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateGoalsResponse {

    private DailyCalories dailyCalories;

    @JsonProperty("macros_grams")
    private MacrosGrams macrosGrams;

    @JsonProperty("sugarLimit_g_per_day")
    private Integer sugarLimitGPerDay;

    @JsonProperty("fiberTarget_g_per_day")
    private Integer fiberTargetGPerDay;

    private WeeklyActivityPlan weeklyActivityPlan;

    private List<MilestoneItem> milestonesChecklist;

    private String safetyNote;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyCalories {
        private Integer min;
        private Integer target;
        private Integer max;
        private String rationale;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MacrosGrams {
        @JsonProperty("protein_g")
        private Integer proteinG;

        @JsonProperty("carbs_g")
        private Integer carbsG;

        @JsonProperty("fat_g")
        private Integer fatG;

        @JsonProperty("blood_sugar_rise_mg_dl")
        private Integer bloodSugarRiseMgDl;

        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyActivityPlan {
        @JsonProperty("cardio_minutes_per_week")
        private Integer cardioMinutesPerWeek;

        @JsonProperty("strength_sessions_per_week")
        private Integer strengthSessionsPerWeek;

        @JsonProperty("steps_per_day_target")
        private Integer stepsPerDayTarget;

        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneItem {
        private String id;
        private String title;
        private String frequency;
        private String metric;
    }
}
