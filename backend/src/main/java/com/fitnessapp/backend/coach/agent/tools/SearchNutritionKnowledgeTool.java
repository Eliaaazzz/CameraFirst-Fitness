package com.fitnessapp.backend.coach.agent.tools;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.agent.AgentTool;
import com.fitnessapp.backend.coach.knowledge.GeminiEmbeddingService;
import com.fitnessapp.backend.coach.knowledge.NutritionKnowledgeRepository;
import com.fitnessapp.backend.coach.knowledge.NutritionKnowledgeRepository.KnowledgeMatch;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;

/**
 * Tool: retrieve grounded, citable facts from the curated nutrition knowledge base (RAG retrieval step).
 *
 * <p>This is the anti-hallucination front door for any nutrition/health <em>fact</em> question. It embeds
 * the query (Gemini), pulls the nearest knowledge chunks, and applies an <b>abstention threshold</b>: if
 * the best match is below {@code app.coach.knowledge.min-similarity}, it returns {@code abstain=true} so
 * the agent tells the user it has no grounded source instead of guessing. Returned {@code sources} carry
 * a citation index {@code [n]} the agent must use when asserting any claim.</p>
 */
@Slf4j
@Component
public class SearchNutritionKnowledgeTool implements AgentTool {

    private final NutritionKnowledgeRepository repository;
    private final GeminiEmbeddingService embeddingService;
    private final ObjectMapper objectMapper;
    private final double minSimilarity;

    private final DistributionSummary retrievalScore;
    private final Counter abstentions;
    private final Counter queries;

    public SearchNutritionKnowledgeTool(
            NutritionKnowledgeRepository repository,
            GeminiEmbeddingService embeddingService,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            @Value("${app.coach.knowledge.min-similarity:0.55}") double minSimilarity) {
        this.repository = repository;
        this.embeddingService = embeddingService;
        this.objectMapper = objectMapper;
        this.minSimilarity = minSimilarity;
        this.retrievalScore = DistributionSummary.builder("aura.coach.knowledge.retrieval.score")
                .description("Top cosine similarity of the best retrieved knowledge chunk")
                .register(meterRegistry);
        this.abstentions = Counter.builder("aura.coach.knowledge.abstentions")
                .description("Knowledge queries that abstained (best match below threshold)")
                .register(meterRegistry);
        this.queries = Counter.builder("aura.coach.knowledge.queries")
                .description("Total knowledge-base retrieval calls")
                .register(meterRegistry);
    }

    @Override
    public String name() {
        return "search_nutrition_knowledge";
    }

    @Override
    public String description() {
        return "Search the curated, citable nutrition/health knowledge base. You MUST call this before "
                + "stating any nutrition or health FACT (limits, RDAs, definitions, disease guidance). "
                + "Returns numbered sources to cite as [n]. If it returns abstain=true, tell the user you "
                + "don't have a grounded source and do NOT answer from memory.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        ObjectNode props = schema.putObject("properties");
        props.putObject("query").put("type", "string")
                .put("description", "The factual nutrition/health question to ground, e.g. 'daily added sugar limit'");
        props.putObject("limit").put("type", "integer")
                .put("description", "Max sources to retrieve (default 4)");
        schema.putArray("required").add("query");
        return schema;
    }

    @Override
    public JsonNode execute(JsonNode args, UUID userId) {
        String query = args.path("query").asText("").trim();
        if (query.isEmpty()) {
            return objectMapper.createObjectNode().put("error", "query is required");
        }
        int limit = Math.min(Math.max(args.path("limit").asInt(4), 1), 8);
        queries.increment();

        if (!embeddingService.isAvailable()) {
            // Honest degradation: no embeddings => no grounding => tell the model to abstain.
            return objectMapper.createObjectNode()
                    .put("abstain", true)
                    .put("reason", "knowledge base unavailable (embeddings not configured)");
        }

        float[] queryVec;
        try {
            queryVec = embeddingService.embed(query);
        } catch (Exception e) {
            log.warn("knowledge embed failed for query '{}': {}", query, e.getMessage());
            return objectMapper.createObjectNode()
                    .put("abstain", true)
                    .put("reason", "could not embed the query");
        }

        List<KnowledgeMatch> matches = repository.searchByEmbedding(toVectorString(queryVec), limit);
        double best = matches.isEmpty() ? 0.0
                : matches.stream().mapToDouble(m -> m.getSimilarity() == null ? 0.0 : m.getSimilarity()).max().orElse(0.0);
        retrievalScore.record(best);

        // Abstention gate: nothing sufficiently relevant => refuse to ground (prevents out-of-scope guessing).
        if (matches.isEmpty() || best < minSimilarity) {
            abstentions.increment();
            return objectMapper.createObjectNode()
                    .put("abstain", true)
                    .put("best_similarity", round(best))
                    .put("threshold", minSimilarity)
                    .put("reason", "no sufficiently relevant grounded source; tell the user you don't have "
                            + "reliable information on this rather than guessing");
        }

        ObjectNode out = objectMapper.createObjectNode();
        out.put("query", query);
        out.put("abstain", false);
        out.put("best_similarity", round(best));
        ArrayNode sources = out.putArray("sources");
        int n = 1;
        for (KnowledgeMatch m : matches) {
            if (m.getSimilarity() != null && m.getSimilarity() < minSimilarity) {
                continue; // only hand the model chunks above the grounding bar
            }
            ObjectNode s = sources.addObject();
            s.put("citation", n++);
            s.put("source", m.getSource());
            s.put("title", m.getTitle());
            s.put("content", m.getContent());
            if (m.getUrl() != null) {
                s.put("url", m.getUrl());
            }
            s.put("similarity", round(m.getSimilarity() == null ? 0.0 : m.getSimilarity()));
        }
        out.put("instruction", "Answer ONLY using these sources. Cite each claim as [n] using the citation "
                + "numbers above. If a claim is not supported by a source, omit it.");
        return out;
    }

    private static double round(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }

    private static String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format("%.8f", embedding[i]));
        }
        return sb.append(']').toString();
    }
}
