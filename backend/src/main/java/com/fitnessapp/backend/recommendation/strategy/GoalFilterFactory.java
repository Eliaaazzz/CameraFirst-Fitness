package com.fitnessapp.backend.recommendation.strategy;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * Factory for creating goal-based filter strategies.
 *
 * CRITICAL: Health-related goals (like BLOOD_SUGAR_CONTROL) use HARD FILTERS
 * that are enforced via SQL WHERE clauses BEFORE vector similarity search.
 * This ensures health constraints are never violated by vector similarity alone.
 */
@Component
public class GoalFilterFactory {

    /**
     * Create a combined strategy for multiple goals.
     * Hard filters are combined with AND, vector intents are concatenated.
     */
    public CombinedGoalFilter createFilter(List<String> goals) {
        if (goals == null || goals.isEmpty()) {
            goals = List.of("MAINTAIN");
        }

        List<GoalFilterStrategy> strategies = goals.stream()
                .map(this::createSingleFilter)
                .collect(Collectors.toList());

        return new CombinedGoalFilter(strategies);
    }

    private GoalFilterStrategy createSingleFilter(String goal) {
        String normalized = goal.toUpperCase(Locale.ROOT).trim();

        return switch (normalized) {
            case "BLOOD_SUGAR_CONTROL", "DIABETES", "LOW_GI" -> new BloodSugarControlStrategy();
            case "FAT_LOSS", "LOSE_WEIGHT", "WEIGHT_LOSS" -> new FatLossStrategy();
            case "BUILD_MUSCLE", "GAIN_MUSCLE", "MUSCLE_GAIN" -> new BuildMuscleStrategy();
            case "STRENGTH", "POWER" -> new StrengthStrategy();
            default -> new MaintainStrategy();
        };
    }

    // ============================================================================
    // Strategy Implementations with HARD SQL Filters
    // ============================================================================

    /**
     * Blood Sugar Control: HARD FILTER - sugar < 5g, fiber > 3g
     * This is a health constraint that MUST be enforced, not just scored.
     */
    static class BloodSugarControlStrategy implements GoalFilterStrategy {
        @Override
        public String getGoal() {
            return "BLOOD_SUGAR_CONTROL";
        }

        @Override
        public String getRecipeHardFilterSql() {
            // CRITICAL: Hard filter for blood sugar control
            // Sugar must be under 5g, fiber must be over 3g
            return """
                (nutrition_summary->>'sugar')::numeric < 5
                AND (nutrition_summary->>'fiber')::numeric > 3
                """;
        }

        @Override
        public boolean isHealthConstraint() {
            return true; // This is a health constraint - MUST be hard filtered
        }

        @Override
        public List<String> getTargetGoalTags() {
            return List.of("BLOOD_SUGAR_CONTROL", "LOW_GI", "DIABETES");
        }

        @Override
        public List<String> getPreferredWorkoutTypes() {
            return List.of("CARDIO", "WALKING", "YOGA");
        }
    }

    /**
     * Fat Loss: HARD FILTER - calories < 600
     */
    static class FatLossStrategy implements GoalFilterStrategy {
        @Override
        public String getGoal() {
            return "FAT_LOSS";
        }

        @Override
        public String getRecipeHardFilterSql() {
            // HARD FILTER: Calories must be under 600 for weight loss
            return "(nutrition_summary->>'calories')::numeric < 600";
        }

        @Override
        public boolean isHealthConstraint() {
            return true; // Calorie restriction is a hard constraint for fat loss
        }

        @Override
        public List<String> getTargetGoalTags() {
            return List.of("FAT_LOSS", "LOSE_WEIGHT", "WEIGHT_LOSS");
        }

        @Override
        public List<String> getPreferredWorkoutTypes() {
            return List.of("HIIT", "CARDIO", "CIRCUIT");
        }
    }

    /**
     * Build Muscle: HARD FILTER - protein > 20g (softened from 25g for better results)
     */
    static class BuildMuscleStrategy implements GoalFilterStrategy {
        @Override
        public String getGoal() {
            return "BUILD_MUSCLE";
        }

