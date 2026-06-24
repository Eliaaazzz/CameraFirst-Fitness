package com.fitnessapp.backend.coach.agent;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class AgentToolRegistryTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private AgentTool fakeTool(String name, boolean fail) {
        return new AgentTool() {
            @Override
            public String name() {
                return name;
            }

            @Override
            public String description() {
                return "desc of " + name;
            }

            @Override
            public JsonNode parametersSchema() {
                ObjectNode s = mapper.createObjectNode();
                s.put("type", "object");
                return s;
            }

            @Override
            public JsonNode execute(JsonNode args, UUID userId) {
                if (fail) {
                    throw new IllegalStateException("boom");
                }
                return mapper.createObjectNode().put("ok", true);
            }
        };
    }

    @Test
    void declarationsExposeAllTools() {
        AgentToolRegistry registry = new AgentToolRegistry(
                List.of(fakeTool("alpha", false), fakeTool("beta", false)), mapper, new SimpleMeterRegistry());
        assertThat(registry.declarations()).extracting("name").containsExactlyInAnyOrder("alpha", "beta");
        assertThat(registry.has("alpha")).isTrue();
        assertThat(registry.has("missing")).isFalse();
    }

    @Test
    void executeReturnsToolResult() {
        AgentToolRegistry registry = new AgentToolRegistry(
                List.of(fakeTool("alpha", false)), mapper, new SimpleMeterRegistry());
        JsonNode result = registry.execute("alpha", mapper.createObjectNode(), UUID.randomUUID());
        assertThat(result.path("ok").asBoolean()).isTrue();
    }

    @Test
    void unknownToolReturnsErrorObservationNotException() {
        AgentToolRegistry registry = new AgentToolRegistry(
                List.of(fakeTool("alpha", false)), mapper, new SimpleMeterRegistry());
        JsonNode result = registry.execute("nope", mapper.createObjectNode(), UUID.randomUUID());
        assertThat(result.path("error").asText()).contains("Unknown tool");
    }

    @Test
    void failingToolIsIsolatedAsErrorObservation() {
        AgentToolRegistry registry = new AgentToolRegistry(
                List.of(fakeTool("alpha", true)), mapper, new SimpleMeterRegistry());
        JsonNode result = registry.execute("alpha", mapper.createObjectNode(), UUID.randomUUID());
        assertThat(result.path("error").asText()).isEqualTo("boom");
    }
}
