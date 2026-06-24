package com.fitnessapp.backend.coach.agent.tools;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import com.fitnessapp.backend.nutrition.service.core.NutritionLookupService;

import lombok.RequiredArgsConstructor;

/** Tool: look up nutrition facts for a food by name/keyword (wraps {@link NutritionLookupService}). */
@Component
@RequiredArgsConstructor
public class FoodNutritionTool implements AgentTool {

    private static final int MAX_MATCHES = 5;

    private final NutritionLookupService lookupService;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "lookup_food_nutrition";
    }

    @Override
    public String description() {
        return "Look up nutrition facts (calories, protein, carbs, fat, fiber, sugar) for a food "
                + "by name or keyword. Use this whenever the user mentions a specific food.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("query").put("type", "string")
                .put("description", "Food name or keyword, e.g. 'grilled chicken breast'");
        schema.putArray("required").add("query");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        String query = args.path("query").asText("").trim();
        ObjectNode out = objectMapper.createObjectNode();
        if (query.isEmpty()) {
            return out.put("error", "query is required");
        }
        List<FoodNutrition> matches = lookupService.searchFoods(query);
        ArrayNode arr = out.putArray("matches");
        matches.stream().limit(MAX_MATCHES).forEach(f -> {
            ObjectNode n = arr.addObject();
            n.put("name", f.getDisplayName());
            n.put("category", f.getCategory());
            n.put("calories", asDouble(f.getCalories()));
            n.put("protein_g", asDouble(f.getProtein()));
            n.put("carbs_g", asDouble(f.getCarbs()));
            n.put("fat_g", asDouble(f.getFat()));
            n.put("fiber_g", asDouble(f.getFiber()));
            n.put("sugar_g", asDouble(f.getSugar()));
        });
        out.put("query", query);
        out.put("match_count", matches.size());
        return out;
    }

    private static double asDouble(java.math.BigDecimal v) {
        return v == null ? 0.0 : v.doubleValue();
    }
}
