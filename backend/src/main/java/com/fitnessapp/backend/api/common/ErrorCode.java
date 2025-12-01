package com.fitnessapp.backend.api.common;

import lombok.Getter;

/**
 * Application error codes
 */
@Getter
public enum ErrorCode {
  // Success
  SUCCESS(200, "Success"),

  // User errors (2xxx)
  USER_NOT_FOUND(2001, "User not found"),
  MEAL_NOT_FOUND(2002, "Meal not found"),

  // AI/Vision errors (3xxx)
  AI_SERVICE_UNAVAILABLE(3001, "AI service temporarily unavailable"),
  AI_RECOGNITION_FAILED(3002, "Food recognition failed"),
  AI_INVALID_IMAGE(3003, "Invalid image format"),
  AI_TIMEOUT(3004, "AI analysis timeout"),

  // Nutrition errors (4xxx)
  NUTRITION_DATA_NOT_FOUND(4001, "Nutrition data not found"),
  INVALID_FOOD_DATA(4002, "Invalid food data"),

  // Generic errors (5xxx)
  INTERNAL_ERROR(5000, "Internal server error"),
  VALIDATION_ERROR(5001, "Validation error"),
  INVALID_REQUEST(5002, "Invalid request");

  private final int code;
  private final String message;

  ErrorCode(int code, String message) {
    this.code = code;
    this.message = message;
  }
}
