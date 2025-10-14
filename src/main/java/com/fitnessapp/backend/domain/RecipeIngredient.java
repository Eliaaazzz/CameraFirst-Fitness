package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "recipe_ingredient")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeIngredient {
  @EmbeddedId private RecipeIngredientId id;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("recipeId")
  @JoinColumn(name = "recipe_id")
  private Recipe recipe;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("ingredientId")
  @JoinColumn(name = "ingredient_id")
  private Ingredient ingredient;

  @Column(precision = 10, scale = 2)
  private BigDecimal quantity;

  @Column(length = 50)
  private String unit;
}

