package com.fitnessapp.backend.weight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for logging weight data.
 * Weight is required; body fat, muscle mass, and note are optional.
 */
public record WeightLogRequest(
    @NotNull(message = "Weight is required")
    @DecimalMin(value = "20.0", message = "Weight must be at least 20 kg")
    @DecimalMax(value = "500.0", message = "Weight must be at most 500 kg")
    BigDecimal weightKg,

    @PastOrPresent(message = "Date cannot be in the future")
    LocalDate logDate,

    @DecimalMin(value = "1.0", message = "Body fat must be at least 1%")
    @DecimalMax(value = "70.0", message = "Body fat must be at most 70%")
    BigDecimal bodyFatPercentage,

    @DecimalMin(value = "10.0", message = "Muscle mass must be at least 10 kg")
    @DecimalMax(value = "200.0", message = "Muscle mass must be at most 200 kg")
    BigDecimal muscleMassKg,

    @Size(max = 500, message = "Note must be at most 500 characters")
    String note
) {
    public WeightLogRequest {
        // Default to today if no date provided
        if (logDate == null) {
            logDate = LocalDate.now();
        }
    }
}
