package com.fitnessapp.backend.api.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.fitnessapp.backend.Cacheservice.quota.QuotaExceededException;

/**
 * Global exception handler for quota-related errors.
 */
@ControllerAdvice
@Slf4j
public class QuotaExceptionHandler {

  @ExceptionHandler(QuotaExceededException.class)
  public ResponseEntity<QuotaErrorResponse> handleQuotaExceeded(QuotaExceededException ex) {
    log.warn("Quota exceeded: {}", ex.getMessage());
    
    QuotaErrorResponse error = new QuotaErrorResponse(
        "QUOTA_EXCEEDED",
        ex.getMessage(),
        ex.getQuotaUsage()
    );
    
    return ResponseEntity
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .body(error);
  }

  public record QuotaErrorResponse(
      String code,
      String message,
      com.fitnessapp.backend.Cacheservice.quota.QuotaUsage quotaUsage
  ) {}
}
