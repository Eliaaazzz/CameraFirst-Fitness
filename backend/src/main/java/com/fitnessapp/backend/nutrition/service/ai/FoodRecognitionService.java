package com.fitnessapp.backend.nutrition.service.ai;

import java.io.IOException;
import java.math.BigDecimal;
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
import com.fitnessapp.backend.nutrition.dto.FoodRecognitionRequestMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.dto.RecognizedFood;
import com.fitnessapp.backend.nutrition.exception.FoodRecognitionException;

import lombok.extern.slf4j.Slf4j;

/**
 * Unified Food Recognition Service that supports multiple AI providers.
 * Handles provider selection, fallback, and async processing.
 * 
 * AI providers return nutrition data directly - no external calculation engine needed.
 */
@Slf4j
@Service
public class FoodRecognitionService {

    private final List<FoodRecognitionProvider> providers;
    private final Executor asyncExecutor;

    public FoodRecognitionService(
            List<FoodRecognitionProvider> providers,
            @Qualifier("foodRecognitionExecutor") Executor foodRecognitionExecutor
    ) {
        this.providers = providers.stream()
                .sorted(Comparator.comparingInt(FoodRecognitionProvider::getPriority))
                .toList();
        this.asyncExecutor = foodRecognitionExecutor;

        log.info("Initialized FoodRecognitionService with {} providers: {}",
                providers.size(),
                providers.stream().map(p -> p.getProviderName() + "(" + p.getPriority() + ")").toList());
    }

    /**
     * Recognize foods using the best available provider.
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image) throws IOException {
        return recognizeFoods(image, null, null);
    }

    /**
     * Recognize foods using a chain of providers with fallback.
     */
    public FoodRecognitionResult recognizeFoods(MultipartFile image, String preferredProvider) throws IOException {
        return recognizeFoods(image, preferredProvider, null);
    }

    /**
     * Recognize foods using a chain of providers with fallback and optional metadata.
     */
    public FoodRecognitionResult recognizeFoods(
            MultipartFile image,
            String preferredProvider,
            FoodRecognitionRequestMetadata metadata
    ) throws IOException {
        List<FoodRecognitionProvider> candidates = getCandidateProviders(preferredProvider);

        if (candidates.isEmpty()) {
            throw new FoodRecognitionException("No AI food recognition providers available");
        }

        Exception lastException = null;

        for (FoodRecognitionProvider provider : candidates) {
            log.info("Trying provider '{}' ({})", provider.getProviderName(), provider.getModelName());

            try {
                FoodRecognitionResult result = provider.recognizeFoods(image, metadata);
                log.info("✅ Provider '{}' succeeded with {} items", 
                        provider.getProviderName(), 
                        result.getItems() != null ? result.getItems().size() : 0);
                return result;

            } catch (Exception e) {
                log.warn("Provider '{}' failed: {}. Trying next...", provider.getProviderName(), e.getMessage());
                lastException = e;
            }
        }

        throw new FoodRecognitionException("All providers failed: " + 
                (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);
    }

    /**
     * Calculate total nutrition for a list of recognized foods.
     */
    public NutritionInfo calculateTotalNutrition(List<RecognizedFood> foods) {
        if (foods == null || foods.isEmpty()) {
            return NutritionInfo.zero();
        }

        BigDecimal totalCalories = BigDecimal.ZERO;
        BigDecimal totalProtein = BigDecimal.ZERO;
        BigDecimal totalCarbs = BigDecimal.ZERO;
        BigDecimal totalFat = BigDecimal.ZERO;

        for (RecognizedFood food : foods) {
            NutritionInfo n = food.getNutrition();
            if (n != null) {
                if (n.getCalories() != null) totalCalories = totalCalories.add(n.getCalories());
                if (n.getProtein() != null) totalProtein = totalProtein.add(n.getProtein());
                if (n.getCarbs() != null) totalCarbs = totalCarbs.add(n.getCarbs());
                if (n.getFat() != null) totalFat = totalFat.add(n.getFat());
            }
        }

        return NutritionInfo.builder()
                .calories(totalCalories)
                .protein(totalProtein)
                .carbs(totalCarbs)
                .fat(totalFat)
                .build();
    }

    /**
     * Recognize foods asynchronously
     */
    public CompletableFuture<FoodRecognitionResult> recognizeFoodsAsync(MultipartFile image) {
        return recognizeFoodsAsync(image, null);
    }

    public CompletableFuture<FoodRecognitionResult> recognizeFoodsAsync(MultipartFile image, String preferredProvider) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return recognizeFoods(image, preferredProvider);
            } catch (IOException e) {
                throw new RuntimeException("Async recognition failed", e);
            }
        }, asyncExecutor);
    }

    public FoodRecognitionResult recognizeFoodsWithTimeout(MultipartFile image, long timeout, TimeUnit unit) throws Exception {
        return recognizeFoodsAsync(image).get(timeout, unit);
    }

    public List<ProviderInfo> getAvailableProviders() {
        return providers.stream()
                .map(p -> new ProviderInfo(p.getProviderName(), p.getModelName(), p.isAvailable(), p.getPriority()))
                .toList();
    }

    public boolean isServiceAvailable() {
        return providers.stream().anyMatch(FoodRecognitionProvider::isAvailable);
    }

    private List<FoodRecognitionProvider> getCandidateProviders(String preferredProvider) {
        List<FoodRecognitionProvider> available = providers.stream()
                .filter(FoodRecognitionProvider::isAvailable)
                .collect(Collectors.toList());

        if (preferredProvider != null && !preferredProvider.isBlank()) {
            available.sort((p1, p2) -> {
                boolean p1IsPref = p1.getProviderName().equalsIgnoreCase(preferredProvider);
                boolean p2IsPref = p2.getProviderName().equalsIgnoreCase(preferredProvider);
                if (p1IsPref && !p2IsPref) return -1;
                if (!p1IsPref && p2IsPref) return 1;
                return 0;
            });
        }
        
        return available;
    }

    public record ProviderInfo(String name, String model, boolean available, int priority) {}
}
