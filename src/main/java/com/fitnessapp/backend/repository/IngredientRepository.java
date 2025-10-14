package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.Ingredient;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientRepository extends JpaRepository<Ingredient, UUID> {
  Optional<Ingredient> findByName(String name);
}

