package com.fitnessapp.backend.common.ai;

/**
 * Unchecked exception for all {@link GeminiClient} failures (transport, rate limit, parse, circuit open).
 */
public class GeminiException extends RuntimeException {

    public GeminiException(String message) {
        super(message);
    }

    public GeminiException(String message, Throwable cause) {
        super(message, cause);
    }
}
