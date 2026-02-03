package com.fitnessapp.backend.recipe.repository;

import java.math.BigDecimal;
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

  // ============================================================================
  // Late Fetching: Embeddings Only (Memory Optimization)
  // ============================================================================

  /**
   * LATE FETCHING: Fetch embeddings ONLY for a batch of recipe IDs.
   *
   * MEMORY OPTIMIZATION:
   * - Stage 1 fetches 200 RecipeSummary (NO embedding) = ~100KB
   * - Stage 2a filters to ~50 candidates
   * - Stage 2b (THIS METHOD) fetches embeddings for 50 IDs = ~300KB
   *
   * This keeps memory usage under control for t2.micro (1GB RAM)
   * while preserving the AI semantic search capability.
   *
   * @param ids Collection of recipe IDs (typically ~50)
   * @return List of RecipeEmbedding projections containing only id + embedding
   */
  @Query("SELECT r.id AS id, r.embedding AS embedding FROM Recipe r WHERE r.id IN :ids AND r.embedding IS NOT NULL")
  List<RecipeEmbedding> findEmbeddingsByIdIn(@Param("ids") Collection<UUID> ids);

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

  // ============================================================================
  // Clean JPA Queries using Generated Nutrition Columns (V31+)
  // ============================================================================

  /**
   * Find recipes by calorie range using generated column.
   * Uses idx_recipe_gen_calories B-tree index.
   */
  List<Recipe> findByCaloriesBetweenAndImageUrlIsNotNullOrderByTimeMinutesAsc(
          Integer minCalories, Integer maxCalories);

  /**
   * Find recipes by calorie range with limit (Pageable alternative).
   */
  @Query("SELECT r FROM Recipe r WHERE r.calories BETWEEN :min AND :max AND r.imageUrl IS NOT NULL ORDER BY r.timeMinutes ASC")
  List<Recipe> findByCaloriesRange(@Param("min") int min, @Param("max") int max, org.springframework.data.domain.Pageable pageable);

  /**
   * Find high-protein recipes.
   * Uses idx_recipe_gen_protein B-tree index.
   */
  List<Recipe> findByProteinGreaterThanEqualAndImageUrlIsNotNullOrderByProteinDesc(BigDecimal minProtein);

  /**
   * Find high-protein recipes with limit.
   */
  @Query("SELECT r FROM Recipe r WHERE r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.protein DESC")
  List<Recipe> findHighProteinRecipes(@Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * Find low-carb recipes.
   * Uses idx_recipe_gen_carbs B-tree index.
   */
  List<Recipe> findByCarbsLessThanEqualAndImageUrlIsNotNullOrderByCarbsAsc(BigDecimal maxCarbs);

  /**
   * Find low-carb recipes with limit.
   */
  @Query("SELECT r FROM Recipe r WHERE r.carbs <= :maxCarbs AND r.imageUrl IS NOT NULL ORDER BY r.carbs ASC")
  List<Recipe> findLowCarbRecipes(@Param("maxCarbs") BigDecimal maxCarbs, org.springframework.data.domain.Pageable pageable);

  /**
   * Find low-calorie recipes.
   * Uses idx_recipe_gen_calories B-tree index.
   */
  List<Recipe> findByCaloriesLessThanEqualAndImageUrlIsNotNullOrderByCaloriesAsc(Integer maxCalories);

  /**
   * Find low-calorie recipes with limit.
   */
  @Query("SELECT r FROM Recipe r WHERE r.calories <= :maxCalories AND r.imageUrl IS NOT NULL ORDER BY r.calories ASC")
  List<Recipe> findLowCalorieRecipes(@Param("maxCalories") int maxCalories, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find low-calorie recipes using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.calories <= :maxCalories AND r.imageUrl IS NOT NULL ORDER BY r.calories ASC")
  List<RecipeSummary> findLowCalorieRecipesLightweight(@Param("maxCalories") int maxCalories, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find high-protein recipes using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.protein DESC")
  List<RecipeSummary> findHighProteinRecipesLightweight(@Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find recent recipes using projection.
   * Excludes embedding for memory efficiency.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.imageUrl IS NOT NULL ORDER BY r.createdAt DESC")
  List<RecipeSummary> findRecentRecipesLightweight(org.springframework.data.domain.Pageable pageable);

  /**
   * Find recipes for blood sugar control: low sugar + high fiber.
   * Uses idx_recipe_blood_sugar composite index.
   */
  @Query("SELECT r FROM Recipe r WHERE r.sugar <= :maxSugar AND r.fiber >= :minFiber AND r.imageUrl IS NOT NULL ORDER BY r.sugar ASC, r.fiber DESC")
  List<Recipe> findBloodSugarFriendly(@Param("maxSugar") BigDecimal maxSugar, @Param("minFiber") BigDecimal minFiber, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find recipes for blood sugar control using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.sugar <= :maxSugar AND r.fiber >= :minFiber AND r.imageUrl IS NOT NULL ORDER BY r.sugar ASC, r.fiber DESC")
  List<RecipeSummary> findBloodSugarFriendlyLightweight(@Param("maxSugar") BigDecimal maxSugar, @Param("minFiber") BigDecimal minFiber, org.springframework.data.domain.Pageable pageable);

  /**
   * Find recipes for fat loss: low calories + high protein.
   * Uses idx_recipe_fat_loss composite index.
   */
  @Query("SELECT r FROM Recipe r WHERE r.calories <= :maxCalories AND r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.calories ASC, r.protein DESC")
  List<Recipe> findFatLossFriendly(@Param("maxCalories") int maxCalories, @Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find recipes for fat loss using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.calories <= :maxCalories AND r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.calories ASC, r.protein DESC")
  List<RecipeSummary> findFatLossFriendlyLightweight(@Param("maxCalories") int maxCalories, @Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * Find recipes for muscle building: high protein.
   * Uses idx_recipe_muscle_gain composite index.
   */
  @Query("SELECT r FROM Recipe r WHERE r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.protein DESC, r.calories ASC")
  List<Recipe> findMuscleGainFriendly(@Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find recipes for muscle building using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.protein >= :minProtein AND r.imageUrl IS NOT NULL ORDER BY r.protein DESC, r.calories ASC")
  List<RecipeSummary> findMuscleGainFriendlyLightweight(@Param("minProtein") BigDecimal minProtein, org.springframework.data.domain.Pageable pageable);

  /**
   * Find recipes for maintenance: calories within range.
   */
  @Query("SELECT r FROM Recipe r WHERE r.calories BETWEEN :minCalories AND :maxCalories AND r.imageUrl IS NOT NULL ORDER BY r.createdAt DESC")
  List<Recipe> findMaintenanceFriendly(@Param("minCalories") int minCalories, @Param("maxCalories") int maxCalories, org.springframework.data.domain.Pageable pageable);

  /**
   * LIGHTWEIGHT: Find recipes for maintenance using projection.
   * Excludes embedding (6KB per row) for memory efficiency on t2.micro.
   */
  @EntityGraph(attributePaths = {"ingredients", "ingredients.ingredient"})
  @Query("SELECT r FROM Recipe r WHERE r.calories BETWEEN :minCalories AND :maxCalories AND r.imageUrl IS NOT NULL ORDER BY r.createdAt DESC")
  List<RecipeSummary> findMaintenanceFriendlyLightweight(@Param("minCalories") int minCalories, @Param("maxCalories") int maxCalories, org.springframework.data.domain.Pageable pageable);

  /**
   * Advanced nutrition search with all criteria using generated columns.
   * Much cleaner than the old JSONB version!
   */
  @Query("""
      SELECT r FROM Recipe r
      WHERE (:minCalories IS NULL OR r.calories >= :minCalories)
        AND (:maxCalories IS NULL OR r.calories <= :maxCalories)
        AND (:minProtein IS NULL OR r.protein >= :minProtein)
        AND (:maxProtein IS NULL OR r.protein <= :maxProtein)
        AND (:minCarbs IS NULL OR r.carbs >= :minCarbs)
        AND (:maxCarbs IS NULL OR r.carbs <= :maxCarbs)
        AND (:minFat IS NULL OR r.fat >= :minFat)
        AND (:maxFat IS NULL OR r.fat <= :maxFat)
        AND (:maxSugar IS NULL OR r.sugar <= :maxSugar)
        AND (:minFiber IS NULL OR r.fiber >= :minFiber)
        AND (:maxTime IS NULL OR r.timeMinutes <= :maxTime)
        AND r.imageUrl IS NOT NULL
      ORDER BY r.createdAt DESC
      """)
  List<Recipe> findByNutritionCriteria(
          @Param("minCalories") Integer minCalories,
          @Param("maxCalories") Integer maxCalories,
          @Param("minProtein") BigDecimal minProtein,
          @Param("maxProtein") BigDecimal maxProtein,
          @Param("minCarbs") BigDecimal minCarbs,
          @Param("maxCarbs") BigDecimal maxCarbs,
          @Param("minFat") BigDecimal minFat,
          @Param("maxFat") BigDecimal maxFat,
          @Param("maxSugar") BigDecimal maxSugar,
          @Param("minFiber") BigDecimal minFiber,
          @Param("maxTime") Integer maxTime,
          org.springframework.data.domain.Pageable pageable
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
    ORDER BY r.created_at DESC
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> searchByText(@Param("query") String query, @Param("limit") int limit);

  /**
   * Find top recipes by target goal, ordered by protein content.
   * Uses native query for PostgreSQL array containment.
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE :goal = ANY(r.target_goal)
      AND r.image_url IS NOT NULL
    ORDER BY r.protein DESC NULLS LAST
    """, nativeQuery = true)
  List<Recipe> findByTargetGoalOrderByProteinDesc(@Param("goal") String goal, org.springframework.data.domain.Pageable pageable);

  /**
   * Native query version for target goal (for array containment) with explicit limit.
   */
  @Query(value = """
    SELECT * FROM recipe r
    WHERE :goal = ANY(r.target_goal)
      AND r.image_url IS NOT NULL
    ORDER BY r.protein DESC NULLS LAST
    LIMIT :limit
    """, nativeQuery = true)
  List<Recipe> findTopByTargetGoal(@Param("goal") String goal, @Param("limit") int limit);
}
