package com.fitnessapp.backend.api.common;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.fitnessapp.backend.embedding.EmbeddingGenerationException;
import com.fitnessapp.backend.auth.AuthenticationException;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import com.fitnessapp.backend.recommendation.exception.RecommendationException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

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
        } else if (ex.getMessage().contains("API key expired") || ex.getMessage().contains("API_KEY_INVALID")) {
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

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleAuthenticationException(
            AuthenticationException ex,
            HttpServletRequest request
    ) {
        log.warn("Authentication error at {}: {}", request.getRequestURI(), ex.getMessage());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.UNAUTHORIZED,
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

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

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleIllegalState(
            IllegalStateException ex,
            HttpServletRequest request
    ) {
        // Check if this is an authentication-related error (from CurrentUser.requireUserId())
        String message = ex.getMessage();
        if (message != null && (message.contains("User context is missing")
                || message.contains("X-API-Key")
                || message.contains("Authentication required"))) {
            log.warn("Authentication required: {} at {}", message, request.getRequestURI());
            ApiEnvelope<Void> response = ApiEnvelope.error(
                    ErrorCode.UNAUTHORIZED,
                    "Authentication required",
                    request.getRequestURI()
            );
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // For other IllegalStateException cases, treat as bad request
        log.warn("Illegal state: {}", message);
        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.INVALID_REQUEST,
                message != null ? message : "Invalid operation state",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    // ========== HTTP Method Exceptions ==========

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleNoResourceFound(
            NoResourceFoundException ex,
            HttpServletRequest request
    ) {
        log.warn("Resource not found: {}", request.getRequestURI());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.INVALID_REQUEST,
                "Resource not found",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex,
            HttpServletRequest request
    ) {
        log.warn("Method not allowed: {} {} - Supported: {}", 
                ex.getMethod(), request.getRequestURI(), ex.getSupportedHttpMethods());

        ApiEnvelope<Void> response = ApiEnvelope.error(
                ErrorCode.INVALID_REQUEST,
                String.format("HTTP method '%s' is not supported for this endpoint", ex.getMethod()),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
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
