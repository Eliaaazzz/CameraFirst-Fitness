package com.fitnessapp.backend.common.ai;

/**
 * Thrown when Gemini returns HTTP 429 (rate limited).
 *
 * <p>Modeled as a distinct type so the circuit breaker can be configured to IGNORE it: a rate limit
 * is a client-side backpressure signal, not an upstream fault, and should not trip the breaker.</p>
 */
public class GeminiRateLimitException extends GeminiException {

    public GeminiRateLimitException(String message) {
        super(message);
    }
}
