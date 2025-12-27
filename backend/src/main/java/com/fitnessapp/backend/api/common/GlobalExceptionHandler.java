package com.fitnessapp.backend.api.common;

import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import com.fitnessapp.backend.recommendation.exception.RecommendationException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

/**
 * Global exception handler for consistent API error responses.
 *
 * <p>All exceptions are mapped to {@link ApiEnvelope} responses for consistency.
 * The handler supports both legacy {@link ErrorResponse} and new {@link ApiEnvelope} formats.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ========== Recommendation Exceptions ==========

    @ExceptionHandler(RecommendationException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleRecommendationException(
            RecommendationException ex,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = ex.getErrorCode();
        log.warn("Recommendation error [{}]: {}", errorCode.getCode(), ex.getMessage());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                errorCode,
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    @ExceptionHandler(EmbeddingGenerationException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleEmbeddingException(
            EmbeddingGenerationException ex,
            HttpServletRequest request
    ) {
        log.error("Embedding generation error: {}", ex.getMessage(), ex);

        ErrorCode errorCode = ex.isRetryable()
                ? ErrorCode.RECOMMENDATION_SERVICE_ERROR
                : ErrorCode.RECOMMENDATION_EMBEDDING_FAILED;

        ApiEnvelope<Void> response = ApiEnvelope.error(
                errorCode,
                "Failed to process content: " + ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    // ========== Entity Exceptions ==========

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleEntityNotFound(
            EntityNotFoundException ex,
            HttpServletRequest request
    ) {
        log.warn("Entity not found: {}", ex.getMessage());

        ErrorCode errorCode = ex.getMessage().contains("User")
                ? ErrorCode.USER_NOT_FOUND
                : ErrorCode.MEAL_NOT_FOUND;

        ApiEnvelope<Void> response = ApiEnvelope.error(errorCode, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    // ========== AI/Vision Exceptions ==========

    @ExceptionHandler(FoodRecognitionException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleFoodRecognition(
            FoodRecognitionException ex,
            HttpServletRequest request
    ) {
        log.error("Food recognition error: {}", ex.getMessage(), ex);

        ErrorCode errorCode;
        if (ex.getMessage().contains("Rate limit")) {
            errorCode = ErrorCode.AI_SERVICE_UNAVAILABLE;
        } else if (ex.getMessage().contains("unavailable")) {
            errorCode = ErrorCode.AI_SERVICE_UNAVAILABLE;
        } else if (ex.getMessage().contains("timeout")) {
            errorCode = ErrorCode.AI_TIMEOUT;
        } else {
            errorCode = ErrorCode.AI_RECOGNITION_FAILED;
        }

        ApiEnvelope<Void> response = ApiEnvelope.error(errorCode, ex.getMessage(), request.getRequestURI());
        return ResponseEntity.status(errorCode.getHttpStatus()).body(response);
    }

    @ExceptionHandler(TimeoutException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleTimeout(
            TimeoutException ex,
            HttpServletRequest request
    ) {
        log.error("Operation timeout: {}", ex.getMessage());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.AI_TIMEOUT,
                "Operation timed out, please try again",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).body(response);
    }

    // ========== Validation Exceptions ==========

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleValidationErrors(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        log.warn("Validation error: {}", ex.getMessage());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        ApiEnvelope<Void> response = ApiEnvelope.validationError(fieldErrors, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleMaxUploadSize(
            MaxUploadSizeExceededException ex,
            HttpServletRequest request
    ) {
        log.warn("File upload size exceeded: {}", ex.getMessage());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.AI_INVALID_IMAGE,
                "Image file is too large (max 10MB)",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        log.warn("Invalid argument: {}", ex.getMessage());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.INVALID_REQUEST,
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    // ========== Generic Exception (Catch-all) ==========

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiEnvelope<Void>> handleGenericException(
            Exception ex,
            HttpServletRequest request
    ) {
        log.error("Unexpected error occurred at {}: {}", request.getRequestURI(), ex.getMessage(), ex);

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.INTERNAL_ERROR,
                "An unexpected error occurred. Please try again later.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
