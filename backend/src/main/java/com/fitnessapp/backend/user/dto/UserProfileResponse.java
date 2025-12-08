package com.fitnessapp.backend.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserProfileResponse(
    UUID userId,
    Integer heightCm,
    BigDecimal weightKg,
    BigDecimal bmi,
    BigDecimal bodyFatPercentage,
    Integer basalMetabolicRate,
    FitnessGoal fitnessGoal,
    DietaryPreference dietaryPreference,
    Set<Allergen> allergens,
    Integer dailyCalorieTarget,
    Integer dailyProteinTarget,
    Integer dailyCarbsTarget,
    Integer dailyFatTarget,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
}

