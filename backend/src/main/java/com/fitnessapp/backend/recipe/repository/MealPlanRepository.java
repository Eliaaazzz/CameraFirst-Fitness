package com.fitnessapp.backend.recipe.repository;

import com.fitnessapp.backend.recipe.entity.MealPlan;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

  List<MealPlan> findTop10ByUserIdOrderByGeneratedAtDesc(UUID userId);

  List<MealPlan> findByUserIdAndGeneratedAtBetweenOrderByGeneratedAtDesc(UUID userId, OffsetDateTime start, OffsetDateTime end);
}

