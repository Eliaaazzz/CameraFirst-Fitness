package com.fitnessapp.backend.workout.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fitnessapp.backend.workout.entity.ExerciseVideo;

@Repository
public interface ExerciseVideoRepository extends JpaRepository<ExerciseVideo, UUID> {

    // ============================================================================
    // Vector Similarity Search (using pgvector)
    // ============================================================================

    /**
     * Projection interface for vector similarity search results.
     */
    interface VideoSimilarityResult {
        UUID getId();
        Double getSimilarity();
    }

    /**
     * Vector similarity search using cosine distance.
     * Returns video IDs with similarity scores.
     *
     * @param embedding Query embedding vector as string
     * @param limit Maximum number of results
     * @return List of video IDs with similarity scores
     */
    @Query(value = """
        SELECT e.id AS id, 1 - (e.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM exercise_videos e
        WHERE e.embedding IS NOT NULL
        ORDER BY e.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    java.util.List<VideoSimilarityResult> findBySimilarityWithScore(
            @Param("embedding") String embedding,
            @Param("limit") int limit);

    /**
     * Hybrid search: Vector similarity + target goal filter.
     * Combines semantic search with metadata filtering.
     */
    @Query(value = """
        SELECT e.id AS id, 1 - (e.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM exercise_videos e
        WHERE e.embedding IS NOT NULL
          AND :goal = ANY(e.target_goal)
        ORDER BY e.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    java.util.List<VideoSimilarityResult> findBySimilarityAndGoalWithScore(
            @Param("embedding") String embedding,
            @Param("goal") String goal,
            @Param("limit") int limit);

    /**
     * Hybrid search: Vector similarity + category filter.
     */
    @Query(value = """
        SELECT e.id AS id, 1 - (e.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM exercise_videos e
        WHERE e.embedding IS NOT NULL
          AND LOWER(e.primary_category) = LOWER(:category)
        ORDER BY e.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    java.util.List<VideoSimilarityResult> findBySimilarityAndCategoryWithScore(
            @Param("embedding") String embedding,
            @Param("category") String category,
            @Param("limit") int limit);

    /**
     * Find videos without embeddings for batch seeding.
     */
    @Query(value = "SELECT * FROM exercise_videos WHERE embedding IS NULL", nativeQuery = true)
    java.util.List<ExerciseVideo> findVideosWithoutEmbeddings();

    /**
     * Count videos with embeddings.
     */
    @Query(value = "SELECT COUNT(*) FROM exercise_videos WHERE embedding IS NOT NULL", nativeQuery = true)
    long countByEmbeddingIsNotNull();

    /**
     * Update embedding for a video using native SQL.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = """
        UPDATE exercise_videos
        SET embedding = CAST(:embedding AS vector),
            search_text = :searchText,
            embedding_generated_at = :updatedAt,
            updated_at = :updatedAt
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

    List<ExerciseVideo> findByPrimaryCategory(String category);

    List<ExerciseVideo> findByExerciseSlug(String slug);

    @Query(value = """
        SELECT * FROM exercise_videos e
        WHERE LOWER(e.exercise_name) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(e.exercise_slug) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(e.primary_category) LIKE LOWER(CONCAT('%', :query, '%'))
        ORDER BY e.exercise_name
        LIMIT :limit
        """, nativeQuery = true)
    List<ExerciseVideo> searchByKeyword(
            @Param("query") String query,
            @Param("limit") int limit);

    @Query(value = """
        SELECT * FROM exercise_videos e
        WHERE (:category IS NULL OR LOWER(e.primary_category) = LOWER(:category))
        ORDER BY e.exercise_name
        LIMIT :limit
        """, nativeQuery = true)
    List<ExerciseVideo> findByCategory(
            @Param("category") String category,
            @Param("limit") int limit);

    List<ExerciseVideo> findAllByOrderByExerciseNameAsc();

    /**
     * Find top exercises by target goal, returns diverse set from different categories
     */
    @Query(value = """
        SELECT * FROM exercise_videos e
        WHERE :goal = ANY(e.target_goal)
        ORDER BY e.primary_category, e.exercise_name
        LIMIT :limit
        """, nativeQuery = true)
    List<ExerciseVideo> findTopByTargetGoal(@Param("goal") String goal, @Param("limit") int limit);
}
