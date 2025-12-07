package com.fitnessapp.backend.recipe.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "meal_plan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealPlan {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
  private UUID userId;

  @Column(name = "plan_payload", columnDefinition = "jsonb", nullable = false)
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  private String planPayload;

  @Column(name = "generated_at", nullable = false)
  private OffsetDateTime generatedAt;

  @Column(name = "source", length = 32)
  private String source;

  @Column(name = "calories_target")
  private Integer caloriesTarget;

  @Column(name = "protein_target")
  private Integer proteinTarget;

  @Column(name = "carbs_target")
  private Integer carbsTarget;

  @Column(name = "fat_target")
  private Integer fatTarget;

  @PrePersist
  void prePersist() {
    if (generatedAt == null) {
      generatedAt = OffsetDateTime.now();
    }
  }
}

