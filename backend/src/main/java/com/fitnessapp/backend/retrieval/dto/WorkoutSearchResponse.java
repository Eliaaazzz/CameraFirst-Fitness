package com.fitnessapp.backend.retrieval.dto;

import java.util.List;

import lombok.Builder;
import lombok.Value;

/**
 * Text-based workout search response
 */
@Value
@Builder
public class WorkoutSearchResponse {
    List<WorkoutCard> workouts;
    int totalResults;
    String query;
    int latencyMs;
}
