package com.fitnessapp.backend.nutrition.exception;

/**
 * Exception thrown when food recognition fails
 */
public class FoodRecognitionException extends RuntimeException {

  public FoodRecognitionException(String message) {
    super(message);
  }

  public FoodRecognitionException(String message, Throwable cause) {
    super(message, cause);
  }
}
