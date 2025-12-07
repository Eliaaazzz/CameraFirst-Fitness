package com.fitnessapp.backend.nutrition.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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

    @Column(nullable = false)
    private Double calories;

    @Column(nullable = false)
    private Double protein;

    @Column(nullable = false)
    private Double fat;

    @Column(nullable = false)
    private Double carbs;

    @Column
    private Double fiber;

    @Column
    private Double sodium;

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
