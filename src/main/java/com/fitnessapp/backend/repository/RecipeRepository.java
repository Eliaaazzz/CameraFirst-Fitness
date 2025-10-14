package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.Recipe;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

  // JPQL: find recipes that contain at least all given ingredient names
  @Query("select r from Recipe r join r.ingredients ri join ri.ingredient i " +
         "where i.name in :names group by r having count(distinct i.name) >= :minCount")
  List<Recipe> findByIngredientsContaining(@Param("names") Collection<String> names,
                                           @Param("minCount") long minCount);
}

