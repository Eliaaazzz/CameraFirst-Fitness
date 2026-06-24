package com.fitnessapp.backend.coach.agent.tools;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.recommendation.hybrid.HybridRecipe;
import com.fitnessapp.backend.recommendation.hybrid.HybridRecommenderService;

import lombok.RequiredArgsConstructor;

/**
 * Tool: recommend recipes via the hybrid recommender (pgvector content similarity ⊕ collaborative
 * "what people you follow saved", fused with RRF). The agent grounds and cites the returned recipes —
 * i.e. retrieve-then-ground (true RAG), not template generation.
 */
@Component
@RequiredArgsConstructor
public class RecommendRecipesTool implements AgentTool {

    private final HybridRecommenderService hybridRecommenderService;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "recommend_recipes";
    }

    @Override
    public String description() {
        return "Recommend recipes for the user by fusing semantic vector search with what people they "
                + "follow have saved (collaborative filtering). Returns recipes (title + why) to ground "
                + "and CITE in your answer. Use when the user wants meal ideas.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("query").put("type", "string")
                .put("description", "What kind of recipe / dietary need, e.g. 'high-protein no dairy dinner'");
        props.putObject("goal").put("type", "string")
                .put("description", "Optional goal filter, e.g. FAT_LOSS, BUILD_MUSCLE, BLOOD_SUGAR");
        props.putObject("limit").put("type", "integer").put("description", "Max recipes (default 5)");
        schema.putArray("required").add("query");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        String query = args.path("query").asText("").trim();
        if (query.isEmpty()) {
            return objectMapper.createObjectNode().put("error", "query is required");
        }
        String goal = args.hasNonNull("goal") ? args.get("goal").asText() : null;
        int limit = args.path("limit").asInt(5);

        List<HybridRecipe> recipes = hybridRecommenderService.recommend(userId, query, goal, limit);

        ObjectNode out = objectMapper.createObjectNode();
        out.put("query", query);
        out.put("count", recipes.size());
        ArrayNode arr = out.putArray("recipes");
        for (HybridRecipe r : recipes) {
            ObjectNode n = arr.addObject();
            n.put("id", r.id());
            n.put("title", r.title());
            if (r.similarityScore() != null) {
                n.put("similarity", r.similarityScore());
            }
            n.put("rrf_score", r.rrfScore());
            ArrayNode signals = n.putArray("signals");
            r.signals().forEach(signals::add);
        }
        return out;
    }
}
