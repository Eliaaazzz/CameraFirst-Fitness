package com.fitnessapp.backend.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

import java.util.List;

/**
 * DTO for a workout video recommendation with match score and reasons.
 */
@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkoutRecommendation {

    /**
     * Exercise video ID
     */
    String id;

    /**
     * YouTube video ID
     */
    String youtubeId;

    /**
     * Exercise/workout title
     */
    String title;

    /**
     * Duration in minutes
     */
    Integer durationMinutes;

    /**
     * Difficulty level (beginner, intermediate, advanced)
     */
    String level;

    /**
     * Equipment required
     */
    List<String> equipment;

    /**
     * Target body parts
     */
    List<String> bodyParts;

    /**
     * Thumbnail image URL
     */
    String thumbnailUrl;

    /**
     * Full YouTube URL
     */
    String youtubeUrl;

    /**
     * Match score (0.0 to 1.0) indicating how well this workout matches user's goals
     */
    Double matchScore;

    /**
     * Human-readable reasons for why this workout matches user's goals
     */
    List<String> matchReasons;

    /**
     * Workout category (e.g., "strength", "cardio", "flexibility")
     */
    String workoutType;
}
