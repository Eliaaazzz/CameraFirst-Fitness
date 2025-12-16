package com.fitnessapp.backend.nutrition.service.ai;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fitnessapp.backend.nutrition.dto.FoodRecognitionResult;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;
import com.fitnessapp.backend.nutrition.service.core.NutritionEngine;

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
     * Recognize foods using the best available provider.
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException {
        return recognizeFoods(image, null);
    }

    /**
     * Recognize foods using a chain of providers.
     * Tries the preferred provider first (if specified), then falls back to others.
     * 
     * @param image The image to analyze
     * @param preferredProvider The preferred provider name, or null for auto-select
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image, String preferredProvider) throws IOException {
        // 1. Get list of candidate providers sorted by execution order
        List<FoodRecognitionProvider> candidates = getCandidateProviders(preferredProvider);

        if (candidates.isEmpty()) {
            throw new FoodRecognitionException("No AI food recognition providers available");
        }

        Exception lastException = null;

        // 2. Iterate through candidates (Retry Pattern)
        for (FoodRecognitionProvider provider : candidates) {
            log.info("Attempting food recognition with provider '{}' ({})", 
                    provider.getProviderName(), provider.getModelName());

            try {
                // Attempt recognition
                FoodRecognitionResult result = provider.recognizeFoods(image);

                // 3. Enrich with nutrition data (Logic is now centralized here)
                enrichWithNutrition(result);

                return result; // Success: return immediately

            } catch (Exception e) {
                // Log failure and continue to the next provider
                log.warn("Provider '{}' failed: {}. Trying next provider...", 
                        provider.getProviderName(), e.getMessage());
                lastException = e;
            }
        }

        // 4. If loop finishes, all providers failed
        throw new FoodRecognitionException("All providers failed. Last error: " + 
                (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);
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
     * Helper: Get a list of available providers.
     * If a preferred provider is requested, it moves to the top of the list.
     */
    private List<FoodRecognitionProvider> getCandidateProviders(String preferredProvider) {
        // Filter only available providers
        List<FoodRecognitionProvider> available = providers.stream()
                .filter(FoodRecognitionProvider::isAvailable)
                .collect(Collectors.toList()); // Use mutable list for sorting

        if (preferredProvider != null && !preferredProvider.isBlank()) {
            // Sort: Preferred provider comes first, others maintain relative order
            available.sort((p1, p2) -> {
                boolean p1IsPref = p1.getProviderName().equalsIgnoreCase(preferredProvider);
                boolean p2IsPref = p2.getProviderName().equalsIgnoreCase(preferredProvider);
                
                if (p1IsPref && !p2IsPref) return -1; // p1 goes first
                if (!p1IsPref && p2IsPref) return 1;  // p2 goes first
                return 0; // maintain original priority order
            });
        }
        
        return available;
    }

    /**
     * Enrich recognition result with nutrition data
     */
    private void enrichWithNutrition(FoodRecognitionResult result) {
        if (result == null || result.getItems() == null) {
            return;
        }

        for (RecognizedFood food : result.getItems()) {
            try {
                nutritionEngine.enrichWithNutrition(food);
            } catch (Exception e) {
                log.error("Failed to enrich nutrition for {}: {}", food.getFoodKey(), e.getMessage(), e);
                food.setNutrition(NutritionInfo.zero());
                if (food.getEstimatedGrams() == null || food.getEstimatedGrams() <= 0) {
                    food.setEstimatedGrams(100);
                }
            }
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
