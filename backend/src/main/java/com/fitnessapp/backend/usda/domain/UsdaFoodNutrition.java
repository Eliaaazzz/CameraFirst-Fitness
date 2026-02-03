package com.fitnessapp.backend.usda.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
@Table(name = "usda_food_nutrition")
public class UsdaFoodNutrition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_id", nullable = false, unique = true)
    private UsdaFood food;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal calories;

    @Column(name = "protein_g", precision = 10, scale = 2)
    private BigDecimal proteinG;

    @Column(name = "fat_g", precision = 10, scale = 2)
    private BigDecimal fatG;

    @Column(name = "carbs_g", precision = 10, scale = 2)
    private BigDecimal carbsG;

    @Column(name = "fiber_g", precision = 10, scale = 2)
    private BigDecimal fiberG;

    @Column(name = "sugar_g", precision = 10, scale = 2)
    private BigDecimal sugarG;

    @Column(name = "sodium_mg", precision = 10, scale = 2)
    private BigDecimal sodiumMg;

    @Column(name = "saturated_fat_g", precision = 10, scale = 2)
    private BigDecimal saturatedFatG;

    @Column(name = "quality_score", precision = 3, scale = 2)
    private BigDecimal qualityScore;
}
