package com.fitnessapp.backend.weight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.fitnessapp.backend.weight.entity.WeightLog;

public record WeightLogResponse(
    Long id,
    BigDecimal weightKg,
    LocalDate logDate,
    BigDecimal bodyFatPercentage,
    BigDecimal muscleMassKg,
    String note,
    OffsetDateTime createdAt
) {
    public static WeightLogResponse from(WeightLog entity) {
        return new WeightLogResponse(
            entity.getId(),
            entity.getWeightKg(),
            entity.getLogDate(),
            entity.getBodyFatPercentage(),
            entity.getMuscleMassKg(),
            entity.getNote(),
            entity.getCreatedAt()
        );
    }
}
