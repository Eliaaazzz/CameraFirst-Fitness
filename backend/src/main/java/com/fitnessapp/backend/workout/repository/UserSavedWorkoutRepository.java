package com.fitnessapp.backend.workout.repository;

import com.fitnessapp.backend.workout.entity.UserSavedWorkout;
import com.fitnessapp.backend.workout.entity.UserSavedWorkout.Id;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedWorkoutRepository extends JpaRepository<UserSavedWorkout, Id> {
  Page<UserSavedWorkout> findByUser_Id(UUID userId, Pageable pageable);
}

