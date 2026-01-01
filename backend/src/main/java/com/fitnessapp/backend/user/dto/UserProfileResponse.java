package com.fitnessapp.backend.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.HealthMode;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserProfileResponse(
    UUID userId,
    Integer heightCm,
    BigDecimal weightKg,
    BigDecimal bmi,
    BigDecimal bodyFatPercentage,
    Integer basalMetabolicRate,
    FitnessGoal fitnessGoal,
    DietaryPreference dietaryPreference,
    HealthMode healthMode,
    Integer dailyCalorieTarget,
    Integer dailyProteinTarget,
    Integer dailyCarbsTarget,
    Integer dailyFatTarget,
    @JsonInclude(JsonInclude.Include.ALWAYS)
    String avatarUrl,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}