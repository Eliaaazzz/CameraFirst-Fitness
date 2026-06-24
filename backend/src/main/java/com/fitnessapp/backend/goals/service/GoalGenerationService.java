package com.fitnessapp.backend.goals.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.common.ai.GeminiClient;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiRequest;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiResponse;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiTurn;
import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest;
import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest.ActivityLevel;
import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest.GoalType;
import com.fitnessapp.backend.goals.dto.GenerateGoalsRequest.Sex;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse.DailyCalories;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse.MacrosGrams;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse.MilestoneItem;
import com.fitnessapp.backend.goals.dto.GenerateGoalsResponse.WeeklyActivityPlan;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for generating personalized fitness goals using Gemini AI.
 * Falls back to calculation-based goals if Gemini is unavailable.
 */
@Slf4j
@Service
public class GoalGenerationService {

    private static final int MAX_OUTPUT_TOKENS = 2048;
    private static final double MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G = 4.0;
    private static final double MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G = 0.5;
    private static final double ESTIMATED_FIBER_RATIO = 0.10;

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    public GoalGenerationService(GeminiClient geminiClient, ObjectMapper objectMapper) {
        this.geminiClient = geminiClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Generate personalized fitness goals.
     * Uses Gemini AI if available, otherwise falls back to calculations.
     */
    public GenerateGoalsResponse generateGoals(GenerateGoalsRequest request) {
        if (geminiClient.isConfigured()) {
            try {
                log.info("Generating goals via Gemini AI for {} user, goal: {}",
                        request.getSex(), request.getGoalType());
                return generateGoalsWithGemini(request);
            } catch (Exception e) {
                log.error("Gemini AI goal generation failed, using fallback: {}", e.getMessage());
            }
        }

        log.info("Using fallback calculation for goal generation");
        return generateFallbackGoals(request);
    }

    private GenerateGoalsResponse generateGoalsWithGemini(GenerateGoalsRequest request) throws Exception {
        String prompt = buildPrompt(request);
        GeminiResponse response = geminiClient.generate(GeminiRequest.builder()
                .callSite("goals")
                .turn(GeminiTurn.user(prompt))
                .temperature(0.3)
                .maxOutputTokens(MAX_OUTPUT_TOKENS)
                .jsonMode(true)
                .hedge(true)
                .build());
        return parseGoalsFromText(response.getText(), request);
    }

    private String buildPrompt(GenerateGoalsRequest request) {
        String goalDescription = switch (request.getGoalType()) {
            case fat_loss -> "lose body fat while preserving muscle mass";
            case muscle_gain -> "build muscle mass and strength";
            case diabetes_control -> "manage blood sugar levels for diabetes management (TYPE 2 DIABETES)";
        };

        String sexDescription = switch (request.getSex()) {
            case male -> "male";
            case female -> "female";
            case prefer_not_to_say -> "adult (sex not specified)";
        };

        String activityDesc = request.getActivityLevel() != null ?
                request.getActivityLevel().name() : "medium";

        String diabetesWarning = request.getGoalType() == GoalType.diabetes_control ?
                "\n\nIMPORTANT: This is for diabetes management. Include LOW glycemic index recommendations. " +
                        "In safetyNote, MUST include: 'This is NOT medical advice. Please consult your doctor or " +
                        "certified diabetes educator before making dietary changes.'" : "";

        return String.format("""
            You are a certified fitness and nutrition expert. Generate personalized fitness goals.

            User Profile:
            - Sex: %s
            - Height: %d cm
            - Weight: %d kg
            - Activity Level: %s
            - Primary Goal: %s
            %s

            Return ONLY valid JSON (no markdown, no explanations) matching this exact structure:
            {
                "dailyCalories": {
                    "min": <number>,
                    "target": <number>,
                    "max": <number>,
                    "rationale": "<brief explanation>"
                },
                "macros_grams": {
                    "protein_g": <number>,
                    "carbs_g": <number>,
                    "fat_g": <number>,
                    "blood_sugar_rise_mg_dl": <number>,
                    "notes": "<macro strategy explanation>"
                },
                "sugarLimit_g_per_day": <number>,
                "fiberTarget_g_per_day": <number>,
                "weeklyActivityPlan": {
                    "cardio_minutes_per_week": <number>,
                    "strength_sessions_per_week": <number>,
                    "steps_per_day_target": <number>,
                    "notes": "<activity strategy>"
                },
                "milestonesChecklist": [
                    {"id": "1", "title": "<milestone>", "frequency": "<daily/weekly/monthly>", "metric": "<measurable target>"},
                    {"id": "2", "title": "<milestone>", "frequency": "<daily/weekly/monthly>", "metric": "<measurable target>"},
                    {"id": "3", "title": "<milestone>", "frequency": "<daily/weekly/monthly>", "metric": "<measurable target>"},
                    {"id": "4", "title": "<milestone>", "frequency": "<daily/weekly/monthly>", "metric": "<measurable target>"},
                    {"id": "5", "title": "<milestone>", "frequency": "<daily/weekly/monthly>", "metric": "<measurable target>"}
                ],
                "safetyNote": "<important health disclaimer>"
            }

            Use Mifflin-St Jeor equation for BMR (assume adult age ~30 for calculation). Apply appropriate activity multiplier and goal adjustment.
            For fat_loss: 15-20%% calorie deficit. For muscle_gain: 10-15%% surplus. For diabetes_control: focus on low GI, controlled carbs.

            Return ONLY the JSON object, nothing else.
            """, sexDescription, request.getHeightCm(), request.getWeightKg(),
                activityDesc, goalDescription, diabetesWarning);
    }

    private GenerateGoalsResponse parseGoalsFromText(String textContent, GenerateGoalsRequest request) throws Exception {
        if (textContent == null || textContent.isBlank()) {
            throw new RuntimeException("Empty response from Gemini");
        }
        log.debug("Gemini raw response: {}", textContent);

        // Extract JSON from potential markdown code blocks
        String jsonContent = extractJson(textContent);
        log.info("Extracted JSON content length: {}", jsonContent.length());

        try {
            GenerateGoalsResponse result = objectMapper.readValue(jsonContent, GenerateGoalsResponse.class);

            applyDerivedMacroMetrics(result);

            // Ensure diabetes safety note is present
            if (request.getGoalType() == GoalType.diabetes_control &&
                    (result.getSafetyNote() == null || !result.getSafetyNote().toLowerCase().contains("medical advice"))) {
                result.setSafetyNote("IMPORTANT: This is NOT medical advice. These recommendations are for general " +
                        "wellness information only. Please consult your doctor, endocrinologist, or certified diabetes " +
                        "educator before making any changes to your diet or exercise routine. Individual responses to " +
                        "dietary changes vary, and blood sugar should be monitored closely.");
            }

            return result;
        } catch (Exception e) {
            log.error("Failed to parse Gemini JSON response: {}", e.getMessage());
            log.debug("Raw content that failed to parse: {}", jsonContent);
            throw e;
        }
    }

    private String extractJson(String text) {
        // Try to extract JSON from markdown code blocks
        Pattern jsonBlockPattern = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```");
        Matcher matcher = jsonBlockPattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        // If no code block, try to find JSON object directly
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return text.substring(start, end + 1);
        }

        return text;
    }

    /**
     * Generate fallback goals using Mifflin-St Jeor equation.
     * Used when Gemini AI is unavailable.
     */
    public GenerateGoalsResponse generateFallbackGoals(GenerateGoalsRequest request) {
        int age = 30; // Default age for BMR calculation
        Sex sex = request.getSex();
        int heightCm = request.getHeightCm();
        int weightKg = request.getWeightKg();
        GoalType goalType = request.getGoalType();
        ActivityLevel activityLevel = request.getActivityLevel() != null ?
                request.getActivityLevel() : ActivityLevel.medium;

        // Mifflin-St Jeor BMR calculation
        double bmr;
        if (sex == Sex.male) {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
        } else if (sex == Sex.female) {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
        } else {
            // Average for prefer_not_to_say
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
        }

        // Activity multiplier
        double multiplier = switch (activityLevel) {
            case low -> 1.2;
            case medium -> 1.55;
            case high -> 1.725;
        };

        double tdee = bmr * multiplier;

        // Goal adjustment
        int targetCalories;
        int proteinMultiplier;
        double carbsPercent;
        double fatPercent;
        String calorieRationale;
        String macroNotes;

        switch (goalType) {
            case fat_loss -> {
                targetCalories = (int) (tdee * 0.82); // 18% deficit
                proteinMultiplier = 2; // Higher protein to preserve muscle
                carbsPercent = 0.35;
                fatPercent = 0.25;
                calorieRationale = String.format("Based on your TDEE of ~%.0f kcal, a moderate 18%% deficit " +
                        "supports sustainable fat loss while preserving muscle mass.", tdee);
                macroNotes = "Higher protein (2g/kg) to preserve muscle during deficit. " +
                        "Moderate carbs for energy, healthy fats for hormones.";
            }
            case muscle_gain -> {
                targetCalories = (int) (tdee * 1.12); // 12% surplus
                proteinMultiplier = 2; // High protein for muscle synthesis
                carbsPercent = 0.45;
                fatPercent = 0.25;
                calorieRationale = String.format("Based on your TDEE of ~%.0f kcal, a 12%% surplus " +
                        "provides energy for muscle growth without excessive fat gain.", tdee);
                macroNotes = "High protein (2g/kg) for muscle protein synthesis. " +
                        "Higher carbs to fuel workouts and recovery.";
            }
            case diabetes_control -> {
                targetCalories = (int) tdee; // Maintenance for blood sugar stability
                proteinMultiplier = 1; // Moderate protein
                carbsPercent = 0.30; // Lower carbs for blood sugar control
                fatPercent = 0.35; // Higher healthy fats
                calorieRationale = String.format("Based on your TDEE of ~%.0f kcal, maintenance calories " +
                        "support stable blood sugar while meeting energy needs.", tdee);
                macroNotes = "Lower carbs (30%%) emphasizing low glycemic index foods. " +
                        "Higher healthy fats, moderate protein. Focus on fiber-rich vegetables.";
            }
            default -> throw new IllegalStateException("Unknown goal type: " + goalType);
        }

        int proteinG = weightKg * proteinMultiplier;
        int fatG = (int) ((targetCalories * fatPercent) / 9);
        int carbsG = (int) ((targetCalories * carbsPercent) / 4);
        int bloodSugarRise = estimateBloodSugarRiseMgDl(carbsG, proteinG);

        // Sugar and fiber targets
        int sugarLimit = goalType == GoalType.diabetes_control ? 20 : 25;
        int fiberTarget = sex == Sex.female ? 25 : 30;

        // Activity plan based on goal
        WeeklyActivityPlan activityPlan = switch (goalType) {
            case fat_loss -> WeeklyActivityPlan.builder()
                    .cardioMinutesPerWeek(150)
                    .strengthSessionsPerWeek(3)
                    .stepsPerDayTarget(10000)
                    .notes("Mix of steady-state and HIIT cardio. Strength training preserves muscle during deficit.")
                    .build();
            case muscle_gain -> WeeklyActivityPlan.builder()
                    .cardioMinutesPerWeek(75)
                    .strengthSessionsPerWeek(4)
                    .stepsPerDayTarget(8000)
                    .notes("Focus on progressive overload. Limit cardio to preserve energy for muscle growth.")
                    .build();
            case diabetes_control -> WeeklyActivityPlan.builder()
                    .cardioMinutesPerWeek(150)
                    .strengthSessionsPerWeek(2)
                    .stepsPerDayTarget(8000)
                    .notes("Regular walking after meals helps glucose uptake. Strength training improves insulin sensitivity.")
                    .build();
        };

        // Milestones based on goal
        List<MilestoneItem> milestones = generateMilestones(goalType);

        // Safety note
        String safetyNote = goalType == GoalType.diabetes_control ?
                "IMPORTANT: This is NOT medical advice. These recommendations are for general wellness " +
                        "information only. Please consult your doctor, endocrinologist, or certified diabetes " +
                        "educator before making any changes to your diet or exercise routine. Monitor your blood " +
                        "sugar levels closely and adjust based on your individual response." :
                "These recommendations are generated for informational purposes and general wellness guidance. " +
                        "Please consult a healthcare professional before making significant changes to your diet " +
                        "or exercise routine, especially if you have any health conditions.";

        return GenerateGoalsResponse.builder()
                .dailyCalories(DailyCalories.builder()
                        .min((int) (targetCalories * 0.9))
                        .target(targetCalories)
                        .max((int) (targetCalories * 1.1))
                        .rationale(calorieRationale)
                        .build())
                .macrosGrams(MacrosGrams.builder()
                        .proteinG(proteinG)
                        .carbsG(carbsG)
                        .fatG(fatG)
                        .bloodSugarRiseMgDl(bloodSugarRise)
                        .notes(macroNotes)
                        .build())
                .sugarLimitGPerDay(sugarLimit)
                .fiberTargetGPerDay(fiberTarget)
                .weeklyActivityPlan(activityPlan)
                .milestonesChecklist(milestones)
                .safetyNote(safetyNote)
                .build();
    }

    private void applyDerivedMacroMetrics(GenerateGoalsResponse result) {
        if (result == null || result.getMacrosGrams() == null) {
            return;
        }

        MacrosGrams macros = result.getMacrosGrams();
        macros.setBloodSugarRiseMgDl(estimateBloodSugarRiseMgDl(macros.getCarbsG(), macros.getProteinG()));
    }

    private int estimateBloodSugarRiseMgDl(Integer carbsG, Integer proteinG) {
        int carbs = carbsG != null ? Math.max(0, carbsG) : 0;
        int protein = proteinG != null ? Math.max(0, proteinG) : 0;
        int estimatedFiber = (int) Math.round(carbs * ESTIMATED_FIBER_RATIO);
        int netCarbs = Math.max(0, carbs - estimatedFiber);

        return (int) Math.round(
                netCarbs * MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G +
                        protein * MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G
        );
    }

    private List<MilestoneItem> generateMilestones(GoalType goalType) {
        return switch (goalType) {
            case fat_loss -> Arrays.asList(
                    MilestoneItem.builder().id("1").title("Log all meals").frequency("daily").metric("100% logged days").build(),
                    MilestoneItem.builder().id("2").title("Hit protein target").frequency("daily").metric("Within 10g of goal").build(),
                    MilestoneItem.builder().id("3").title("Complete cardio sessions").frequency("weekly").metric("150 min/week").build(),
                    MilestoneItem.builder().id("4").title("Strength training").frequency("weekly").metric("3 sessions/week").build(),
                    MilestoneItem.builder().id("5").title("Weekly weigh-in").frequency("weekly").metric("Track progress trend").build()
            );
            case muscle_gain -> Arrays.asList(
                    MilestoneItem.builder().id("1").title("Hit calorie surplus").frequency("daily").metric("Within 100 kcal").build(),
                    MilestoneItem.builder().id("2").title("Hit protein target").frequency("daily").metric("2g per kg bodyweight").build(),
                    MilestoneItem.builder().id("3").title("Progressive overload").frequency("weekly").metric("Increase weight/reps").build(),
                    MilestoneItem.builder().id("4").title("Strength sessions").frequency("weekly").metric("4 sessions/week").build(),
                    MilestoneItem.builder().id("5").title("Sleep 7-9 hours").frequency("daily").metric("Recovery priority").build()
            );
            case diabetes_control -> Arrays.asList(
                    MilestoneItem.builder().id("1").title("Log meals with carbs").frequency("daily").metric("Track carb portions").build(),
                    MilestoneItem.builder().id("2").title("Post-meal walk").frequency("daily").metric("10-15 min after meals").build(),
                    MilestoneItem.builder().id("3").title("Check blood sugar").frequency("daily").metric("As prescribed by doctor").build(),
                    MilestoneItem.builder().id("4").title("Eat fiber-rich foods").frequency("daily").metric("25-30g fiber/day").build(),
                    MilestoneItem.builder().id("5").title("Limit added sugars").frequency("daily").metric("Under 20g/day").build()
            );
        };
    }
}
