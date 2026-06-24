package com.fitnessapp.backend.coach.agent;

import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * A capability the Coach agent can invoke during its plan→act→observe loop.
 *
 * <p>Each tool is a thin, read-only adapter over an existing service. The agent decides (via Gemini
 * function calling) which tool to call and with what arguments; {@link #execute} runs it scoped to the
 * authenticated {@code userId} (never a user id from the model) and returns a JSON observation that is
 * fed back into the model.</p>
 */
public interface AgentTool {

    /** Unique snake_case tool name exposed to the model. */
    String name();

    /** One-line description the model uses to decide when to call this tool. */
    String description();

    /** JSON-Schema object describing the tool's parameters (Gemini functionDeclaration "parameters"). */
    JsonNode parametersSchema();

    /**
     * Execute the tool.
     *
     * @param args   the model-supplied arguments (validated against {@link #parametersSchema()} best-effort)
     * @param userId the authenticated caller — all data access MUST be scoped to this id
     * @return a JSON observation returned to the model
     */
    JsonNode execute(JsonNode args, UUID userId);
}
