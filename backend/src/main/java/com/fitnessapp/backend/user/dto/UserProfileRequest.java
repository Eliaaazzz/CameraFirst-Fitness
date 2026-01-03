package com.fitnessapp.backend.user.dto;

import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import com.fitnessapp.backend.user.entity.HealthMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record UserProfileRequest(
    @Positive(message = "Height must be positive") Integer heightCm,
    @DecimalMin(value = "0.0", inclusive = false, message = "Weight must be positive") BigDecimal weightKg,
    @DecimalMin(value = "0.0", inclusive = false, message = "Body fat must be positive") BigDecimal bodyFatPercentage,
    @Positive(message = "BMR must be positive") Integer basalMetabolicRate,
    FitnessGoal fitnessGoal,
    DietaryPreference dietaryPreference,
    HealthMode healthMode,
    @Positive(message = "Calories must be positive") Integer dailyCalorieTarget,
    @Positive(message = "Protein target must be positive") Integer dailyProteinTarget,
    @Positive(message = "Carbs target must be positive") Integer dailyCarbsTarget,
    @Positive(message = "Fat target must be positive") Integer dailyFatTarget
) {
}

