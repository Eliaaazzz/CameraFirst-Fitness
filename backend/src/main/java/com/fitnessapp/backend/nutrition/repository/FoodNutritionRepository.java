package com.fitnessapp.backend.nutrition.repository;

import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for FoodNutrition entity with fuzzy search support
 */
@Repository
public interface FoodNutritionRepository extends JpaRepository<FoodNutrition, UUID> {

    /**
     * Find by exact food key
     */
    Optional<FoodNutrition> findByFoodKeyAndIsActiveTrue(String foodKey);

    /**
     * Find by exact food key (including inactive)
     */
    Optional<FoodNutrition> findByFoodKey(String foodKey);

    /**
     * Check if food key exists
     */
    boolean existsByFoodKey(String foodKey);

    /**
     * Find all active food items
     */
    List<FoodNutrition> findByIsActiveTrueOrderByFoodKey();

    /**
     * Find by category
     */
    List<FoodNutrition> findByCategoryAndIsActiveTrueOrderByFoodKey(String category);

    /**
     * Fuzzy search by food key using trigram similarity (pg_trgm)
     * Returns items with similarity > 0.3, ordered by similarity descending
     */
    @Query(value = """
        SELECT f.* FROM food_nutrition f
        WHERE f.is_active = true
          AND similarity(f.food_key, :query) > 0.3
        ORDER BY similarity(f.food_key, :query) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<FoodNutrition> findByFoodKeySimilar(@Param("query") String query, @Param("limit") int limit);

    /**
     * Fuzzy search by display name (Chinese)
     */
    @Query(value = """
        SELECT f.* FROM food_nutrition f
        WHERE f.is_active = true
          AND (similarity(f.display_name_cn, :query) > 0.3
               OR similarity(f.display_name, :query) > 0.3)
        ORDER BY GREATEST(
            similarity(f.display_name_cn, :query),
            similarity(f.display_name, :query)
        ) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<FoodNutrition> findByDisplayNameSimilar(@Param("query") String query, @Param("limit") int limit);

    /**
     * Search by keyword in food_key or display names (case-insensitive)
     */
    @Query("""
        SELECT f FROM FoodNutrition f
        WHERE f.isActive = true
          AND (LOWER(f.foodKey) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(f.displayName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(f.displayNameCn) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY f.foodKey
        """)
    List<FoodNutrition> searchByKeyword(@Param("keyword") String keyword);

    /**
     * Get distinct categories
     */
    @Query("SELECT DISTINCT f.category FROM FoodNutrition f WHERE f.category IS NOT NULL ORDER BY f.category")
    List<String> findDistinctCategories();
}
