package com.fitnessapp.backend.recipe.repository;

import com.fitnessapp.backend.recipe.entity.Ingredient;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientRepository extends JpaRepository<Ingredient, UUID> {
  Optional<Ingredient> findByName(String name);
}

