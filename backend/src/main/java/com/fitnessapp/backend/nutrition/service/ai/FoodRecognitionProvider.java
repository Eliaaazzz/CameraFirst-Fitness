package com.fitnessapp.backend.nutrition.service.ai;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Interface for food recognition services.
 * Supports multiple AI model implementations.
 */
public interface FoodRecognitionProvider {

    /**
     * Recognize foods in an image
     * 
     * @param image The image file
     * @return Recognition result with detected foods
     * @throws IOException If image processing fails
     */
    FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException;

    /**
     * Recognize foods from base64 encoded image
     * 
     * @param base64Image Base64 encoded image data
     * @param mediaType MIME type of the image
     * @return Recognition result with detected foods
     */
    FoodRecognitionResult recognizeFoods(String base64Image, String mediaType);

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
