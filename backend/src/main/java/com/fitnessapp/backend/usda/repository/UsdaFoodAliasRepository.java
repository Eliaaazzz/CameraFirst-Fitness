package com.fitnessapp.backend.usda.repository;

import com.fitnessapp.backend.usda.domain.UsdaFoodAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface UsdaFoodAliasRepository extends JpaRepository<UsdaFoodAlias, Long> {
}
