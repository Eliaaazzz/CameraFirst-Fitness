package com.fitnessapp.backend.recipe.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fitnessapp.backend.recipe.entity.Recipe;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

  // ============================================================================
  // Vector Similarity Search (using pgvector)
  // ============================================================================

  /**
   * Projection interface for vector similarity search results.
   */
  interface RecipeSimilarityResult {
    UUID getId();
    Double getSimilarity();
  }

  /**
   * Vector similarity search using cosine distance.
   * Returns recipe IDs with similarity scores.
   */
  @Query(value = """
      SELECT r.id AS id, 1 - (r.embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM recipe r
      WHERE r.embedding IS NOT NULL
      ORDER BY r.embedding <=> CAST(:embedding AS vector)
      LIMIT :limit
      """, nativeQuery = true)
  java.util.List<RecipeSimilarityResult> findBySimilarityWithScore(
          @Param("embedding") String embedding,
          @Param("limit") int limit);

  /**
   * Hybrid search: Vector similarity + target goal filter.
   */
  @Query(value = """
      SELECT r.id AS id, 1 - (r.embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM recipe r
      WHERE r.embedding IS NOT NULL
        AND :goal = ANY(r.target_goal)
        AND r.image_url IS NOT NULL
      ORDER BY r.embedding <=> CAST(:embedding AS vector)
      LIMIT :limit
      """, nativeQuery = true)
  java.util.List<RecipeSimilarityResult> findBySimilarityAndGoalWithScore(
          @Param("embedding") String embedding,
          @Param("goal") String goal,
          @Param("limit") int limit);

  /**
   * Hybrid search: Vector similarity + nutrition constraints.
   * Supports both flat and nested (macros.*.amount) nutrition formats
   */
  @Query(value = """
      SELECT r.id AS id, 1 - (r.embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM recipe r
      WHERE r.embedding IS NOT NULL
        AND r.image_url IS NOT NULL
        AND (:minProtein IS NULL OR COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) >= :minProtein)
        AND (:maxCalories IS NULL OR COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) <= :maxCalories)
      ORDER BY r.embedding <=> CAST(:embedding AS vector)
      LIMIT :limit
      """, nativeQuery = true)
  java.util.List<RecipeSimilarityResult> findBySimilarityWithNutritionFilter(
          @Param("embedding") String embedding,
          @Param("minProtein") Integer minProtein,
          @Param("maxCalories") Integer maxCalories,
          @Param("limit") int limit);

  /**
   * Find recipes without embeddings for batch seeding.
   */
  @Query(value = "SELECT * FROM recipe WHERE embedding IS NULL", nativeQuery = true)
  java.util.List<Recipe> findRecipesWithoutEmbeddings();

  /**
   * Count recipes with embeddings.
   */
  @Query(value = "SELECT COUNT(*) FROM recipe WHERE embedding IS NOT NULL", nativeQuery = true)
  long countByEmbeddingIsNotNull();

  /**
   * Update embedding for a recipe using native SQL.
   */
  @org.springframework.data.jpa.repository.Modifying
  @Query(value = """
      UPDATE recipe
      SET embedding = CAST(:embedding AS vector),
          search_text = :searchText,
          embedding_generated_at = :updatedAt
      WHERE id = :id
      """, nativeQuery = true)
  void updateEmbedding(
          @Param("id") UUID id,
          @Param("embedding") String embedding,
          @Param("searchText") String searchText,
          @Param("updatedAt") java.time.OffsetDateTime updatedAt);

  // ============================================================================
  // Original Methods
  // ============================================================================

  // JPQL: find recipes that contain at least all given ingredient names
  @Query("select r from Recipe r join r.ingredients ri join ri.ingredient i " +
         "where i.name in :names group by r having count(distinct i.name) >= :minCount")
  List<Recipe> findByIngredientsContaining(@Param("names") Collection<String> names,
                                           @Param("minCount") long minCount);

  @Query("select distinct r from Recipe r join r.ingredients ri join ri.ingredient i " +
         "where lower(i.name) in :names")
  List<Recipe> findByIngredientsContainingAny(@Param("names") Collection<String> names);

  List<Recipe> findByTimeMinutesLessThanEqualAndDifficultyIgnoreCase(Integer timeMinutes, String difficulty);

  boolean existsByTitleIgnoreCase(String title);

  @Query(value = "select count(*) from recipe", nativeQuery = true)
  long countActual();

  Optional<Recipe> findFirstByTitleIgnoreCase(String title);

  List<Recipe> findTop12ByOrderByCreatedAtDesc();

  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  List<Recipe> findByIdIn(Collection<UUID> ids);

  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("select r from Recipe r")
  List<Recipe> findAllWithIngredients();

  // ============================================================================
  // Performance-optimized queries (added in V8 migration)
  // ============================================================================

  /**
   * Optimized query with EntityGraph to avoid N+1 problem
   * Uses idx_recipe_ingredient_composite index
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.id = :id")
  Optional<Recipe> findByIdWithIngredients(@Param("id") UUID id);

  /**
   * Batch fetch recipes with ingredients - avoids N+1 queries
   * Uses idx_recipe_ingredient_composite index
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT DISTINCT r FROM Recipe r WHERE r.id IN :ids")
  List<Recipe> findByIdInWithIngredients(@Param("ids") Collection<UUID> ids);

  /**
   * Find recipes by calorie range (uses idx_recipe_calories index)
   * Supports both flat (calories) and nested (macros.calories.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE (
      COALESCE(
        (r.nutrition_summary->>'calories')::float,
        (r.nutrition_summary->'macros'->'calories'->>'amount')::float
      ) BETWEEN :minCalories AND :maxCalories
    )
      AND r.image_url IS NOT NULL
    ORDER BY r.time_minutes ASC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findByCaloriesRange(
    @Param("minCalories") int minCalories,
    @Param("maxCalories") int maxCalories,
    @Param("limit") int limit
  );

  /**
   * Advanced nutrition-based search (uses GIN and specific JSONB indexes)
   * Supports both flat and nested (macros.*.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE (:minCalories IS NULL OR COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) >= :minCalories)
      AND (:maxCalories IS NULL OR COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) <= :maxCalories)
      AND (:minProtein IS NULL OR COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) >= :minProtein)
      AND (:maxProtein IS NULL OR COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) <= :maxProtein)
      AND (:minCarbs IS NULL OR COALESCE((r.nutrition_summary->>'carbs')::float, (r.nutrition_summary->'macros'->'carbs'->>'amount')::float) >= :minCarbs)
      AND (:maxCarbs IS NULL OR COALESCE((r.nutrition_summary->>'carbs')::float, (r.nutrition_summary->'macros'->'carbs'->>'amount')::float) <= :maxCarbs)
      AND (:minFat IS NULL OR COALESCE((r.nutrition_summary->>'fat')::float, (r.nutrition_summary->'macros'->'fat'->>'amount')::float) >= :minFat)
      AND (:maxFat IS NULL OR COALESCE((r.nutrition_summary->>'fat')::float, (r.nutrition_summary->'macros'->'fat'->>'amount')::float) <= :maxFat)
      AND (:maxTime IS NULL OR r.time_minutes <= :maxTime)
      AND (:difficulty IS NULL OR LOWER(r.difficulty) = LOWER(:difficulty))
      AND r.image_url IS NOT NULL
    ORDER BY
      CASE WHEN :sortBy = 'time' THEN r.time_minutes END ASC,
      CASE WHEN :sortBy = 'calories' THEN COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) END ASC,
      CASE WHEN :sortBy = 'protein' THEN COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) END DESC,
      r.created_at DESC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findByNutritionCriteria(
    @Param("minCalories") Integer minCalories,
    @Param("maxCalories") Integer maxCalories,
    @Param("minProtein") Integer minProtein,
    @Param("maxProtein") Integer maxProtein,
    @Param("minCarbs") Integer minCarbs,
    @Param("maxCarbs") Integer maxCarbs,
    @Param("minFat") Integer minFat,
    @Param("maxFat") Integer maxFat,
    @Param("maxTime") Integer maxTime,
    @Param("difficulty") String difficulty,
    @Param("sortBy") String sortBy,
    @Param("limit") int limit
  );

  /**
   * Find high-protein recipes (uses idx_recipe_protein index)
   * Supports both flat and nested (macros.protein.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) >= :minProtein
      AND (:maxTime IS NULL OR r.time_minutes <= :maxTime)
      AND r.image_url IS NOT NULL
    ORDER BY COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) DESC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findHighProteinRecipes(
    @Param("minProtein") int minProtein,
    @Param("maxTime") Integer maxTime,
    @Param("limit") int limit
  );

  /**
   * Find low-carb recipes (uses idx_recipe_carbs index)
   * Supports both flat and nested (macros.carbs.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE COALESCE((r.nutrition_summary->>'carbs')::float, (r.nutrition_summary->'macros'->'carbs'->>'amount')::float) <= :maxCarbs
      AND (:maxTime IS NULL OR r.time_minutes <= :maxTime)
      AND r.image_url IS NOT NULL
    ORDER BY COALESCE((r.nutrition_summary->>'carbs')::float, (r.nutrition_summary->'macros'->'carbs'->>'amount')::float) ASC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findLowCarbRecipes(
    @Param("maxCarbs") int maxCarbs,
    @Param("maxTime") Integer maxTime,
    @Param("limit") int limit
  );

  /**
   * Find low-calorie recipes (uses idx_recipe_calories index)
   * Supports both flat and nested (macros.calories.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) <= :maxCalories
      AND (:maxTime IS NULL OR r.time_minutes <= :maxTime)
      AND r.image_url IS NOT NULL
    ORDER BY COALESCE((r.nutrition_summary->>'calories')::float, (r.nutrition_summary->'macros'->'calories'->>'amount')::float) ASC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findLowCalorieRecipes(
    @Param("maxCalories") int maxCalories,
    @Param("maxTime") Integer maxTime,
    @Param("limit") int limit
  );

  /**
   * Find recently added recipes (uses idx_recipe_created_at index)
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE r.created_at > :since
      AND r.image_url IS NOT NULL
    ORDER BY r.created_at DESC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findRecentRecipes(
    @Param("since") java.time.OffsetDateTime since,
    @Param("limit") int limit
  );

  /**
   * Text search by title or dietary tags
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%'))
       OR EXISTS (SELECT 1 FROM unnest(r.dietary_tags) AS dt WHERE LOWER(dt) LIKE LOWER(CONCAT('%', :query, '%')))
       OR r.description ILIKE CONCAT('%', :query, '%')
    ORDER BY r.created_at DESC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> searchByText(@Param("query") String query, @Param("limit") int limit);

  /**
   * Find top recipes by target goal, ordered by protein content (for quality recommendations)
   * Supports both flat and nested (macros.protein.amount) nutrition formats
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE :goal = ANY(r.target_goal)
      AND r.image_url IS NOT NULL
    ORDER BY COALESCE((r.nutrition_summary->>'protein')::float, (r.nutrition_summary->'macros'->'protein'->>'amount')::float) DESC NULLS LAST
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findTopByTargetGoal(@Param("goal") String goal, @Param("limit") int limit);
}
