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
    
    // ==================== Vector Search Methods ====================
    
    /**
     * Find foods without embeddings for batch seeding.
     */
    @Query("SELECT f FROM UsdaFood f WHERE f.embedding IS NULL")
    List<UsdaFood> findFoodsWithoutEmbeddings();
    
    /**
     * Count foods with embeddings.
     */
    long countByEmbeddingIsNotNull();
    
    /**
     * Vector similarity search using pgvector cosine distance.
     * Returns foods ordered by similarity (closest first).
     * 
     * @param embedding Query embedding vector
     * @param limit Maximum number of results
     * @return List of foods with their similarity scores
     */
    @Query(value = """
            SELECT f.*, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<UsdaFood> findBySimilarity(@Param("embedding") String embedding, @Param("limit") int limit);
    
    /**
     * Vector similarity search with name exclusion filter (for cooking method awareness).
     * Excludes foods matching certain patterns (e.g., 'raw' for cooked queries).
     * 
     * @param embedding Query embedding vector
     * @param excludePattern Pattern to exclude from names (e.g., '%raw%')
     * @param limit Maximum number of results
     * @return List of matching foods
     */
    @Query(value = """
            SELECT f.*, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
              AND LOWER(f.name) NOT LIKE LOWER(:excludePattern)
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<UsdaFood> findBySimilarityExcluding(
            @Param("embedding") String embedding, 
            @Param("excludePattern") String excludePattern,
            @Param("limit") int limit);
    
    /**
     * Vector similarity search filtered by category.
     */
    @Query(value = """
            SELECT f.*, 1 - (f.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM usda_food f
            WHERE f.embedding IS NOT NULL
              AND LOWER(f.category) = LOWER(:category)
            ORDER BY f.embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<UsdaFood> findBySimilarityAndCategory(
            @Param("embedding") String embedding,
            @Param("category") String category,
            @Param("limit") int limit);
}
