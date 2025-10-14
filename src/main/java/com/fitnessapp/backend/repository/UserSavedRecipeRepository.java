package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.UserSavedRecipe;
import com.fitnessapp.backend.domain.UserSavedRecipe.Id;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSavedRecipeRepository extends JpaRepository<UserSavedRecipe, Id> {
  List<UserSavedRecipe> findByUser_Email(String email);
}

