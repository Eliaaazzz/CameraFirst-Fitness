package com.fitnessapp.backend.recommendation.exception;

import com.fitnessapp.backend.api.common.ErrorCode;
import lombok.Getter;

/**
 * Business exception for recommendation service failures.
 *
 * <p>This exception is used to signal various recommendation-related errors
 * and is handled by the global exception handler to produce consistent API responses.
 *
 * <p>Usage example:
 * <pre>
 * throw new RecommendationException(ErrorCode.RECOMMENDATION_GOALS_MISSING);
 * throw new RecommendationException(ErrorCode.RECOMMENDATION_SERVICE_ERROR, "Embedding service timeout");
 * </pre>
 */
@Getter
public class RecommendationException extends RuntimeException {

    private final ErrorCode errorCode;

    /**
     * Create a recommendation exception with the specified error code.
     *
     * @param errorCode The error code from ErrorCode enum
     */
    public RecommendationException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * Create a recommendation exception with custom message.
     *
     * @param errorCode     The error code from ErrorCode enum
     * @param customMessage A custom error message (overrides default)
     */
    public RecommendationException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
    }

    /**
     * Create a recommendation exception with cause.
     *
     * @param errorCode The error code from ErrorCode enum
     * @param cause     The underlying cause
     */
    public RecommendationException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }

    /**
     * Create a recommendation exception with custom message and cause.
     *
     * @param errorCode     The error code from ErrorCode enum
     * @param customMessage A custom error message
     * @param cause         The underlying cause
     */
    public RecommendationException(ErrorCode errorCode, String customMessage, Throwable cause) {
        super(customMessage, cause);
        this.errorCode = errorCode;
    }

    // ========== Convenience Factory Methods ==========

    /**
     * Create exception for missing user profile.
     */
    public static RecommendationException profileMissing() {
        return new RecommendationException(ErrorCode.RECOMMENDATION_PROFILE_MISSING);
    }

    /**
     * Create exception for missing fitness goals.
     */
    public static RecommendationException goalsMissing() {
        return new RecommendationException(ErrorCode.RECOMMENDATION_GOALS_MISSING);
    }

    /**
     * Create exception for service unavailability.
     */
    public static RecommendationException serviceError(String message) {
        return new RecommendationException(ErrorCode.RECOMMENDATION_SERVICE_ERROR, message);
    }

    /**
     * Create exception for service unavailability with cause.
     */
    public static RecommendationException serviceError(String message, Throwable cause) {
        return new RecommendationException(ErrorCode.RECOMMENDATION_SERVICE_ERROR, message, cause);
    }

    /**
     * Create exception for embedding generation failure.
     */
    public static RecommendationException embeddingFailed(Throwable cause) {
        return new RecommendationException(ErrorCode.RECOMMENDATION_EMBEDDING_FAILED, cause);
    }
}
