package com.fitnessapp.backend.coach.agent.tools;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.recipe.service.RecipeSwapService;
import com.fitnessapp.backend.recipe.service.RecipeSwapService.AlternativeRecipe;

import lombok.RequiredArgsConstructor;

/** Tool: suggest macro-similar alternative recipes for a given recipe (wraps {@link RecipeSwapService}). */
@Component
@RequiredArgsConstructor
public class RecipeSwapTool implements AgentTool {

    private final RecipeSwapService recipeSwapService;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "suggest_recipe_swaps";
    }

    @Override
    public String description() {
        return "Given a recipe id the user wants to replace, suggest up to 3 macro-similar alternative "
                + "recipes. Use when the user wants to swap a meal or dislikes a recommended recipe.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("recipeId").put("type", "string")
                .put("description", "UUID of the recipe to find alternatives for");
        props.putObject("reason").put("type", "string")
                .put("description", "Why the user wants a swap (e.g. 'no dairy', 'too high carb')");
        schema.putArray("required").add("recipeId");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        String recipeIdRaw = args.path("recipeId").asText("").trim();
        String reason = args.path("reason").asText("");
        UUID recipeId;
        try {
            recipeId = UUID.fromString(recipeIdRaw);
        } catch (IllegalArgumentException e) {
            return objectMapper.createObjectNode().put("error", "recipeId must be a valid UUID");
        }
        List<AlternativeRecipe> alternatives = recipeSwapService.suggestAlternatives(userId, recipeId, reason);
        ObjectNode out = objectMapper.createObjectNode();
        out.put("recipeId", recipeIdRaw);
        out.put("count", alternatives.size());
        out.set("alternatives", objectMapper.valueToTree(alternatives));
        return out;
    }
}
