package com.fitnessapp.backend.coach.agent.tools;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;

import lombok.RequiredArgsConstructor;

/** Tool: summarize the authenticated user's recent meal log (wraps {@link MealLogRepository}). */
@Component
@RequiredArgsConstructor
public class MealHistoryTool implements AgentTool {

    private static final int DEFAULT_DAYS = 7;
    private static final int MAX_DAYS = 31;
    private static final int MAX_MEALS_RETURNED = 40;

    private final MealLogRepository mealLogRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "query_user_meal_history";
    }

    @Override
    public String description() {
        return "Get the current user's logged meals over the last N days (default 7), with per-meal "
                + "macros and period totals. Use this to ground advice in what the user actually ate.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("days").put("type", "integer")
                .put("description", "How many days back to look (1-31, default 7)");
        schema.putArray("required");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        int days = args.path("days").asInt(DEFAULT_DAYS);
        if (days < 1) {
            days = DEFAULT_DAYS;
        }
        if (days > MAX_DAYS) {
            days = MAX_DAYS;
        }
        OffsetDateTime end = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime start = end.minusDays(days);

        List<MealLog> meals = mealLogRepository
                .findByUserIdAndConsumedAtBetweenOrderByConsumedAtDesc(userId, start, end);

        ObjectNode out = objectMapper.createObjectNode();
        out.put("days", days);
        out.put("meal_count", meals.size());

        long totalCalories = 0;
        double totalProtein = 0;
        double totalCarbs = 0;
        double totalFat = 0;
        ArrayNode arr = out.putArray("meals");
        int i = 0;
        for (MealLog m : meals) {
            totalCalories += m.getCalories() == null ? 0 : m.getCalories();
            totalProtein += asDouble(m.getProteinGrams());
            totalCarbs += asDouble(m.getCarbsGrams());
            totalFat += asDouble(m.getFatGrams());
            if (i++ < MAX_MEALS_RETURNED) {
                ObjectNode n = arr.addObject();
                n.put("name", m.getRecipeName());
                n.put("meal_type", m.getMealType());
                n.put("consumed_at", m.getConsumedAt() != null ? m.getConsumedAt().toString() : null);
                n.put("calories", m.getCalories());
                n.put("protein_g", asDouble(m.getProteinGrams()));
                n.put("carbs_g", asDouble(m.getCarbsGrams()));
                n.put("fat_g", asDouble(m.getFatGrams()));
            }
        }
        ObjectNode totals = out.putObject("totals");
        totals.put("calories", totalCalories);
        totals.put("protein_g", Math.round(totalProtein));
        totals.put("carbs_g", Math.round(totalCarbs));
        totals.put("fat_g", Math.round(totalFat));
        if (days > 0) {
            ObjectNode avg = out.putObject("daily_average");
            avg.put("calories", totalCalories / days);
            avg.put("protein_g", Math.round(totalProtein / days));
        }
        return out;
    }

    private static double asDouble(BigDecimal v) {
        return v == null ? 0.0 : v.doubleValue();
    }
}
