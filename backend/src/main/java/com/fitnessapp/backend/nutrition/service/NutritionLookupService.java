package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.domain.FoodNutrition;
import com.fitnessapp.backend.domain.FoodSynonym;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.repository.FoodNutritionRepository;
import com.fitnessapp.backend.repository.FoodSynonymRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service for looking up food nutrition data from database
 * Supports fuzzy matching and synonym resolution
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NutritionLookupService {

    private final FoodNutritionRepository foodNutritionRepository;
    private final FoodSynonymRepository foodSynonymRepository;

    // Default nutrition for unknown foods (per 100g)
    private static final NutritionInfo DEFAULT_NUTRITION = NutritionInfo.builder()
            .calories(150.0)
            .protein(8.0)
            .fat(6.0)
            .carbs(15.0)
            .build();

    /**
     * Look up nutrition by food key with fallback strategies:
     * 1. Exact match on food_key
     * 2. Exact match on synonym
     * 3. Fuzzy match on food_key (pg_trgm, with fallback to LIKE)
     * 4. Fuzzy match on synonym (pg_trgm, with fallback to LIKE)
     * 5. Default nutrition
     */
    @Transactional(readOnly = true)
    public NutritionInfo lookupNutrition(String foodKey) {
        String normalizedKey = normalize(foodKey);
        log.debug("Looking up nutrition for: {} (normalized: {})", foodKey, normalizedKey);

        // Strategy 1: Exact match on food_key
        Optional<FoodNutrition> exactMatch = foodNutritionRepository.findByFoodKeyAndIsActiveTrue(normalizedKey);
        if (exactMatch.isPresent()) {
            log.debug("Found exact match for food_key: {}", normalizedKey);
            return toNutritionInfo(exactMatch.get());
        }

        // Strategy 2: Exact match on synonym
        Optional<FoodSynonym> synonymMatch = findSynonymIgnoreCase(normalizedKey);
        if (synonymMatch.isPresent()) {
            String canonicalKey = synonymMatch.get().getCanonicalFoodKey();
            log.debug("Found synonym match: {} -> {}", normalizedKey, canonicalKey);
            return lookupByCanonicalKey(canonicalKey);
        }

        // Strategy 3: Fuzzy match on food_key (with fallback)
        List<FoodNutrition> fuzzyMatches = findFoodKeySimilarSafe(normalizedKey, 1);
        if (!fuzzyMatches.isEmpty()) {
            FoodNutrition match = fuzzyMatches.get(0);
            log.info("Found fuzzy match for {}: {}", normalizedKey, match.getFoodKey());
            return toNutritionInfo(match);
        }

        // Strategy 4: Fuzzy match on synonym (with fallback)
        List<FoodSynonym> fuzzySynonyms = findSynonymSimilarSafe(normalizedKey, 1);
        if (!fuzzySynonyms.isEmpty()) {
            String canonicalKey = fuzzySynonyms.get(0).getCanonicalFoodKey();
            log.info("Found fuzzy synonym match: {} -> {}", normalizedKey, canonicalKey);
            return lookupByCanonicalKey(canonicalKey);
        }

        // Strategy 5: Default
        log.warn("No nutrition data found for: {}, using default", foodKey);
        return DEFAULT_NUTRITION;
    }

    /**
     * Fuzzy search food_key with fallback to LIKE query
     */
    private List<FoodNutrition> findFoodKeySimilarSafe(String query, int limit) {
        try {
            return foodNutritionRepository.findByFoodKeySimilar(query, limit);
        } catch (Exception e) {
            // pg_trgm not available (e.g., H2 in tests), fall back to LIKE search
            log.debug("Trigram search not available, using LIKE fallback: {}", e.getMessage());
            return foodNutritionRepository.searchByKeyword(query).stream()
                    .limit(limit)
                    .toList();
        }
    }

    /**
     * Fuzzy search synonym with fallback
     */
    private List<FoodSynonym> findSynonymSimilarSafe(String query, int limit) {
        try {
            return foodSynonymRepository.findBySynonymSimilar(query, limit);
        } catch (Exception e) {
            // pg_trgm not available, return empty (exact match already checked)
            log.debug("Trigram search not available for synonyms: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Find synonym ignoring case with fallback
     */
    private Optional<FoodSynonym> findSynonymIgnoreCase(String synonym) {
        try {
            return foodSynonymRepository.findBySynonymIgnoreCase(synonym);
        } catch (Exception e) {
            log.debug("Synonym lookup failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Resolve food key to canonical form using synonyms
     * Returns original key if no synonym found
     */
    @Transactional(readOnly = true)
    public String resolveCanonicalKey(String foodKey) {
        String normalizedKey = normalize(foodKey);

        // Check if it's already a valid food_key
        if (foodNutritionRepository.existsByFoodKey(normalizedKey)) {
            return normalizedKey;
        }

        // Check synonyms
        Optional<FoodSynonym> synonym = foodSynonymRepository.findBySynonymIgnoreCase(normalizedKey);
        if (synonym.isPresent()) {
            return synonym.get().getCanonicalFoodKey();
        }

        // Fuzzy match on synonyms
        List<FoodSynonym> fuzzySynonyms = foodSynonymRepository.findBySynonymSimilar(normalizedKey, 1);
        if (!fuzzySynonyms.isEmpty()) {
            return fuzzySynonyms.get(0).getCanonicalFoodKey();
        }

        // Return original key (may not exist in DB)
        return normalizedKey;
    }

    /**
     * Check if nutrition exists for a food key (including synonyms)
     */
    @Transactional(readOnly = true)
    public boolean hasNutrition(String foodKey) {
        String normalizedKey = normalize(foodKey);

        // Direct match
        if (foodNutritionRepository.findByFoodKeyAndIsActiveTrue(normalizedKey).isPresent()) {
            return true;
        }

        // Synonym match
        Optional<FoodSynonym> synonym = foodSynonymRepository.findBySynonymIgnoreCase(normalizedKey);
        if (synonym.isPresent()) {
            return foodNutritionRepository.findByFoodKeyAndIsActiveTrue(
                    synonym.get().getCanonicalFoodKey()).isPresent();
        }

        return false;
    }

    /**
     * Get all food items (for admin)
     */
    @Transactional(readOnly = true)
    public List<FoodNutrition> getAllFoods() {
        return foodNutritionRepository.findByIsActiveTrueOrderByFoodKey();
    }

    /**
     * Search foods by keyword
     */
    @Transactional(readOnly = true)
    public List<FoodNutrition> searchFoods(String keyword) {
        return foodNutritionRepository.searchByKeyword(keyword);
    }

    /**
     * Get distinct categories
     */
    @Transactional(readOnly = true)
    public List<String> getCategories() {
        return foodNutritionRepository.findDistinctCategories();
    }

    /**
     * Lookup by known canonical key
     */
    private NutritionInfo lookupByCanonicalKey(String canonicalKey) {
        return foodNutritionRepository.findByFoodKeyAndIsActiveTrue(canonicalKey)
                .map(this::toNutritionInfo)
                .orElse(DEFAULT_NUTRITION);
    }

    /**
     * Convert entity to DTO
     */
    private NutritionInfo toNutritionInfo(FoodNutrition entity) {
        return NutritionInfo.builder()
                .calories(entity.getCalories() != null ? entity.getCalories() : 0.0)
                .protein(entity.getProtein() != null ? entity.getProtein() : 0.0)
                .fat(entity.getFat() != null ? entity.getFat() : 0.0)
                .carbs(entity.getCarbs() != null ? entity.getCarbs() : 0.0)
                .build();
    }

    /**
     * Normalize food key:
     * - lowercase
     * - replace spaces with underscores
     * - trim
     */
    private String normalize(String foodKey) {
        if (foodKey == null) {
            return "";
        }
        return foodKey.toLowerCase()
                .trim()
                .replaceAll("\\s+", "_")
                .replaceAll("[^a-z0-9_\\u4e00-\\u9fff]", ""); // Keep alphanumeric, underscore, and Chinese chars
    }
}
