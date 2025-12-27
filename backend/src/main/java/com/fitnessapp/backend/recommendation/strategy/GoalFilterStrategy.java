package com.fitnessapp.backend.recommendation.strategy;

import java.util.List;

/**
 * Strategy interface for goal-based filtering rules.
 *
 * CRITICAL DESIGN PRINCIPLE:
 * - Health constraints (BLOOD_SUGAR_CONTROL, FAT_LOSS) use HARD SQL filters
 * - These filters are applied BEFORE vector similarity search
 * - Vector similarity alone should NEVER override health constraints
 */
public interface GoalFilterStrategy {

    /**
     * Get the goal identifier
     */
    String getGoal();

    /**
     * Get hard filter SQL conditions for recipes.
     * This SQL is applied in the WHERE clause BEFORE vector similarity.
     *
     * Example for BLOOD_SUGAR_CONTROL:
     *   "(nutrition_summary->>'sugar')::numeric < 5 AND (nutrition_summary->>'fiber')::numeric > 3"
     *
     * @return SQL WHERE clause fragment, or null if no hard filter
     */
    String getRecipeHardFilterSql();

    /**
     * Whether this goal represents a health constraint that MUST be enforced.
     * Health constraints are always hard filtered, never soft scored.
     */
    boolean isHealthConstraint();

    /**
     * Get target goal tags for database matching
     */
    List<String> getTargetGoalTags();

    /**
     * Get workout type preferences
     */
    List<String> getPreferredWorkoutTypes();
}
