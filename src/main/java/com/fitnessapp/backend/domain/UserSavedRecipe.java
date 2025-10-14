package com.fitnessapp.backend.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import lombok.*;

@Entity
@Table(name = "user_saved_recipe")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedRecipe {

  @EmbeddedId private Id id;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("userId")
  @JoinColumn(name = "user_id")
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("recipeId")
  @JoinColumn(name = "recipe_id")
  private Recipe recipe;

  @Column(name = "saved_at", insertable = false, updatable = false)
  private OffsetDateTime savedAt;

  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Id implements Serializable {
    private java.util.UUID userId;
    private java.util.UUID recipeId;

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (o == null || getClass() != o.getClass()) return false;
      Id id = (Id) o;
      return Objects.equals(userId, id.userId) && Objects.equals(recipeId, id.recipeId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(userId, recipeId);
    }
  }
}

