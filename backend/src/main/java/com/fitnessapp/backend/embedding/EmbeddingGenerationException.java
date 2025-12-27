package com.fitnessapp.backend.embedding;

/**
 * Exception thrown when embedding generation fails.
 * This allows upstream services to handle AI service failures gracefully.
 */
public class EmbeddingGenerationException extends RuntimeException {

    private final ErrorType errorType;
    private final boolean retryable;

    public enum ErrorType {
        API_KEY_MISSING("OpenAI API key not configured", false),
        EMPTY_INPUT("Empty or null text provided", false),
        RATE_LIMITED("API rate limit exceeded", true),
        TIMEOUT("Request timed out", true),
        NETWORK_ERROR("Network connection failed", true),
        API_ERROR("OpenAI API returned an error", true),
        INVALID_RESPONSE("Invalid response from OpenAI API", false),
        UNKNOWN("Unknown error occurred", true);

        private final String description;
        private final boolean retryable;

        ErrorType(String description, boolean retryable) {
            this.description = description;
            this.retryable = retryable;
        }

        public String getDescription() {
            return description;
        }

        public boolean isRetryable() {
            return retryable;
        }
    }

    public EmbeddingGenerationException(ErrorType errorType) {
        super(errorType.getDescription());
        this.errorType = errorType;
        this.retryable = errorType.isRetryable();
    }

    public EmbeddingGenerationException(ErrorType errorType, String message) {
        super(message);
        this.errorType = errorType;
        this.retryable = errorType.isRetryable();
    }

    public EmbeddingGenerationException(ErrorType errorType, String message, Throwable cause) {
        super(message, cause);
        this.errorType = errorType;
        this.retryable = errorType.isRetryable();
    }

    public ErrorType getErrorType() {
        return errorType;
    }

    public boolean isRetryable() {
        return retryable;
    }

    /**
     * Factory method for API key missing error.
     */
    public static EmbeddingGenerationException apiKeyMissing() {
        return new EmbeddingGenerationException(ErrorType.API_KEY_MISSING);
    }

    /**
     * Factory method for empty input error.
     */
    public static EmbeddingGenerationException emptyInput() {
        return new EmbeddingGenerationException(ErrorType.EMPTY_INPUT);
    }

    /**
     * Factory method for rate limit error.
     */
    public static EmbeddingGenerationException rateLimited(String message) {
        return new EmbeddingGenerationException(ErrorType.RATE_LIMITED, message);
    }

    /**
     * Factory method for timeout error.
     */
    public static EmbeddingGenerationException timeout(Throwable cause) {
        return new EmbeddingGenerationException(ErrorType.TIMEOUT, "Request timed out", cause);
    }

    /**
     * Factory method for network error.
     */
    public static EmbeddingGenerationException networkError(Throwable cause) {
        return new EmbeddingGenerationException(ErrorType.NETWORK_ERROR,
                "Network error: " + cause.getMessage(), cause);
    }

    /**
     * Factory method for API error.
     */
    public static EmbeddingGenerationException apiError(int statusCode, String responseBody) {
        return new EmbeddingGenerationException(ErrorType.API_ERROR,
                String.format("OpenAI API error (status %d): %s", statusCode, responseBody));
    }

    /**
     * Factory method for invalid response.
     */
    public static EmbeddingGenerationException invalidResponse(String message) {
        return new EmbeddingGenerationException(ErrorType.INVALID_RESPONSE, message);
    }
}
