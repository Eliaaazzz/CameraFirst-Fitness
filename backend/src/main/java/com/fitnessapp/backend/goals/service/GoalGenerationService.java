package com.fitnessapp.backend.goals.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
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

    private static final String MODEL = "gemini-2.0-flash";
    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
    private static final int MAX_OUTPUT_TOKENS = 2048;
    private static final int TIMEOUT_SECONDS = 30;

    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public GoalGenerationService(
            ObjectMapper objectMapper,
            @Value("${app.gemini.api-key:}") String apiKey
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .readTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .writeTimeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                .build();

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key not configured - goal generation will use fallback calculations");
        } else {
            log.info("GoalGenerationService initialized with Gemini AI");
        }
    }

    /**
     * Generate personalized fitness goals.
     * Uses Gemini AI if available, otherwise falls back to calculations.
     */
    public GenerateGoalsResponse generateGoals(GenerateGoalsRequest request) {
        if (apiKey != null && !apiKey.isBlank()) {
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
        String requestBody = buildGeminiRequestBody(prompt);

        Request httpRequest = new Request.Builder()
                .url(GEMINI_API_URL + "?key=" + apiKey)
                .addHeader("content-type", "application/json")
                .post(RequestBody.create(requestBody, MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(httpRequest).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "No error body";
                log.error("Gemini API error ({}): {}", response.code(), errorBody);
                throw new RuntimeException("Gemini API error: " + response.code());
            }

            String responseBody = response.body() != null ? response.body().string() : "";
            return parseGeminiResponse(responseBody, request);
        }
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

        int age = request.getAge() != null ? request.getAge() : 30;
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
            - Age: %d years
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

            Use Mifflin-St Jeor equation for BMR. Apply appropriate activity multiplier and goal adjustment.
            For fat_loss: 15-20%% calorie deficit. For muscle_gain: 10-15%% surplus. For diabetes_control: focus on low GI, controlled carbs.

            Return ONLY the JSON object, nothing else.
            """, sexDescription, age, request.getHeightCm(), request.getWeightKg(),
                activityDesc, goalDescription, diabetesWarning);
    }

    private String buildGeminiRequestBody(String prompt) {
        String escapedPrompt = prompt.replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        return String.format("""
            {
              "contents": [
                {
                  "parts": [
                    { "text": "%s" }
                  ]
                }
              ],
              "generationConfig": {
                "maxOutputTokens": %d,
                "temperature": 0.3
              }
            }
            """, escapedPrompt, MAX_OUTPUT_TOKENS);
    }

    private GenerateGoalsResponse parseGeminiResponse(String responseBody, GenerateGoalsRequest request) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidates = root.path("candidates");

        if (!candidates.isArray() || candidates.isEmpty()) {
            throw new RuntimeException("Invalid response structure from Gemini");
        }

        JsonNode parts = candidates.get(0).path("content").path("parts");
        StringBuilder textBuilder = new StringBuilder();
        for (JsonNode part : parts) {
            if (part.has("text")) {
                textBuilder.append(part.get("text").asText());
            }
        }

        String textContent = textBuilder.toString().trim();
        log.debug("Gemini raw response: {}", textContent);

        // Extract JSON from potential markdown code blocks
        String jsonContent = extractJson(textContent);
        log.info("Extracted JSON content length: {}", jsonContent.length());

        try {
            GenerateGoalsResponse result = objectMapper.readValue(jsonContent, GenerateGoalsResponse.class);

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
        int age = request.getAge() != null ? request.getAge() : 30;
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
                        .notes(macroNotes)
                        .build())
                .sugarLimitGPerDay(sugarLimit)
                .fiberTargetGPerDay(fiberTarget)
                .weeklyActivityPlan(activityPlan)
                .milestonesChecklist(milestones)
                .safetyNote(safetyNote)
                .build();
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
