package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entity for food synonyms - maps different names to canonical food_key
 * Supports NLP fuzzy matching for food recognition
 */
@Entity
@Table(name = "food_synonym")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodSynonym {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String synonym;

    @Column(name = "canonical_food_key", nullable = false, length = 100)
    private String canonicalFoodKey;

    @Column(length = 10)
    private String language; // zh, en, etc.

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "canonical_food_key", referencedColumnName = "food_key", insertable = false, updatable = false)
    private FoodNutrition foodNutrition;
}
