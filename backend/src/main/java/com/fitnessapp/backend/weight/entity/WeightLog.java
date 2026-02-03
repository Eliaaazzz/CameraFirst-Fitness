package com.fitnessapp.backend.weight.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Time-series data for tracking user weight over time.
 * Each record represents a single weight measurement for a specific date.
 */
@Entity
@Table(
    name = "weight_log",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_weight_log_user_date",
            columnNames = {"user_id", "log_date"}
        )
    },
    indexes = {
        @Index(name = "idx_weight_log_user_date", columnList = "user_id, log_date DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class WeightLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "weight_kg", precision = 6, scale = 2, nullable = false)
    private BigDecimal weightKg;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "body_fat_percentage", precision = 5, scale = 2)
    private BigDecimal bodyFatPercentage;

    @Column(name = "muscle_mass_kg", precision = 6, scale = 2)
    private BigDecimal muscleMassKg;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
