package com.fitnessapp.backend.workout.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Array;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "exercise_videos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseVideo {
    @Id
    @Column(columnDefinition = "uuid")
    @GeneratedValue
    private UUID id;

    @Column(name = "exercise_slug", nullable = false)
    private String exerciseSlug;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @Column(name = "video_url", nullable = false)
    private String videoUrl;

    @Column(name = "youtube_id", nullable = false, unique = true)
    private String youtubeId;

    @Column(name = "r2_key", nullable = false, unique = true)
    private String r2Key;

    @Column(nullable = false)
    @Builder.Default
    private String platform = "youtube";

    @Column(name = "is_short", nullable = false)
    @Builder.Default
    private Boolean isShort = false;

    @Column(name = "primary_category", nullable = false)
    private String primaryCategory;

    @Column(name = "secondary_category")
    private String secondaryCategory;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "target_goal")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private java.util.List<String> targetGoal;

    /**
     * Vector embedding for semantic search (1536 dimensions for OpenAI).
     */
    @JdbcTypeCode(SqlTypes.VECTOR)
    @Array(length = 1536)
    @Column(name = "embedding")
    private float[] embedding;

    /**
     * Combined searchable text used for embedding generation.
     */
    @Column(name = "search_text", columnDefinition = "TEXT")
    private String searchText;

    /**
     * Timestamp when embedding was last generated.
     */
    @Column(name = "embedding_generated_at")
    private OffsetDateTime embeddingGeneratedAt;
}