        @Override
        public String getRecipeHardFilterSql() {
            // HARD FILTER: Protein must be over 20g for muscle building
            return "(nutrition_summary->>'protein')::numeric > 20";
        }

        @Override
        public boolean isHealthConstraint() {
            return false; // Preference, not health constraint
        }

        @Override
        public List<String> getTargetGoalTags() {
            return List.of("BUILD_MUSCLE", "GAIN_MUSCLE", "HIGH_PROTEIN");
        }

        @Override
        public List<String> getPreferredWorkoutTypes() {
            return List.of("STRENGTH", "RESISTANCE", "HYPERTROPHY");
        }
    }

    /**
     * Strength: HARD FILTER - protein > 15g
     */
    static class StrengthStrategy implements GoalFilterStrategy {
        @Override
        public String getGoal() {
            return "STRENGTH";
        }

        @Override
        public String getRecipeHardFilterSql() {
            return "(nutrition_summary->>'protein')::numeric > 15";
        }

        @Override
        public boolean isHealthConstraint() {
            return false;
        }

        @Override
        public List<String> getTargetGoalTags() {
            return List.of("STRENGTH", "POWER", "HIGH_PROTEIN");
        }

        @Override
        public List<String> getPreferredWorkoutTypes() {
            return List.of("STRENGTH", "POWERLIFTING", "COMPOUND");
        }
    }

    /**
     * Maintain: No hard filters, use vector similarity only
     */
    static class MaintainStrategy implements GoalFilterStrategy {
        @Override
        public String getGoal() {
            return "MAINTAIN";
        }

        @Override
        public String getRecipeHardFilterSql() {
            return null; // No hard filter for general maintenance
        }

        @Override
        public boolean isHealthConstraint() {
            return false;
        }

        @Override
        public List<String> getTargetGoalTags() {
            return List.of("MAINTAIN", "BALANCED", "HEALTHY");
        }

        @Override
        public List<String> getPreferredWorkoutTypes() {
            return List.of("FULL_BODY", "CARDIO", "FLEXIBILITY");
        }
    }

    // ============================================================================
    // Combined Filter
    // ============================================================================

    /**
     * Combines multiple goal strategies.
     * CRITICAL: Health constraints are combined with AND in SQL WHERE clause.
     */
    public static class CombinedGoalFilter {
        private final List<GoalFilterStrategy> strategies;

        public CombinedGoalFilter(List<GoalFilterStrategy> strategies) {
            this.strategies = strategies;
        }

        /**
         * Get combined SQL WHERE clause for HARD filtering.
         * Returns null if no hard filters apply.
         */
        public String getCombinedRecipeHardFilterSql() {
            List<String> filters = strategies.stream()
                    .map(GoalFilterStrategy::getRecipeHardFilterSql)
                    .filter(sql -> sql != null && !sql.isBlank())
                    .collect(Collectors.toList());

            if (filters.isEmpty()) {
                return null;
            }

            // Combine with AND for multiple constraints
            return filters.stream()
                    .map(f -> "(" + f.trim() + ")")
                    .collect(Collectors.joining(" AND "));
        }

        /**
         * Check if any goal has a health constraint that MUST be hard filtered.
         */
        public boolean hasHealthConstraints() {
            return strategies.stream().anyMatch(GoalFilterStrategy::isHealthConstraint);
        }

        /**
         * Get all target goal tags for workout matching
         */
        public List<String> getAllTargetGoalTags() {
            return strategies.stream()
                    .flatMap(s -> s.getTargetGoalTags().stream())
                    .distinct()
                    .collect(Collectors.toList());
        }

        public List<String> getCombinedWorkoutTypes() {
            return strategies.stream()
                    .flatMap(s -> s.getPreferredWorkoutTypes().stream())
                    .distinct()
                    .collect(Collectors.toList());
        }

        public List<String> getGoals() {
            return strategies.stream()
                    .map(GoalFilterStrategy::getGoal)
                    .collect(Collectors.toList());
        }
    }
}
