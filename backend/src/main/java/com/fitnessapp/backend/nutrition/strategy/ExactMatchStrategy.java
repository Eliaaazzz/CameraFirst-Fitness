package com.fitnessapp.backend.nutrition.strategy;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Exact match strategy: Searches for Name + Cooking Method + Modifiers.
 * Highest priority (3) - most accurate matches.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExactMatchStrategy implements FoodMatchStrategy {
    
    private final UsdaFoodRepository usdaFoodRepository;
    
    @Override
    public List<MatchResult> findMatches(FoodMetadata metadata) {
        List<MatchResult> results = new ArrayList<>();
        CookingMethod cookingMethod = metadata.getCookingMethod();
        
        // Build query combining base ingredient, form, and cooking method
        String queryBase = buildSearchQuery(metadata);
        
        log.debug("[ExactMatch] Searching for: {}", queryBase);
        
        // Search by name and aliases
        List<UsdaFood> foods = new ArrayList<>(usdaFoodRepository.findByNameContainingIgnoreCase(queryBase));
        foods.addAll(usdaFoodRepository.searchByAlias(queryBase));
        
        for (UsdaFood food : foods) {
            double score = calculateMatchScore(food, metadata, cookingMethod, true);
            if (score > 0.8) { // High threshold for exact match
                results.add(new MatchResult(
                    food,
                    score,
                    "Exact match with cooking method and modifiers"
                ));
                log.info("[ExactMatch] Found: {} (score: {})", food.getName(), score);
            }
        }
        
        return results;
    }
    
    @Override
    public int getPriority() {
        return 3; // Highest priority
    }
    
    @Override
    public String getStrategyName() {
        return "ExactMatch";
    }
    
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
        
        // Score based on modifiers
        if (checkModifiers && metadata.getModifiers() != null) {
            for (String modifier : metadata.getModifiers()) {
                if (foodName.contains(modifier.toLowerCase())) {
                    score += 0.1;
                }
            }
        }
        
        return Math.min(score, 1.0);
    }
}
