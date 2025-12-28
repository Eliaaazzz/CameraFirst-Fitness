package com.fitnessapp.backend.recipe.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

  // ============================================================================
  // Generated Nutrition Columns (PostgreSQL GENERATED ALWAYS AS ... STORED)
  // These are computed from nutrition_summary and are read-only in JPA.
  // ============================================================================

  /**
   * Calories per serving - generated from nutrition_summary.
   */
  @Column(name = "calories", insertable = false, updatable = false)
  private Integer calories;

  /**
   * Protein in grams - generated from nutrition_summary.
   */
  @Column(name = "protein", insertable = false, updatable = false)
  private Double protein;

  /**
   * Carbohydrates in grams - generated from nutrition_summary.
   */
  @Column(name = "carbs", insertable = false, updatable = false)
  private Double carbs;

  /**
   * Fat in grams - generated from nutrition_summary.
   */
  @Column(name = "fat", insertable = false, updatable = false)
  private Double fat;

  /**
   * Sugar in grams - generated from nutrition_summary.
   * Important for blood sugar control goals.
   */
  @Column(name = "sugar", insertable = false, updatable = false)
  private Double sugar;

  /**
   * Fiber in grams - generated from nutrition_summary.
   * Important for blood sugar control and digestive health.
   */
  @Column(name = "fiber", insertable = false, updatable = false)
  private Double fiber;

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

  @Column(name = "target_goal")
  @JdbcTypeCode(SqlTypes.ARRAY)
  private java.util.List<String> targetGoal;

  /**
   * Vector embedding for semantic search (1536 dimensions for OpenAI).
   */
  @JdbcTypeCode(SqlTypes.VECTOR)
  @Array(length = 1536)
  @Column(name = "embedding")
  private float[] embedding;

  /**
   * Combined searchable text used for embedding generation.
   */
  @Column(name = "search_text", columnDefinition = "TEXT")
  private String searchText;

  /**
   * Timestamp when embedding was last generated.
   */
  @Column(name = "embedding_generated_at")
  private OffsetDateTime embeddingGeneratedAt;
}
