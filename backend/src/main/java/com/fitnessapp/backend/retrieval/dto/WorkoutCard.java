package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkoutCard implements Serializable {
    private static final long serialVersionUID = 1L;
    String id;
    String youtubeId;
    String title;
    Integer durationMinutes;
    String level;
    List<String> equipment;
    List<String> bodyParts;
    String thumbnailUrl;
    Long viewCount;
    String youtubeUrl;

    /**
     * Similarity score from vector search (0.0 - 1.0).
     * Only populated when using semantic recommendations.
     */
    Double similarityScore;
}
