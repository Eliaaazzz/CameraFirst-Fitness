package com.fitnessapp.backend.weight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Weight statistics and trend data for a user.
 */
public record WeightStatsResponse(
    BigDecimal currentWeight,
    BigDecimal targetWeight,
    BigDecimal startWeight,
    BigDecimal weightChange,
    BigDecimal weightChangePercent,
    BigDecimal bmi,
    LocalDate lastLogDate,
    int totalLogs,
    String trend,  // "gaining", "losing", "stable"
    String progressMessage,
    List<WeightLogResponse> history
) {
    public static WeightStatsResponse empty() {
        return new WeightStatsResponse(
            null, null, null, null, null, null, null, 0, "stable", "Start logging your weight to track progress!", List.of()
        );
    }
}
