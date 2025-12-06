package com.fitnessapp.backend.usda.repository;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsdaFoodRepository extends JpaRepository<UsdaFood, Long> {

    Optional<UsdaFood> findByFdcId(String fdcId);

    List<UsdaFood> findByNameContainingIgnoreCase(String name);

    List<UsdaFood> findByCategoryIgnoreCase(String category);

    @Query("SELECT f FROM UsdaFood f JOIN f.aliases a " +
            "WHERE a.isActive = true AND LOWER(a.alias) LIKE LOWER(CONCAT('%', :alias, '%'))")
    List<UsdaFood> searchByAlias(@Param("alias") String alias);
}
