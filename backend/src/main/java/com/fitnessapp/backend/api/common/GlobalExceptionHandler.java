package com.fitnessapp.backend.api.common;

import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
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
 * Global exception handler for consistent error responses
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(EntityNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleEntityNotFound(
      EntityNotFoundException ex,
      HttpServletRequest request
  ) {
    log.warn("Entity not found: {}", ex.getMessage());

    ErrorCode errorCode = ex.getMessage().contains("User")
        ? ErrorCode.USER_NOT_FOUND
        : ErrorCode.MEAL_NOT_FOUND;

    ErrorResponse response = ErrorResponse.of(errorCode, request.getRequestURI());
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
  }

  @ExceptionHandler(FoodRecognitionException.class)
  public ResponseEntity<ErrorResponse> handleFoodRecognition(
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

    ErrorResponse response = ErrorResponse.of(errorCode, ex.getMessage(), request.getRequestURI());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(TimeoutException.class)
  public ResponseEntity<ErrorResponse> handleTimeout(
      TimeoutException ex,
      HttpServletRequest request
  ) {
    log.error("Operation timeout: {}", ex.getMessage());

    ErrorResponse response = ErrorResponse.of(
        ErrorCode.AI_TIMEOUT,
        "Operation timed out, please try again",
        request.getRequestURI()
    );
    return ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).body(response);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleValidationErrors(
      MethodArgumentNotValidException ex,
      HttpServletRequest request
  ) {
    log.warn("Validation error: {}", ex.getMessage());

    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult().getAllErrors().forEach(error -> {
      String fieldName = ((FieldError) error).getField();
      String errorMessage = error.getDefaultMessage();
      errors.put(fieldName, errorMessage);
    });

    Map<String, Object> response = new HashMap<>();
    response.put("code", ErrorCode.VALIDATION_ERROR.getCode());
    response.put("message", "Validation failed");
    response.put("errors", errors);
    response.put("timestamp", System.currentTimeMillis());
    response.put("path", request.getRequestURI());

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorResponse> handleMaxUploadSize(
      MaxUploadSizeExceededException ex,
      HttpServletRequest request
  ) {
    log.warn("File upload size exceeded: {}", ex.getMessage());

    ErrorResponse response = ErrorResponse.of(
        ErrorCode.AI_INVALID_IMAGE,
        "Image file is too large (max 10MB)",
        request.getRequestURI()
    );
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArgument(
      IllegalArgumentException ex,
      HttpServletRequest request
  ) {
    log.warn("Invalid argument: {}", ex.getMessage());

    ErrorResponse response = ErrorResponse.of(
        ErrorCode.INVALID_REQUEST,
        ex.getMessage(),
        request.getRequestURI()
    );
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGenericException(
      Exception ex,
      HttpServletRequest request
  ) {
    log.error("Unexpected error occurred", ex);

    ErrorResponse response = ErrorResponse.of(
        ErrorCode.INTERNAL_ERROR,
        "An unexpected error occurred. Please try again later.",
        request.getRequestURI()
    );
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
  }
}
