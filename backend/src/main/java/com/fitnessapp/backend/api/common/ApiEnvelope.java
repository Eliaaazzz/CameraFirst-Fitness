package com.fitnessapp.backend.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified API response envelope for all endpoints.
 *
 * <p>Provides a consistent response structure across the entire API:
 * <pre>
 * {
 *   "success": true,
 *   "code": 200,
 *   "message": "Success",
 *   "data": { ... },
 *   "timestamp": 1703666000000
 * }
 * </pre>
 *
 * <p>For error responses:
 * <pre>
 * {
 *   "success": false,
 *   "code": 5001,
 *   "message": "Validation error",
 *   "errors": { "field": "error message" },
 *   "path": "/api/v1/recommendations/generate",
 *   "timestamp": 1703666000000
 * }
 * </pre>
 *
 * @param <T> The type of the data payload
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Standard API response envelope")
public class ApiEnvelope<T> {

    @Schema(description = "Whether the request was successful", example = "true")
    private boolean success;

    @Schema(description = "Response code (200 for success, error codes for failures)", example = "200")
    private int code;

    @Schema(description = "Human-readable response message", example = "Success")
    private String message;

    @Schema(description = "Response data payload")
    private T data;

    @Schema(description = "Validation errors (only present for validation failures)")
    private Object errors;

    @Schema(description = "Request path (only present for errors)", example = "/api/v1/recommendations/generate")
    private String path;

    @Schema(description = "Response timestamp in milliseconds", example = "1703666000000")
    private long timestamp;

    // ========== Legacy Support ==========

    /**
     * Legacy factory method for backward compatibility.
     * @deprecated Use {@link #success(Object)} instead
     */
    @Deprecated
    public static <T> ApiEnvelope<T> of(T data) {
        return success(data);
    }

    // ========== Success Factory Methods ==========

    /**
     * Create a successful response with data.
     *
     * @param data The response data
     * @param <T>  The type of the data
     * @return ApiEnvelope with success status
     */
    public static <T> ApiEnvelope<T> success(T data) {
        return ApiEnvelope.<T>builder()
                .success(true)
                .code(ErrorCode.SUCCESS.getCode())
                .message(ErrorCode.SUCCESS.getMessage())
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Create a successful response with data and custom message.
     *
     * @param data    The response data
     * @param message Custom success message
     * @param <T>     The type of the data
     * @return ApiEnvelope with success status
     */
    public static <T> ApiEnvelope<T> success(T data, String message) {
        return ApiEnvelope.<T>builder()
                .success(true)
                .code(ErrorCode.SUCCESS.getCode())
                .message(message)
                .data(data)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Create a successful response without data (for void operations).
     *
     * @return ApiEnvelope with success status
     */
    public static ApiEnvelope<Void> ok() {
        return ApiEnvelope.<Void>builder()
                .success(true)
                .code(ErrorCode.SUCCESS.getCode())
                .message(ErrorCode.SUCCESS.getMessage())
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Create a successful response with custom message (for void operations).
     *
     * @param message Custom success message
     * @return ApiEnvelope with success status
     */
    public static ApiEnvelope<Void> ok(String message) {
        return ApiEnvelope.<Void>builder()
                .success(true)
                .code(ErrorCode.SUCCESS.getCode())
                .message(message)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    // ========== Error Factory Methods ==========

    /**
     * Create an error response from ErrorCode.
     *
     * @param errorCode The error code enum
     * @param path      The request path
     * @param <T>       The type of the data (null for errors)
     * @return ApiEnvelope with error status
     */
    public static <T> ApiEnvelope<T> error(ErrorCode errorCode, String path) {
        return ApiEnvelope.<T>builder()
                .success(false)
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .path(path)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Create an error response with custom message.
     *
     * @param errorCode     The error code enum
     * @param customMessage Custom error message
     * @param path          The request path
     * @param <T>           The type of the data (null for errors)
     * @return ApiEnvelope with error status
     */
    public static <T> ApiEnvelope<T> error(ErrorCode errorCode, String customMessage, String path) {
        return ApiEnvelope.<T>builder()
                .success(false)
                .code(errorCode.getCode())
                .message(customMessage)
                .path(path)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    /**
     * Create a validation error response with field errors.
     *
     * @param fieldErrors Map of field names to error messages
     * @param path        The request path
     * @param <T>         The type of the data (null for errors)
     * @return ApiEnvelope with validation error status
     */
    public static <T> ApiEnvelope<T> validationError(Object fieldErrors, String path) {
        return ApiEnvelope.<T>builder()
                .success(false)
                .code(ErrorCode.VALIDATION_ERROR.getCode())
                .message("Validation failed")
                .errors(fieldErrors)
                .path(path)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
