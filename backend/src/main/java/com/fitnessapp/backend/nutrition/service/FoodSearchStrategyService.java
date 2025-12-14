package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Dynamic food search strategy using USDA database.
 * Implements priority-based matching: exact → method → base + fallback.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodSearchStrategyService {

    private final UsdaFoodRepository usdaFoodRepository;

    /**
     * Search result with match quality score
     */
    public static class SearchResult {
        private final UsdaFood food;
        private final int priority;
        private final double matchScore;
        private final String matchReason;

        public SearchResult(UsdaFood food, int priority, double matchScore, String matchReason) {
            this.food = food;
            this.priority = priority;
            this.matchScore = matchScore;
            this.matchReason = matchReason;
        }

        public UsdaFood getFood() {
            return food;
        }

        public int getPriority() {
            return priority;
        }

        public double getMatchScore() {
            return matchScore;
        }

        public String getMatchReason() {
            return matchReason;
        }
    }

    /**
     * Find best match using dynamic search strategy.
     * 
     * Priority 1 (Exact Match): Name + Method + Modifiers
     * Priority 2 (Method Match): Name + Method
     * Priority 3 (Base Match): Name only (raw/base form)
     * 
     * @param metadata Food metadata from AI
     * @return Best matching food or empty
     */
    public Optional<SearchResult> findBestMatch(FoodMetadata metadata) {
        if (metadata == null || metadata.getSearchTerms().isEmpty()) {
            log.debug("No search terms provided in metadata");
            return Optional.empty();
        }

        List<SearchResult> allResults = new ArrayList<>();

        // Strategy 1: Exact match (Name + Method + Modifiers)
        List<SearchResult> exactMatches = searchExactMatch(metadata);
        allResults.addAll(exactMatches);

        // Strategy 2: Method match (Name + Method)
        if (allResults.isEmpty()) {
            List<SearchResult> methodMatches = searchMethodMatch(metadata);
            allResults.addAll(methodMatches);
        }

        // Strategy 3: Base match (Name only - raw/uncooked)
        if (allResults.isEmpty()) {
            List<SearchResult> baseMatches = searchBaseMatch(metadata);
            allResults.addAll(baseMatches);
        }

        // Return best match by priority, then by score
        return allResults.stream()
                .max(Comparator.comparingInt(SearchResult::getPriority)
                        .thenComparingDouble(SearchResult::getMatchScore));
    }

    /**
     * Strategy 1: Search for exact match with cooking method and modifiers
     */
    private List<SearchResult> searchExactMatch(FoodMetadata metadata) {
        List<SearchResult> results = new ArrayList<>();
        CookingMethod cookingMethod = metadata.getCookingMethod();

        // Build query combining base ingredient, form, and cooking method
        String queryBase = buildSearchQuery(metadata);
        
        log.debug("Searching exact match for: {}", queryBase);
        
        // Search by name
        List<UsdaFood> foods = usdaFoodRepository.findByNameContainingIgnoreCase(queryBase);
        
        // Also search by aliases
        foods.addAll(usdaFoodRepository.searchByAlias(queryBase));

        for (UsdaFood food : foods) {
            double score = calculateMatchScore(food, metadata, cookingMethod, true);
            if (score > 0.8) { // High threshold for exact match
                results.add(new SearchResult(
                        food, 
                        3, // Highest priority
                        score,
                        "Exact match with cooking method and modifiers"
                ));
                log.info("Found exact match: {} (score: {})", food.getName(), score);
            }
        }

        return results;
    }

    /**
     * Strategy 2: Search for method match (name + cooking method only)
     */
    private List<SearchResult> searchMethodMatch(FoodMetadata metadata) {
        List<SearchResult> results = new ArrayList<>();
        CookingMethod cookingMethod = metadata.getCookingMethod();

        // Search with base ingredient and cooking method
        for (String term : metadata.getSearchTerms()) {
            String query = cookingMethod.getDisplayName() + " " + term;
            log.debug("Searching method match for: {}", query);

            List<UsdaFood> foods = usdaFoodRepository.findByNameContainingIgnoreCase(query);
            foods.addAll(usdaFoodRepository.searchByAlias(query));

            for (UsdaFood food : foods) {
                if (cookingMethod.matchesDescription(food.getName()) ||
                    cookingMethod.matchesDescription(food.getDescription())) {
                    double score = calculateMatchScore(food, metadata, cookingMethod, false);
                    results.add(new SearchResult(
                            food,
                            2, // Medium priority
                            score,
                            "Method match with cooking method"
                    ));
                    log.info("Found method match: {} (score: {})", food.getName(), score);
                }
            }
        }

        return results;
    }

    /**
     * Strategy 3: Search for base match (raw/uncooked form)
     */
    private List<SearchResult> searchBaseMatch(FoodMetadata metadata) {
        List<SearchResult> results = new ArrayList<>();

        for (String term : metadata.getSearchTerms()) {
            log.debug("Searching base match for: {}", term);

            List<UsdaFood> foods = usdaFoodRepository.findByNameContainingIgnoreCase(term);
            foods.addAll(usdaFoodRepository.searchByAlias(term));

            // Prefer raw/uncooked entries
            for (UsdaFood food : foods) {
                String name = food.getName() != null ? food.getName().toLowerCase() : "";
                String desc = food.getDescription() != null ? food.getDescription().toLowerCase() : "";
                
                // Check if this is a raw/base form
                if (name.contains("raw") || name.contains("uncooked") || 
                    desc.contains("raw") || desc.contains("uncooked") ||
                    (!containsCookingMethod(name) && !containsCookingMethod(desc))) {
                    
                    double score = calculateMatchScore(food, metadata, CookingMethod.RAW, false);
                    results.add(new SearchResult(
                            food,
                            1, // Lower priority (will apply multiplier)
                            score,
                            "Base match (raw form, will apply cooking multiplier)"
                    ));
                    log.info("Found base match: {} (score: {})", food.getName(), score);
                }
            }
        }

        return results;
    }

    /**
     * Calculate match score based on term overlap and modifier matching
     */
    private double calculateMatchScore(UsdaFood food, FoodMetadata metadata, 
                                      CookingMethod cookingMethod, boolean checkModifiers) {
        double score = 0.5; // Base score

        String foodName = (food.getName() + " " + food.getDescription()).toLowerCase();

        // Score based on search term matches
        for (String term : metadata.getSearchTerms()) {
            if (foodName.contains(term.toLowerCase())) {
                score += 0.15;
            }
        }

        // Score based on form match
        if (metadata.getForm() != null && !metadata.getForm().isEmpty()) {
            if (foodName.contains(metadata.getForm().toLowerCase())) {
                score += 0.15;
            }
        }

        // Score based on cooking method match
        if (cookingMethod != CookingMethod.UNKNOWN && cookingMethod.matchesDescription(foodName)) {
            score += 0.2;
        }

        // Score based on modifiers (if checking)
        if (checkModifiers && metadata.getModifiers() != null) {
            for (String modifier : metadata.getModifiers()) {
                if (foodName.contains(modifier.toLowerCase())) {
                    score += 0.1;
                }
            }
        }

        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Build search query from metadata
     */
    private String buildSearchQuery(FoodMetadata metadata) {
        List<String> parts = new ArrayList<>();

        if (metadata.getCookingMethod() != CookingMethod.UNKNOWN) {
            parts.add(metadata.getCookingMethod().getDisplayName());
        }

        if (metadata.getForm() != null && !metadata.getForm().isEmpty()) {
            parts.add(metadata.getForm());
        }

        parts.addAll(metadata.getSearchTerms());

        return String.join(" ", parts);
    }

    /**
     * Check if text contains any cooking method keywords
     */
    private boolean containsCookingMethod(String text) {
        if (text == null) return false;
        
        for (CookingMethod method : CookingMethod.values()) {
            if (method.matchesDescription(text)) {
                return true;
            }
        }
        return false;
    }
}
