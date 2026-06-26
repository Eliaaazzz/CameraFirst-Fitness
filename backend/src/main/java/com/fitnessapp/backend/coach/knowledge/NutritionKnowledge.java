package com.fitnessapp.backend.coach.knowledge;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A curated, citable nutrition/health fact used to ground (and cite) the Coach agent's answers.
 *
 * <p>Each row is the unit of retrieval for the RAG anti-hallucination layer: the agent embeds a user
 * question, retrieves the nearest rows by cosine similarity, and may only assert claims supported by
 * the retrieved {@code content} — citing the {@code source}/{@code url}. Embeddings are Gemini
 * {@code text-embedding-004} (768-dim).</p>
 */
@Entity
@Table(name = "nutrition_knowledge")
@Getter
@Setter
@NoArgsConstructor
public class NutritionKnowledge {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String url;

    @Column(columnDefinition = "TEXT")
    private String tags;

    @JdbcTypeCode(SqlTypes.VECTOR)
    @Array(length = 768)
    @Column(name = "embedding")
    private float[] embedding;

    @Column(name = "embedding_generated_at")
    private OffsetDateTime embeddingGeneratedAt;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public NutritionKnowledge(UUID id, String source, String title, String content, String url, String tags) {
        this.id = id;
        this.source = source;
        this.title = title;
        this.content = content;
        this.url = url;
        this.tags = tags;
        this.createdAt = OffsetDateTime.now();
    }
}
