package com.fitnessapp.backend.coach.service;

/**
 * An event streamed from the Coach agent to the client over SSE/WebSocket.
 * {@code type} is the SSE event name; {@code data} is serialized to JSON.
 */
public record AgentEvent(String type, Object data) {

    public static AgentEvent meta(Object data) {
        return new AgentEvent("meta", data);
    }

    public static AgentEvent token(String text) {
        return new AgentEvent("token", text);
    }

    public static AgentEvent toolCall(Object data) {
        return new AgentEvent("tool_call", data);
    }

    public static AgentEvent toolResult(Object data) {
        return new AgentEvent("tool_result", data);
    }

    /**
     * Result of the post-answer faithfulness check: a groundedness score, the cited sources, and any
     * claims the verifier could not support. Lets the client show a "grounded / N sources / M unverified"
     * badge so hallucination risk is visible rather than hidden.
     */
    public static AgentEvent groundedness(Object data) {
        return new AgentEvent("groundedness", data);
    }

    public static AgentEvent done(Object data) {
        return new AgentEvent("done", data);
    }

    public static AgentEvent error(String message) {
        return new AgentEvent("error", message);
    }
}
