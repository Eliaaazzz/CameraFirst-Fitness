package com.fitnessapp.backend.domain;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "recipe")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {
  @Id
  @Column(columnDefinition = "uuid")
  @GeneratedValue
  private UUID id;

  @Column(nullable = false, length = 255)
  private String title;

  @Column(name = "image_url")
  private String imageUrl;

  @Column(name = "time_minutes", nullable = false)
  private Integer timeMinutes;

  @Column(nullable = false, length = 20)
  private String difficulty;

  @Column(name = "nutrition_summary", columnDefinition = "jsonb")
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  private JsonNode nutritionSummary;

  @Column(name = "steps", columnDefinition = "jsonb")
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  private JsonNode steps;

  @Column(name = "swaps", columnDefinition = "jsonb")
  @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
  private JsonNode swaps;

  @Column(name = "created_at", insertable = false, updatable = false)
  private OffsetDateTime createdAt;

  @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  @Builder.Default
  private Set<RecipeIngredient> ingredients = new HashSet<>();
}
