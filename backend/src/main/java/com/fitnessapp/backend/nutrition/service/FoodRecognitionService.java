package com.fitnessapp.backend.nutrition.service;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

import lombok.extern.slf4j.Slf4j;

/**
 * Unified Food Recognition Service that supports multiple AI providers.
 * Handles provider selection, fallback, and async processing.
 */
@Slf4j
@Service
public class FoodRecognitionService {

    private final List<FoodRecognitionProvider> providers;
    private final NutritionEngine nutritionEngine;
    private final Executor asyncExecutor;

    public FoodRecognitionService(
            List<FoodRecognitionProvider> providers,
            NutritionEngine nutritionEngine,
            @Qualifier("foodRecognitionExecutor") Executor foodRecognitionExecutor
    ) {
        // Sort providers by priority (lower = higher priority)
        this.providers = providers.stream()
                .sorted(Comparator.comparingInt(FoodRecognitionProvider::getPriority))
                .toList();
        this.nutritionEngine = nutritionEngine;
        this.asyncExecutor = foodRecognitionExecutor;

        log.info("Initialized FoodRecognitionService with {} providers: {}",
                providers.size(),
                providers.stream().map(p -> p.getProviderName() + "(" + p.getPriority() + ")").toList());
    }

    /**
     * Recognize foods using the best available provider
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException {
        return recognizeFoods(image, null);
    }

    /**
     * Recognize foods using a specific provider (or fallback to best available)
     * 
     * @param image The image to analyze
     * @param preferredProvider The preferred provider name, or null for auto-select
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image, String preferredProvider) throws IOException {
        FoodRecognitionProvider provider = selectProvider(preferredProvider);
        
        if (provider == null) {
            // Build helpful error message listing why providers aren't available
            List<String> providerStatus = providers.stream()
                    .map(p -> String.format("%s: %s", 
                            p.getProviderName(), 
                            p.isAvailable() ? "available" : "not configured"))
                    .toList();
            
            String errorMsg = "No AI food recognition providers available. Configure at least one provider:\n" +
                    "- Gemini: Set GEMINI_API_KEY environment variable\n" +
                    "- Claude: Set ANTHROPIC_API_KEY environment variable\n" +
                    "Current status: " + String.join(", ", providerStatus);
            
            log.error(errorMsg);
            throw new FoodRecognitionException(errorMsg);
        }

        log.info("Using provider '{}' ({}) for food recognition",
                provider.getProviderName(), provider.getModelName());

        try {
            FoodRecognitionResult result = provider.recognizeFoods(image);

            // Enrich with nutrition data
            enrichWithNutrition(result);

            return result;
        } catch (Exception e) {
            log.error("Provider '{}' failed: {}", provider.getProviderName(), e.getMessage());

            // Try fallback provider
            FoodRecognitionProvider fallback = selectFallbackProvider(provider);
            if (fallback != null) {
                log.info("Falling back to provider '{}'", fallback.getProviderName());
                try {
                    FoodRecognitionResult result = fallback.recognizeFoods(image);
                    enrichWithNutrition(result);
                    return result;
                } catch (Exception fallbackError) {
                    log.error("Fallback provider '{}' also failed: {}", 
                            fallback.getProviderName(), fallbackError.getMessage());
                    // Continue to throw original exception
                }
            }

            // If we get here, all providers failed
            String errorMsg = String.format(
                    "Food recognition failed. Primary provider (%s) error: %s. " +
                    "Please check API keys and try again.",
                    provider.getProviderName(),
                    e.getMessage()
            );
            throw new FoodRecognitionException(errorMsg, e);
        }
    }

    /**
     * Recognize foods asynchronously
     */
    public CompletableFuture<FoodRecognitionResult> recognizeFoodsAsync(MultipartFile image) {
        return recognizeFoodsAsync(image, null);
    }

    /**
     * Recognize foods asynchronously with specific provider
     */
    public CompletableFuture<FoodRecognitionResult> recognizeFoodsAsync(
            MultipartFile image,
            String preferredProvider
    ) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return recognizeFoods(image, preferredProvider);
            } catch (IOException e) {
                throw new RuntimeException("Async recognition failed", e);
            }
        }, asyncExecutor);
    }

    /**
     * Recognize foods with timeout
     */
    public FoodRecognitionResult recognizeFoodsWithTimeout(
            MultipartFile image,
            long timeout,
            TimeUnit unit
    ) throws Exception {
        CompletableFuture<FoodRecognitionResult> future = recognizeFoodsAsync(image);
        return future.get(timeout, unit);
    }

    /**
     * Get list of available providers
     */
    public List<ProviderInfo> getAvailableProviders() {
        return providers.stream()
                .map(p -> new ProviderInfo(
                        p.getProviderName(),
                        p.getModelName(),
                        p.isAvailable(),
                        p.getPriority()))
                .toList();
    }

    /**
     * Check if any provider is available
     */
    public boolean isServiceAvailable() {
        return providers.stream().anyMatch(FoodRecognitionProvider::isAvailable);
    }

    /**
     * Select the best available provider
     */
    private FoodRecognitionProvider selectProvider(String preferredProvider) {
        // If specific provider requested, try to find it
        if (preferredProvider != null && !preferredProvider.isBlank()) {
            return providers.stream()
                    .filter(p -> p.getProviderName().equalsIgnoreCase(preferredProvider))
                    .filter(FoodRecognitionProvider::isAvailable)
                    .findFirst()
                    .orElse(null);
        }

        // Otherwise return best available provider
        return providers.stream()
                .filter(FoodRecognitionProvider::isAvailable)
                .findFirst()
                .orElse(null);
    }

    /**
     * Select fallback provider (next available after the failed one)
     */
    private FoodRecognitionProvider selectFallbackProvider(FoodRecognitionProvider failed) {
        return providers.stream()
                .filter(FoodRecognitionProvider::isAvailable)
                .filter(p -> !p.getProviderName().equals(failed.getProviderName()))
                .findFirst()
                .orElse(null);
    }

    /**
     * Enrich recognition result with nutrition data
     */
    private void enrichWithNutrition(FoodRecognitionResult result) {
        if (result == null || result.getItems() == null) {
            return;
        }

        for (RecognizedFood food : result.getItems()) {
            nutritionEngine.enrichWithNutrition(food);
        }
    }

    /**
     * Provider info DTO
     */
    public record ProviderInfo(
            String name,
            String model,
            boolean available,
            int priority
    ) {}
}
