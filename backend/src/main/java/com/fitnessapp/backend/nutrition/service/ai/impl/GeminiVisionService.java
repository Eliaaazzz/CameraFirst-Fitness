package com.fitnessapp.backend.nutrition.service.ai.impl;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;

/**
 * Google Gemini Vision API service for food recognition
 */
public interface GeminiVisionService {

  /**
   * Recognize foods from an image using Gemini 2.0 Flash
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
   * @param mediaType MIME type of the image
   * @return recognition result with identified foods
   */
  FoodRecognitionResult recognizeFoods(String base64Image, String mediaType);
}
