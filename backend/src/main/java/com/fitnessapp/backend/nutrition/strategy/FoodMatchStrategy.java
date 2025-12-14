package com.fitnessapp.backend.nutrition.strategy;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.usda.domain.UsdaFood;

import java.util.List;

/**
 * Strategy interface for food matching algorithms.
 * Each implementation represents a different matching strategy (exact, method, base).
 */
public interface FoodMatchStrategy {
    
    /**
     * Search for food matches based on metadata.
     * 
     * @param metadata Food metadata from AI
     * @return List of matching foods with their scores
     */
    List<MatchResult> findMatches(FoodMetadata metadata);
    
    /**
     * Get the priority level of this strategy (higher = better match).
     * 
     * @return Priority value (3 = highest/exact, 2 = medium/method, 1 = lowest/base)
     */
    int getPriority();
    
    /**
     * Get the name of this strategy.
     * 
     * @return Strategy name for logging
     */
    String getStrategyName();
    
    /**
     * Result of a food match with score and reason.
     */
    class MatchResult {
        private final UsdaFood food;
        private final double score;
        private final String reason;
        
        public MatchResult(UsdaFood food, double score, String reason) {
            this.food = food;
            this.score = score;
            this.reason = reason;
        }
        
        public UsdaFood getFood() {
            return food;
        }
        
        public double getScore() {
            return score;
        }
        
        public String getReason() {
            return reason;
        }
    }
}
