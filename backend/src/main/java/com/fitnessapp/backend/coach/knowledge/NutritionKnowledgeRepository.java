package com.fitnessapp.backend.coach.knowledge;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NutritionKnowledgeRepository extends JpaRepository<NutritionKnowledge, UUID> {

    /** Projection for a retrieved, scored knowledge chunk (the citable evidence). */
    interface KnowledgeMatch {
        UUID getId();
        String getSource();
        String getTitle();
        String getContent();
        String getUrl();
        Double getSimilarity();
    }

    /**
     * Top-k nearest knowledge chunks by cosine similarity (HNSW). {@code similarity} = 1 - cosine
     * distance in [0,1]; the tool applies an abstention threshold on it so out-of-scope questions
     * return nothing rather than a weakly-related (hallucination-prone) match.
     */
    @Query(value = """
        SELECT k.id AS id, k.source AS source, k.title AS title, k.content AS content, k.url AS url,
               1 - (k.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM nutrition_knowledge k
        WHERE k.embedding IS NOT NULL
        ORDER BY k.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<KnowledgeMatch> searchByEmbedding(@Param("embedding") String embedding, @Param("limit") int limit);

    long countByEmbeddingIsNotNull();

    boolean existsBySourceAndTitle(String source, String title);

    @Modifying
    @Query(value = "UPDATE nutrition_knowledge SET embedding = CAST(:embedding AS vector), "
            + "embedding_generated_at = :ts WHERE id = :id", nativeQuery = true)
    void updateEmbedding(@Param("id") UUID id, @Param("embedding") String embedding, @Param("ts") OffsetDateTime ts);
}
