package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserSavedWorkout;
import com.fitnessapp.backend.domain.UserSavedWorkout.Id;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedWorkoutRepository extends JpaRepository<UserSavedWorkout, Id> {
  List<UserSavedWorkout> findByUser_Email(String email);
}

