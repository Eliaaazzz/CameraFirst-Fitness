package com.fitnessapp.backend.goals.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fitnessapp.backend.goals.entity.UserGoal;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Response DTO for user goals - matches frontend GeneratedGoals interface
 */
@Data
@Builder
public class UserGoalResponse {

    private UUID id;
    private String goalType;
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
    private OffsetDateTime generatedAt;
    private Boolean isActive;

    // Input parameters for reference
    private InputParameters inputParameters;

    @Data
    @Builder
    public static class DailyCalories {
        private Integer min;
        private Integer target;
        private Integer max;
        private String rationale;
    }

    @Data
    @Builder
    public static class MacrosGrams {
        @JsonProperty("protein_g")
        private Integer proteinG;

        @JsonProperty("carbs_g")
        private Integer carbsG;

        @JsonProperty("fat_g")
        private Integer fatG;

        private String notes;
    }

    @Data
    @Builder
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
    public static class MilestoneItem {
        private String id;
        private String title;
        private String frequency;
        private String metric;
    }

    @Data
    @Builder
    public static class InputParameters {
        private String sex;
        private Integer heightCm;
        private Integer weightKg;
        private String activityLevel;
    }

    /**
     * Convert entity to response DTO
     */
    public static UserGoalResponse fromEntity(UserGoal entity) {
        if (entity == null) {
            return null;
        }

        List<MilestoneItem> milestones = null;
        if (entity.getMilestonesChecklist() != null) {
            milestones = entity.getMilestonesChecklist().stream()
                    .map(m -> MilestoneItem.builder()
                            .id(m.getId())
                            .title(m.getTitle())
                            .frequency(m.getFrequency())
                            .metric(m.getMetric())
                            .build())
                    .collect(Collectors.toList());
        }

        return UserGoalResponse.builder()
                .id(entity.getId())
                .goalType(entity.getGoalType())
                .dailyCalories(DailyCalories.builder()
                        .min(entity.getDailyCaloriesMin())
                        .target(entity.getDailyCaloriesTarget())
                        .max(entity.getDailyCaloriesMax())
                        .rationale(entity.getDailyCaloriesRationale())
                        .build())
                .macrosGrams(MacrosGrams.builder()
                        .proteinG(entity.getProteinG())
                        .carbsG(entity.getCarbsG())
                        .fatG(entity.getFatG())
                        .notes(entity.getMacrosNotes())
                        .build())
                .sugarLimitGPerDay(entity.getSugarLimitG())
                .fiberTargetGPerDay(entity.getFiberTargetG())
                .weeklyActivityPlan(WeeklyActivityPlan.builder()
                        .cardioMinutesPerWeek(entity.getCardioMinutesPerWeek())
                        .strengthSessionsPerWeek(entity.getStrengthSessionsPerWeek())
                        .stepsPerDayTarget(entity.getStepsPerDayTarget())
                        .notes(entity.getActivityNotes())
                        .build())
                .milestonesChecklist(milestones)
                .safetyNote(entity.getSafetyNote())
                .generatedAt(entity.getGeneratedAt())
                .isActive(entity.getIsActive())
                .inputParameters(InputParameters.builder()
                        .sex(entity.getInputSex())
                        .heightCm(entity.getInputHeightCm())
                        .weightKg(entity.getInputWeightKg())
                        .activityLevel(entity.getInputActivityLevel())
                        .build())
                .build();
    }
}
