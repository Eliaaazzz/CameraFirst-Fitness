package com.fitnessapp.backend.coach.agent.tools;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitnessapp.backend.coach.knowledge.GeminiEmbeddingService;
import com.fitnessapp.backend.coach.knowledge.NutritionKnowledgeRepository;
import com.fitnessapp.backend.coach.knowledge.NutritionKnowledgeRepository.KnowledgeMatch;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

/**
 * Tests the deterministic anti-hallucination core of the knowledge tool: the abstention threshold and
 * the "only hand the model chunks above the grounding bar" filter. No LLM involved — pure retrieval gate.
 */
class SearchNutritionKnowledgeToolTest {

    private static final UUID USER = UUID.randomUUID();
    private static final double THRESHOLD = 0.55;

    private final ObjectMapper mapper = new ObjectMapper();
    private NutritionKnowledgeRepository repo;
    private GeminiEmbeddingService embeddings;
    private SearchNutritionKnowledgeTool tool;

    @BeforeEach
    void setUp() {
        repo = Mockito.mock(NutritionKnowledgeRepository.class);
        embeddings = Mockito.mock(GeminiEmbeddingService.class);
        tool = new SearchNutritionKnowledgeTool(repo, embeddings, mapper, new SimpleMeterRegistry(), THRESHOLD);
        when(embeddings.isAvailable()).thenReturn(true);
        when(embeddings.embed(Mockito.anyString())).thenReturn(new float[768]);
    }

    private KnowledgeMatch match(String source, String title, double sim) {
        return new KnowledgeMatch() {
            @Override public UUID getId() { return UUID.randomUUID(); }
            @Override public String getSource() { return source; }
            @Override public String getTitle() { return title; }
            @Override public String getContent() { return "content of " + title; }
            @Override public String getUrl() { return "https://example.org/" + title; }
            @Override public Double getSimilarity() { return sim; }
        };
    }

    private ObjectNode args(String query) {
        return mapper.createObjectNode().put("query", query);
    }

    @Test
    void returnsCitedSourcesWhenAboveThreshold() {
        when(repo.searchByEmbedding(Mockito.anyString(), Mockito.anyInt()))
                .thenReturn(List.of(match("WHO", "Added sugar limit", 0.82), match("IOM DRI", "Fiber", 0.61)));

        JsonNode out = tool.execute(args("daily added sugar limit"), USER);

        assertThat(out.path("abstain").asBoolean()).isFalse();
        assertThat(out.path("sources")).hasSize(2);
        assertThat(out.path("sources").get(0).path("citation").asInt()).isEqualTo(1);
        assertThat(out.path("sources").get(1).path("citation").asInt()).isEqualTo(2);
        assertThat(out.path("best_similarity").asDouble()).isEqualTo(0.82);
    }

    @Test
    void abstainsWhenBestBelowThreshold() {
        when(repo.searchByEmbedding(Mockito.anyString(), Mockito.anyInt()))
                .thenReturn(List.of(match("WHO", "x", 0.40), match("IOM DRI", "y", 0.30)));

        JsonNode out = tool.execute(args("how do I fix my car engine"), USER);

        assertThat(out.path("abstain").asBoolean()).isTrue();
        assertThat(out.has("sources")).isFalse();
        assertThat(out.path("reason").asText()).contains("guessing");
    }

    @Test
    void abstainsWhenNoMatches() {
        when(repo.searchByEmbedding(Mockito.anyString(), Mockito.anyInt())).thenReturn(List.of());
        assertThat(tool.execute(args("obscure question"), USER).path("abstain").asBoolean()).isTrue();
    }

    @Test
    void abstainsWhenEmbeddingsUnavailable() {
        when(embeddings.isAvailable()).thenReturn(false);
        JsonNode out = tool.execute(args("protein rda"), USER);
        assertThat(out.path("abstain").asBoolean()).isTrue();
        assertThat(out.path("reason").asText()).contains("unavailable");
    }

    @Test
    void filtersOutWeakChunksEvenWhenBestIsStrong() {
        when(repo.searchByEmbedding(Mockito.anyString(), Mockito.anyInt()))
                .thenReturn(List.of(match("WHO", "strong", 0.80), match("IOM DRI", "weak", 0.20)));

        JsonNode out = tool.execute(args("a real nutrition question"), USER);

        assertThat(out.path("abstain").asBoolean()).isFalse();
        // The 0.20 chunk is below the bar and must not be handed to the model to ground on.
        assertThat(out.path("sources")).hasSize(1);
        assertThat(out.path("sources").get(0).path("source").asText()).isEqualTo("WHO");
    }

    @Test
    void errorsOnEmptyQuery() {
        assertThat(tool.execute(args("   "), USER).path("error").asText()).contains("required");
    }
}
