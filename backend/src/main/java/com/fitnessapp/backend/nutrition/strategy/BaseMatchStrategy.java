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
 * Base match strategy: Searches for Name only (raw/uncooked form).
 * Lowest priority (1) - requires cooking multiplier application.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BaseMatchStrategy implements FoodMatchStrategy {
    
    private final UsdaFoodRepository usdaFoodRepository;
    
    @Override
    public List<MatchResult> findMatches(FoodMetadata metadata) {
        List<MatchResult> results = new ArrayList<>();
        
        for (String term : metadata.getSearchTerms()) {
            log.debug("[BaseMatch] Searching for: {}", term);
            
            List<UsdaFood> foods = new ArrayList<>(usdaFoodRepository.findByNameContainingIgnoreCase(term));
            foods.addAll(usdaFoodRepository.searchByAlias(term));
            
            for (UsdaFood food : foods) {
                String name = food.getName() != null ? food.getName().toLowerCase() : "";
                String desc = food.getDescription() != null ? food.getDescription().toLowerCase() : "";
                
                // Check if this is a raw/base form
                if (isRawOrBaseForm(name, desc)) {
                    double score = calculateMatchScore(food, metadata);
                    results.add(new MatchResult(
                        food,
                        score,
                        "Base match (raw form, will apply cooking multiplier)"
                    ));
                    log.info("[BaseMatch] Found: {} (score: {})", food.getName(), score);
                }
            }
        }
        
        return results;
    }
    
    @Override
    public int getPriority() {
        return 1; // Lowest priority (needs multiplier)
    }
    
    @Override
    public String getStrategyName() {
        return "BaseMatch";
    }
    
    private boolean isRawOrBaseForm(String name, String desc) {
        return name.contains("raw") || name.contains("uncooked") || 
               desc.contains("raw") || desc.contains("uncooked") ||
               (!containsCookingMethod(name) && !containsCookingMethod(desc));
    }
    
    private boolean containsCookingMethod(String text) {
        if (text == null) return false;
        
        for (CookingMethod method : CookingMethod.values()) {
            if (method.matchesDescription(text)) {
                return true;
            }
        }
        return false;
    }
    
    private double calculateMatchScore(UsdaFood food, FoodMetadata metadata) {
        double score = 0.5;
        
        String foodName = (food.getName() + " " + food.getDescription()).toLowerCase();
        
        for (String term : metadata.getSearchTerms()) {
            if (foodName.contains(term.toLowerCase())) {
                score += 0.15;
            }
        }
        
        if (metadata.getForm() != null && !metadata.getForm().isEmpty()) {
            if (foodName.contains(metadata.getForm().toLowerCase())) {
                score += 0.15;
            }
        }
        
        return Math.min(score, 1.0);
    }
}
