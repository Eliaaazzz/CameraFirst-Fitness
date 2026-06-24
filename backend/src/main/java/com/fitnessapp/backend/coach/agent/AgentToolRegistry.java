package com.fitnessapp.backend.coach.agent;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessapp.backend.common.ai.GeminiModels.GeminiFunctionDeclaration;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;

/**
 * Discovers all {@link AgentTool} beans and exposes them to the agent as Gemini function declarations,
 * plus a single dispatch entry point that executes a named tool with metrics + error isolation.
 */
@Slf4j
@Component
public class AgentToolRegistry {

    private final Map<String, AgentTool> tools = new LinkedHashMap<>();
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public AgentToolRegistry(List<AgentTool> toolBeans, ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        for (AgentTool tool : toolBeans) {
            tools.put(tool.name(), tool);
        }
        log.info("AgentToolRegistry initialized with {} tools: {}", tools.size(), tools.keySet());
    }

    public List<GeminiFunctionDeclaration> declarations() {
        return tools.values().stream()
                .map(t -> GeminiFunctionDeclaration.builder()
                        .name(t.name())
                        .description(t.description())
                        .parameters(t.parametersSchema())
                        .build())
                .collect(Collectors.toList());
    }

    public boolean has(String name) {
        return tools.containsKey(name);
    }

    /**
     * Execute a tool by name. Never throws: failures (unknown tool, bad args, downstream error) are
     * returned as an {@code {"error": ...}} observation so the agent can recover instead of crashing.
     */
    public JsonNode execute(String name, JsonNode args, UUID userId) {
        AgentTool tool = tools.get(name);
        if (tool == null) {
            log.warn("Agent requested unknown tool: {}", name);
            return error("Unknown tool: " + name);
        }
        Timer.Sample sample = Timer.start(meterRegistry);
        String outcome = "success";
        try {
            JsonNode result = tool.execute(args == null ? objectMapper.createObjectNode() : args, userId);
            return result == null ? objectMapper.createObjectNode() : result;
        } catch (Exception e) {
            outcome = "error";
            log.warn("Tool '{}' failed: {}", name, e.getMessage());
            return error(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        } finally {
            sample.stop(Timer.builder("aura.agent.tool.latency")
                    .tag("tool", name)
                    .tag("outcome", outcome)
                    .publishPercentiles(0.5, 0.95, 0.99)
                    .register(meterRegistry));
            meterRegistry.counter("aura.agent.tool.invocations", "tool", name, "outcome", outcome).increment();
        }
    }

    private JsonNode error(String message) {
        return objectMapper.createObjectNode().put("error", message);
    }
}
