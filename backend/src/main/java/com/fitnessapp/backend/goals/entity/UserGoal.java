package com.fitnessapp.backend.goals.entity;

import com.fitnessapp.backend.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGoal {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "goal_type", nullable = false, length = 32)
    private String goalType;

    // Daily calories
    @Column(name = "daily_calories_min", nullable = false)
    private Integer dailyCaloriesMin;

    @Column(name = "daily_calories_target", nullable = false)
    private Integer dailyCaloriesTarget;

    @Column(name = "daily_calories_max", nullable = false)
    private Integer dailyCaloriesMax;

    @Column(name = "daily_calories_rationale", columnDefinition = "TEXT")
    private String dailyCaloriesRationale;

    // Macros
    @Column(name = "protein_g", nullable = false)
    private Integer proteinG;

    @Column(name = "carbs_g", nullable = false)
    private Integer carbsG;

    @Column(name = "fat_g", nullable = false)
    private Integer fatG;

    @Column(name = "macros_notes", columnDefinition = "TEXT")
    private String macrosNotes;

    // Other targets
    @Column(name = "sugar_limit_g", nullable = false)
    @Builder.Default
    private Integer sugarLimitG = 25;

    @Column(name = "fiber_target_g", nullable = false)
    @Builder.Default
    private Integer fiberTargetG = 25;

    // Weekly activity plan
    @Column(name = "cardio_minutes_per_week", nullable = false)
    @Builder.Default
    private Integer cardioMinutesPerWeek = 150;

    @Column(name = "strength_sessions_per_week", nullable = false)
    @Builder.Default
    private Integer strengthSessionsPerWeek = 3;

    @Column(name = "steps_per_day_target", nullable = false)
    @Builder.Default
    private Integer stepsPerDayTarget = 8000;

    @Column(name = "activity_notes", columnDefinition = "TEXT")
    private String activityNotes;

    // Milestones as JSON
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "milestones_checklist", columnDefinition = "jsonb")
    private List<MilestoneItem> milestonesChecklist;

    @Column(name = "safety_note", columnDefinition = "TEXT")
    private String safetyNote;

    // Input parameters for regeneration
    @Column(name = "input_sex", length = 20)
    private String inputSex;

    @Column(name = "input_height_cm")
    private Integer inputHeightCm;

    @Column(name = "input_weight_kg")
    private Integer inputWeightKg;

    @Column(name = "input_age")
    private Integer inputAge;

    @Column(name = "input_activity_level", length = 20)
    private String inputActivityLevel;

    // Metadata
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "generated_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime generatedAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PrePersist
    void onCreate() {
        if (generatedAt == null) {
            generatedAt = OffsetDateTime.now();
        }
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MilestoneItem {
        private String id;
        private String title;
        private String frequency;
        private String metric;
    }
}
