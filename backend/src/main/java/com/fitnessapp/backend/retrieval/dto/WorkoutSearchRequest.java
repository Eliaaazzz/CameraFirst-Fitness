package com.fitnessapp.backend.retrieval.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Text-based workout search request
 */
@Value
@Builder
public class WorkoutSearchRequest {
    String query;           // Text query (e.g., "chest", "dumbbells", "beginner")
    String level;           // Filter by level: "beginner", "intermediate", "advanced"
    Integer maxDuration;    // Max duration in minutes
}
