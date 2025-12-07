package com.fitnessapp.backend.user.dto;

import com.fitnessapp.backend.user.entity.Allergen;
import com.fitnessapp.backend.user.entity.DietaryPreference;
import com.fitnessapp.backend.user.entity.FitnessGoal;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record UserProfileRequest(
    @Positive(message = "Height must be positive") Integer heightCm,
    @Positive(message = "Weight must be positive") Double weightKg,
    @Positive(message = "Body fat must be positive") Double bodyFatPercentage,
    @Positive(message = "BMR must be positive") Integer basalMetabolicRate,
    FitnessGoal fitnessGoal,
    DietaryPreference dietaryPreference,
    @Size(max = 8, message = "Allergen list too long") Set<Allergen> allergens,
    @Positive(message = "Calories must be positive") Integer dailyCalorieTarget,
    @Positive(message = "Protein target must be positive") Integer dailyProteinTarget,
    @Positive(message = "Carbs target must be positive") Integer dailyCarbsTarget,
    @Positive(message = "Fat target must be positive") Integer dailyFatTarget
) {
}

