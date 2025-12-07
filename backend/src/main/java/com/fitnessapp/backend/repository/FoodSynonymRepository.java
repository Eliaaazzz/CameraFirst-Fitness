package com.fitnessapp.backend.repository;

import com.fitnessapp.backend.domain.FoodSynonym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for FoodSynonym entity - supports NLP fuzzy matching
 */
@Repository
public interface FoodSynonymRepository extends JpaRepository<FoodSynonym, UUID> {

    /**
     * Find canonical food key by exact synonym match
     */
    Optional<FoodSynonym> findBySynonym(String synonym);

    /**
     * Find canonical food key by synonym (case-insensitive)
     */
    @Query("SELECT f FROM FoodSynonym f WHERE LOWER(f.synonym) = LOWER(:synonym)")
    Optional<FoodSynonym> findBySynonymIgnoreCase(@Param("synonym") String synonym);

    /**
     * Find all synonyms for a canonical food key
     */
    List<FoodSynonym> findByCanonicalFoodKeyOrderBySynonym(String canonicalFoodKey);

    List<FoodSynonym> findByCanonicalFoodKeyIn(List<String> canonicalFoodKeys);

    /**
     * Find synonyms by language
     */
    List<FoodSynonym> findByLanguageOrderBySynonym(String language);

    /**
     * Fuzzy search synonyms using trigram similarity
     */
    @Query(value = """
        SELECT * FROM food_synonym
        WHERE similarity(synonym, :query) > 0.3
        ORDER BY similarity(synonym, :query) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<FoodSynonym> findBySynonymSimilar(@Param("query") String query, @Param("limit") int limit);

    /**
     * Check if synonym exists
     */
    boolean existsBySynonym(String synonym);

    /**
     * Delete all synonyms for a food key
     */
    void deleteByCanonicalFoodKey(String canonicalFoodKey);

    /**
     * Count synonyms for a food key
     */
    long countByCanonicalFoodKey(String canonicalFoodKey);
}
