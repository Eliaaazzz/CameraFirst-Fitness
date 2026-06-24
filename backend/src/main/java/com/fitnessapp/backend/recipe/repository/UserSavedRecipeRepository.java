package com.fitnessapp.backend.recipe.repository;

import com.fitnessapp.backend.recipe.entity.UserSavedRecipe;
import com.fitnessapp.backend.recipe.entity.UserSavedRecipe.Id;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSavedRecipeRepository extends JpaRepository<UserSavedRecipe, Id> {
  Page<UserSavedRecipe> findByUser_Id(UUID userId, Pageable pageable);

  void deleteByUser_Id(UUID userId);

  /**
   * Collaborative-filtering signal: recipe ids most saved by the given users (e.g. people you
   * follow), ranked by how many of them saved each recipe. Used by the hybrid recommender.
   */
  @Query("select usr.recipe.id from UserSavedRecipe usr "
      + "where usr.user.id in :userIds group by usr.recipe.id order by count(usr) desc")
  List<UUID> findRecipeIdsSavedByUsers(@Param("userIds") Collection<UUID> userIds, Pageable pageable);
}
