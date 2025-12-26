package com.fitnessapp.backend.recommendation.strategy;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * Expands user fitness goals into rich, descriptive sentences for embedding generation.
 *
 * Instead of embedding raw enums like "BUILD_MUSCLE", we expand them into
 * descriptive text that better captures the semantic intent for vector search.
 *
 * Example:
 *   Input:  ["BUILD_MUSCLE", "BLOOD_SUGAR_CONTROL"]
 *   Output: "I want to build lean muscle mass with high protein foods like chicken breast,
 *            salmon, eggs, Greek yogurt, and lean beef. I also need to control my blood
 *            sugar levels with low glycemic index foods, high fiber vegetables, and
 *            complex carbohydrates that release energy slowly."
 */
@Component
public class GoalSemanticExpander {

    /**
     * Expand a list of goals into a single descriptive paragraph for embedding.
     */
    public String expandGoalsToPrompt(List<String> goals) {
        if (goals == null || goals.isEmpty()) {
            return getDefaultPrompt();
        }

        List<String> expandedGoals = goals.stream()
                .map(this::expandSingleGoal)
                .collect(Collectors.toList());

        return String.join(" Additionally, ", expandedGoals);
    }

    /**
     * Expand a single goal enum to a descriptive sentence.
     */
    private String expandSingleGoal(String goal) {
        String normalized = goal.toUpperCase(Locale.ROOT).trim();

        return switch (normalized) {
            case "BUILD_MUSCLE", "GAIN_MUSCLE", "MUSCLE_GAIN" -> """
                I want to build lean muscle mass and support hypertrophy with high protein foods. \
                Ideal meals include grilled chicken breast, salmon fillet, scrambled eggs, Greek yogurt, \
                lean beef steak, cottage cheese, and protein-rich legumes like lentils and chickpeas. \
                Post-workout nutrition is important for muscle recovery and growth.""";

            case "BLOOD_SUGAR_CONTROL", "DIABETES", "LOW_GI" -> """
                I need to control my blood sugar levels and manage glycemic response. \
                I prefer low glycemic index (Low GI) foods that release glucose slowly, \
                such as leafy green vegetables, whole grains like quinoa and oats, \
                high-fiber foods, legumes, nuts, and foods with minimal added sugars. \
                Meals should be diabetes-friendly with controlled carbohydrate portions.""";

            case "FAT_LOSS", "LOSE_WEIGHT", "WEIGHT_LOSS" -> """
                I want to lose body fat and reduce weight through a calorie deficit. \
                I prefer high-volume, low-calorie foods that keep me full and satisfied, \
                such as leafy salads, grilled vegetables, lean proteins like chicken and fish, \
                egg whites, clear soups, and fiber-rich foods. Meals should be under 500 calories \
                while still providing essential nutrients.""";

            case "STRENGTH", "POWER", "POWERLIFTING" -> """
                I want to build strength and power for heavy lifting. \
                I need energy-dense meals with adequate protein and complex carbohydrates, \
                such as whole grain pasta, brown rice, sweet potatoes, lean red meat, \
                eggs, oatmeal, and nutrient-dense foods that fuel intense training sessions.""";

            case "MAINTAIN", "HEALTH", "BALANCED" -> """
                I want to maintain my current fitness level with balanced nutrition. \
                I prefer well-rounded meals with a good mix of lean proteins, \
                complex carbohydrates, healthy fats, and plenty of vegetables. \
                Variety and nutritional balance are important for overall health.""";

            default -> getDefaultPrompt();
        };
    }

    /**
     * Default prompt for general fitness
     */
    private String getDefaultPrompt() {
        return """
            I want healthy, balanced meals that support general fitness and wellbeing. \
            I prefer nutritious foods with a good balance of protein, carbohydrates, \
            and healthy fats, along with plenty of vegetables and whole foods.""";
    }

    /**
     * Expand goals for workout recommendations
     */
    public String expandGoalsForWorkouts(List<String> goals) {
        if (goals == null || goals.isEmpty()) {
            return "General fitness workout suitable for all levels with full body exercises.";
        }

        List<String> expandedGoals = goals.stream()
                .map(this::expandGoalForWorkout)
                .collect(Collectors.toList());

        return String.join(" ", expandedGoals);
    }

    private String expandGoalForWorkout(String goal) {
        String normalized = goal.toUpperCase(Locale.ROOT).trim();

        return switch (normalized) {
            case "BUILD_MUSCLE", "GAIN_MUSCLE" -> """
                Muscle building exercises focusing on hypertrophy, including compound movements \
                like bench press, squats, deadlifts, and isolation exercises for arms, chest, back, \
                and legs. Resistance training with progressive overload for muscle growth.""";

            case "BLOOD_SUGAR_CONTROL", "DIABETES" -> """
                Low to moderate intensity exercises that help regulate blood sugar, \
                such as walking, light cardio, yoga, and resistance training. \
                Steady-state activities that improve insulin sensitivity.""";

            case "FAT_LOSS", "LOSE_WEIGHT" -> """
                High intensity interval training (HIIT), cardio exercises, circuit training, \
                and metabolic conditioning workouts that maximize calorie burn. \
                Fat burning exercises with elevated heart rate.""";

            case "STRENGTH", "POWER" -> """
                Heavy compound lifts focusing on strength and power development, \
                including squats, deadlifts, bench press, overhead press, and rows. \
                Powerlifting and strength training movements.""";

            default -> "General fitness exercises suitable for overall health and wellness.";
        };
    }
}
