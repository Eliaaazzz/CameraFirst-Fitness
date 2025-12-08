package com.fitnessapp.backend.usda.repository;

import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsdaFoodNutritionRepository extends JpaRepository<UsdaFoodNutrition, Long> {
    Optional<UsdaFoodNutrition> findByFoodId(Long foodId);
}
