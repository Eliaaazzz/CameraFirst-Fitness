package com.fitnessapp.backend.workout.entity;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;

import com.fitnessapp.backend.user.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_saved_workout")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedWorkout {

  @EmbeddedId private Id id;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("userId")
  @JoinColumn(name = "user_id")
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("workoutId")
  @JoinColumn(name = "workout_id")
  private ExerciseVideo workout;

  @Column(name = "saved_at", insertable = false, updatable = false)
  private OffsetDateTime savedAt;

  @Embeddable
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Id implements Serializable {
    private java.util.UUID userId;
    private java.util.UUID workoutId;

    @Override
    public boolean equals(Object o) {
      if (this == o) return true;
      if (o == null || getClass() != o.getClass()) return false;
      Id id = (Id) o;
      return Objects.equals(userId, id.userId) && Objects.equals(workoutId, id.workoutId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(userId, workoutId);
    }
  }
}

