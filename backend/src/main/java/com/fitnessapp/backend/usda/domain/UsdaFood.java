package com.fitnessapp.backend.usda.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "usda_food", indexes = {
        @Index(name = "idx_usda_food_fdc_id", columnList = "fdc_id", unique = true),
        @Index(name = "idx_usda_food_name", columnList = "name"),
        @Index(name = "idx_usda_food_category", columnList = "category")
})
public class UsdaFood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fdc_id", nullable = false, unique = true, length = 20)
    private String fdcId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 50)
    private String category;

    @Column(name = "food_state", length = 50)
    private String foodState;

    @Column(name = "data_type", length = 50)
    private String dataType;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToOne(mappedBy = "food", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private UsdaFoodNutrition nutrition;

    @OneToMany(mappedBy = "food", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UsdaFoodAlias> aliases = new ArrayList<>();

    public void attachNutrition(UsdaFoodNutrition foodNutrition) {
        this.nutrition = foodNutrition;
        if (foodNutrition != null) {
            foodNutrition.setFood(this);
        }
    }
}
