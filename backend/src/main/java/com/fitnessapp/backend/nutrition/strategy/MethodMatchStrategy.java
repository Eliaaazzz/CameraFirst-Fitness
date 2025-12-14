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
 * Method match strategy: Searches for Name + Cooking Method only.
 * Medium priority (2) - good matches without all modifiers.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MethodMatchStrategy implements FoodMatchStrategy {
    
    private final UsdaFoodRepository usdaFoodRepository;
    
    @Override
    public List<MatchResult> findMatches(FoodMetadata metadata) {
        List<MatchResult> results = new ArrayList<>();
        CookingMethod cookingMethod = metadata.getCookingMethod();
        
        // Search with base ingredient and cooking method
        for (String term : metadata.getSearchTerms()) {
            String query = cookingMethod.getDisplayName() + " " + term;
            log.debug("[MethodMatch] Searching for: {}", query);
            
            List<UsdaFood> foods = new ArrayList<>(usdaFoodRepository.findByNameContainingIgnoreCase(query));
            foods.addAll(usdaFoodRepository.searchByAlias(query));
            
            for (UsdaFood food : foods) {
                if (cookingMethod.matchesDescription(food.getName()) ||
                    cookingMethod.matchesDescription(food.getDescription())) {
                    double score = calculateMatchScore(food, metadata, cookingMethod);
                    results.add(new MatchResult(
                        food,
                        score,
                        "Method match with cooking method"
                    ));
                    log.info("[MethodMatch] Found: {} (score: {})", food.getName(), score);
                }
            }
        }
        
        return results;
    }
    
    @Override
    public int getPriority() {
        return 2; // Medium priority
    }
    
    @Override
    public String getStrategyName() {
        return "MethodMatch";
    }
    
    private double calculateMatchScore(UsdaFood food, FoodMetadata metadata, CookingMethod cookingMethod) {
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
        
        if (cookingMethod != CookingMethod.UNKNOWN && cookingMethod.matchesDescription(foodName)) {
            score += 0.2;
        }
        
        return Math.min(score, 1.0);
    }
}
