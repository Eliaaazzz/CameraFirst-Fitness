package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Claude Vision API service for food recognition
 */
public interface ClaudeVisionService {

  /**
   * Recognize foods from an image using Claude 3.5 Sonnet Vision
   *
   * @param imageFile the food photo
   * @return recognition result with identified foods
   * @throws IOException if image processing fails
   */
  FoodRecognitionResult recognizeFoods(MultipartFile imageFile) throws IOException;

  /**
   * Recognize foods from base64 encoded image
   *
   * @param base64Image base64 encoded image data
   * @return recognition result with identified foods
   */
  FoodRecognitionResult recognizeFoods(String base64Image);
}
