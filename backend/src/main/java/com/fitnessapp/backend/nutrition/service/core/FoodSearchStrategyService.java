package com.fitnessapp.backend.nutrition.service.core;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.strategy.FoodMatchStrategy;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Dynamic food search coordinator using Strategy Pattern.
 * Delegates to specific matching strategies and checks USDA data availability.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodSearchStrategyService {

    private final UsdaFoodRepository usdaFoodRepository;
    private final List<FoodMatchStrategy> strategies;

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
     * Find best match using strategy pattern.
     * Checks USDA data availability first.
     * 
     * @param metadata Food metadata from AI
     * @return Best matching food or empty
     */
    public Optional<SearchResult> findBestMatch(FoodMetadata metadata) {
        if (metadata == null || metadata.getSearchTerms().isEmpty()) {
            log.debug("No search terms provided in metadata");
            return Optional.empty();
        }
        
        // Check if USDA data is available
        if (!hasUsdaData()) {
            log.warn("USDA database is empty or unavailable");
            return Optional.empty();
        }

        // Sort strategies by priority (highest first)
        List<FoodMatchStrategy> sortedStrategies = strategies.stream()
                .sorted(Comparator.comparingInt(FoodMatchStrategy::getPriority).reversed())
                .toList();

        // Try each strategy in order until we find matches
        for (FoodMatchStrategy strategy : sortedStrategies) {
            log.debug("Trying strategy: {} (priority: {})", 
                    strategy.getStrategyName(), strategy.getPriority());
            
            List<FoodMatchStrategy.MatchResult> matches = strategy.findMatches(metadata);
            
            if (!matches.isEmpty()) {
                // Convert to SearchResult and find best
                Optional<SearchResult> best = matches.stream()
                        .map(m -> new SearchResult(
                                m.getFood(),
                                strategy.getPriority(),
                                m.getScore(),
                                m.getReason()
                        ))
                        .max(Comparator.comparingDouble(SearchResult::getMatchScore));
                
                if (best.isPresent()) {
                    log.info("Found match using {} strategy: {} (score: {})",
                            strategy.getStrategyName(),
                            best.get().getFood().getName(),
                            best.get().getMatchScore());
                    return best;
                }
            }
        }

        log.debug("No matches found for metadata with search terms: {}", metadata.getSearchTerms());
        return Optional.empty();
    }
    
    /**
     * Check if USDA database has any data.
     * 
     * @return true if USDA database has food entries
     */
    public boolean hasUsdaData() {
        try {
            return usdaFoodRepository.count() > 0;
        } catch (Exception e) {
            log.error("Error checking USDA data availability", e);
            return false;
        }
    }
}
