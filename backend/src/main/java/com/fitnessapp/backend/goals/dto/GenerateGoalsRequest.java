package com.fitnessapp.backend.goals.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request DTO for generating personalized fitness goals via Gemini AI.
 */
@Data
public class GenerateGoalsRequest {

    @NotNull(message = "sex is required")
    private Sex sex;

    @NotNull(message = "heightCm is required")
    @Min(value = 100, message = "Height must be at least 100cm")
    @Max(value = 250, message = "Height must not exceed 250cm")
    private Integer heightCm;

    @NotNull(message = "weightKg is required")
    @Min(value = 30, message = "Weight must be at least 30kg")
    @Max(value = 300, message = "Weight must not exceed 300kg")
    private Integer weightKg;

    @NotNull(message = "goalType is required")
    private GoalType goalType;

    @Min(value = 10, message = "Age must be at least 10")
    @Max(value = 120, message = "Age must not exceed 120")
    private Integer age;

    private ActivityLevel activityLevel;

    public enum Sex {
        male, female, prefer_not_to_say
    }

    public enum GoalType {
        fat_loss, muscle_gain, diabetes_control
    }

    public enum ActivityLevel {
        low, medium, high
    }
}
