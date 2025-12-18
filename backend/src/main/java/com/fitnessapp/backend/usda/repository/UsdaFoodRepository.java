package com.fitnessapp.backend.usda.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fitnessapp.backend.usda.domain.UsdaFood;

@Repository
public interface UsdaFoodRepository extends JpaRepository<UsdaFood, Long> {

    /**
     * Projection interface for vector similarity search results.
     * Captures both the food ID and the similarity score from the database.
     */
    interface FoodSimilarityResult {
        Long getId();
        Double getSimilarity();
    }

    Optional<UsdaFood> findByFdcId(String fdcId);

    List<UsdaFood> findByNameContainingIgnoreCase(String name);

    List<UsdaFood> findByCategoryIgnoreCase(String category);

    @Query("SELECT f FROM UsdaFood f JOIN f.aliases a " +
            "WHERE a.isActive = true AND LOWER(a.alias) LIKE LOWER(CONCAT('%', :alias, '%'))")
    List<UsdaFood> searchByAlias(@Param("alias") String alias);
    
    // ==================== Vector Search Methods ====================

    /**
     * Find foods without embeddings for batch seeding.
     * Uses native query because embedding is @Transient in Java entity.
     */
    @Query(value = "SELECT * FROM usda_food WHERE embedding IS NULL", nativeQuery = true)
    List<UsdaFood> findFoodsWithoutEmbeddings();

    /**
     * Count foods with embeddings.
     * Uses native query because embedding is @Transient in Java entity.
     */
    @Query(value = "SELECT COUNT(*) FROM usda_food WHERE embedding IS NOT NULL", nativeQuery = true)
    long countByEmbeddingIsNotNull();
    
    /**
     * Vector similarity search using pgvector cosine distance.
     * Returns food IDs with similarity scores (projection).
     *
     * @param embedding Query embedding vector as string
     * @param limit Maximum number of results
     * @return List of food IDs with similarity scores
     */
    @Query(value = """
            SELECT f.id AS id, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<FoodSimilarityResult> findBySimilarityWithScore(@Param("embedding") String embedding, @Param("limit") int limit);

    /**
     * Vector similarity search with name exclusion filter (for cooking method awareness).
     * Returns food IDs with similarity scores.
     *
     * @param embedding Query embedding vector as string
     * @param excludePattern Pattern to exclude from names (e.g., '%raw%')
     * @param limit Maximum number of results
     * @return List of food IDs with similarity scores
     */
    @Query(value = """
            SELECT f.id AS id, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
              AND LOWER(f.name) NOT LIKE LOWER(:excludePattern)
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<FoodSimilarityResult> findBySimilarityExcludingWithScore(
            @Param("embedding") String embedding,
            @Param("excludePattern") String excludePattern,
            @Param("limit") int limit);

    /**
     * Vector similarity search filtered by category.
     * Returns food IDs with similarity scores.
     */
    @Query(value = """
            SELECT f.id AS id, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
              AND LOWER(f.category) = LOWER(:category)
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<FoodSimilarityResult> findBySimilarityAndCategoryWithScore(
            @Param("embedding") String embedding,
            @Param("category") String category,
            @Param("limit") int limit);

    /**
     * Find foods by IDs using JPQL.
     */
    @Query("SELECT f FROM UsdaFood f WHERE f.id IN :ids")
    List<UsdaFood> findByIdsWithoutEmbedding(@Param("ids") List<Long> ids);
    
    /**
     * Update embedding for a food item using native SQL.
     * Required because pgvector type cannot be directly mapped in JPA.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
            UPDATE usda_food 
            SET embedding = CAST(:embedding AS vector),
                search_text = :searchText,
                updated_at = :updatedAt
            WHERE id = :id
            """, nativeQuery = true)
    void updateEmbedding(
            @Param("id") Long id,
            @Param("embedding") String embedding,
            @Param("searchText") String searchText,
            @Param("updatedAt") java.time.OffsetDateTime updatedAt);
}

