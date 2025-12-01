package com.fitnessapp.backend.api.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Error response wrapper
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
  private int code;
  private String message;
  private Long timestamp;
  private String path;

  public static ErrorResponse of(ErrorCode errorCode, String path) {
    return ErrorResponse.builder()
        .code(errorCode.getCode())
        .message(errorCode.getMessage())
        .timestamp(System.currentTimeMillis())
        .path(path)
        .build();
  }

  public static ErrorResponse of(ErrorCode errorCode, String customMessage, String path) {
    return ErrorResponse.builder()
        .code(errorCode.getCode())
        .message(customMessage)
        .timestamp(System.currentTimeMillis())
        .path(path)
        .build();
  }
}
