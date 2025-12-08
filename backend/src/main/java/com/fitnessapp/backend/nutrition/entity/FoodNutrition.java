package com.fitnessapp.backend.nutrition.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity for food nutrition data (per 100g)
 * Replaces hardcoded NUTRITION_DATABASE map
 */
@Entity
@Table(name = "food_nutrition")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodNutrition {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "food_key", nullable = false, unique = true, length = 100)
    private String foodKey;

    @Column(name = "display_name", length = 200)
    private String displayName;

    @Column(name = "display_name_cn", length = 200)
    private String displayNameCn;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal calories;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal protein;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal fat;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal carbs;

    @Column(precision = 8, scale = 2)
    private BigDecimal fiber;

    @Column(precision = 8, scale = 2)
    private BigDecimal sodium;

    @Column(length = 50)
    private String category;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
