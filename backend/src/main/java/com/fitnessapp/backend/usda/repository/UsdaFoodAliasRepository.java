package com.fitnessapp.backend.usda.repository;

import com.fitnessapp.backend.usda.domain.UsdaFoodAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsdaFoodAliasRepository extends JpaRepository<UsdaFoodAlias, Long> {
    List<UsdaFoodAlias> findByAliasIgnoreCase(String alias);
}
