package com.fitnessapp.backend.nutrition.service.ai;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;

/**
 * Interface for food recognition services.
 * Supports multiple AI model implementations.
 */
public interface FoodRecognitionProvider {

    /**
     * Recognize foods in an image
     * 
     * @param image The image file
     * @param metadata Optional request metadata (e.g., real-world scale hints)
     * @return Recognition result with detected foods
     * @throws IOException If image processing fails
     */
    default FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException {
        return recognizeFoods(image, null);
    }

    FoodRecognitionResult recognizeFoods(MultipartFile image, FoodRecognitionRequestMetadata metadata) throws IOException;

    /**
     * Recognize foods from base64 encoded image
     * 
     * @param base64Image Base64 encoded image data
     * @param mediaType MIME type of the image
     * @param metadata Optional request metadata (e.g., real-world scale hints)
     * @return Recognition result with detected foods
     */
    default FoodRecognitionResult recognizeFoods(String base64Image, String mediaType) {
        return recognizeFoods(base64Image, mediaType, null);
    }

    FoodRecognitionResult recognizeFoods(String base64Image, String mediaType, FoodRecognitionRequestMetadata metadata);

    /**
     * Get the provider name
     * 
     * @return Provider identifier (e.g., "claude", "openai", "gemini")
     */
    String getProviderName();

    /**
     * Get the model name being used
     * 
     * @return Model identifier
     */
    String getModelName();

    /**
     * Check if this provider is available/configured
     * 
     * @return true if the provider can be used
     */
    boolean isAvailable();

    /**
     * Get priority for provider selection (lower = higher priority)
     * 
     * @return Priority value
     */
    default int getPriority() {
        return 100;
    }
}
