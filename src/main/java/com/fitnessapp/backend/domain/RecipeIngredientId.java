package com.fitnessapp.backend.domain;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecipeIngredientId implements Serializable {
  private UUID recipeId;
  private UUID ingredientId;

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;
    RecipeIngredientId that = (RecipeIngredientId) o;
    return Objects.equals(recipeId, that.recipeId) && Objects.equals(ingredientId, that.ingredientId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(recipeId, ingredientId);
  }
}

