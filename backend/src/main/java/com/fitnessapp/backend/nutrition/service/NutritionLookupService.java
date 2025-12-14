package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import com.fitnessapp.backend.nutrition.entity.FoodSynonym;
import com.fitnessapp.backend.nutrition.dto.FoodMetadata;
import com.fitnessapp.backend.nutrition.dto.NutritionInfo;
import com.fitnessapp.backend.nutrition.enums.CookingMethod;
import com.fitnessapp.backend.nutrition.repository.FoodNutritionRepository;
import com.fitnessapp.backend.nutrition.repository.FoodSynonymRepository;
import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.service.UsdaFoodSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final FoodKeyNormalizer foodKeyNormalizer;
    private final UsdaFoodSearchService usdaFoodSearchService;
    private final FoodSearchStrategyService foodSearchStrategyService;

    // Default nutrition for unknown foods (per 100g)
    private static final NutritionInfo DEFAULT_NUTRITION = NutritionInfo.builder()
            .calories(new java.math.BigDecimal("150.0"))
            .protein(new java.math.BigDecimal("8.0"))
            .fat(new java.math.BigDecimal("6.0"))
            .carbs(new java.math.BigDecimal("15.0"))
            .build();

    /**
     * Look up nutrition by food key with fallback strategies:
     * 1. NLP normalization and phrase mapping
     * 2. Exact match on food_key
     * 3. Exact match on synonym
     * 4. Fuzzy match on food_key (pg_trgm, with fallback to LIKE)
     * 5. Fuzzy match on synonym (pg_trgm, with fallback to LIKE)
     * 6. Default nutrition
     */
    @Transactional(readOnly = true)
    public NutritionInfo lookupNutrition(String foodKey) {
        // Step 0: Use NLP normalizer for intelligent text processing
        String normalizedKey = foodKeyNormalizer.normalize(foodKey);
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

        // Strategy 6: Try USDA catalog using a name search (spaces instead of underscores)
        NutritionInfo usda = lookupUsda(normalizedKey);
        if (usda != null) {
            return usda;
        }

        // Strategy 7: Default
        log.warn("No nutrition data found for: {}, using default", foodKey);
        return DEFAULT_NUTRITION;
    }

    /**
     * Look up nutrition using structured metadata from AI.
     * Uses dynamic search strategy with cooking method multipliers.
     * 
     * @param metadata Structured food metadata
     * @return Nutrition info with applied cooking multipliers if needed
     */
    @Transactional(readOnly = true)
    public NutritionInfo lookupNutritionWithMetadata(FoodMetadata metadata) {
        if (metadata == null) {
            log.warn("Null metadata provided, using default nutrition");
            return DEFAULT_NUTRITION;
        }

        log.debug("Looking up nutrition with metadata: base={}, form={}, method={}", 
                metadata.getBaseIngredient(), metadata.getForm(), metadata.getCookingMethodStr());

        // Use dynamic search strategy
        Optional<FoodSearchStrategyService.SearchResult> searchResult = 
                foodSearchStrategyService.findBestMatch(metadata);

        if (searchResult.isPresent()) {
            FoodSearchStrategyService.SearchResult result = searchResult.get();
            UsdaFood food = result.getFood();
            
            log.info("Found match for metadata search: {} (priority={}, score={}, reason={})",
                    food.getName(), result.getPriority(), result.getMatchScore(), result.getMatchReason());

            if (food.getNutrition() == null) {
                log.warn("Found food {} but nutrition data is missing", food.getName());
                return DEFAULT_NUTRITION;
            }

            NutritionInfo baseNutrition = NutritionInfo.builder()
                    .calories(toBigDecimal(food.getNutrition().getCalories()))
                    .protein(toBigDecimal(food.getNutrition().getProteinG()))
                    .fat(toBigDecimal(food.getNutrition().getFatG()))
                    .carbs(toBigDecimal(food.getNutrition().getCarbsG()))
                    .fiber(toBigDecimal(food.getNutrition().getFiberG()))
                    .sugar(toBigDecimal(food.getNutrition().getSugarG()))
                    .build();

            // Apply cooking method multiplier for base matches (priority 1)
            if (result.getPriority() == 1 && metadata.getCookingMethod() != CookingMethod.UNKNOWN) {
                return applyCookingMethodMultiplier(baseNutrition, metadata.getCookingMethod());
            }

            return baseNutrition;
        }

        // Fallback to traditional lookup if no metadata match
        log.debug("No metadata match found, falling back to traditional lookup");
        if (metadata.getSearchTerms() != null && !metadata.getSearchTerms().isEmpty()) {
            String firstTerm = metadata.getSearchTerms().get(0);
            return lookupNutrition(firstTerm);
        }

        return DEFAULT_NUTRITION;
    }

    /**
     * Apply cooking method multiplier to base nutrition values.
     * Used when only raw/uncooked data is available.
     */
    private NutritionInfo applyCookingMethodMultiplier(NutritionInfo baseNutrition, CookingMethod method) {
        double multiplier = method.getCalorieMultiplier();
        
        log.info("Applying cooking method multiplier: {} ({}x)", method.getDisplayName(), multiplier);

        BigDecimal mult = BigDecimal.valueOf(multiplier);
        
        return NutritionInfo.builder()
                .calories(baseNutrition.getCalories().multiply(mult))
                .protein(baseNutrition.getProtein()) // Protein doesn't change much
                .fat(baseNutrition.getFat().multiply(mult)) // Fat increases with frying
                .carbs(baseNutrition.getCarbs().multiply(mult)) // Carbs can increase with breading
                .fiber(baseNutrition.getFiber())
                .sugar(baseNutrition.getSugar())
                .build();
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
        String normalizedKey = foodKeyNormalizer.normalize(foodKey);

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
        List<FoodSynonym> fuzzySynonyms = findSynonymSimilarSafe(normalizedKey, 1);
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
        String normalizedKey = foodKeyNormalizer.normalize(foodKey);

        // Direct match
        if (foodNutritionRepository.findByFoodKeyAndIsActiveTrue(normalizedKey).isPresent()) {
            return true;
        }

        // Synonym match
        Optional<FoodSynonym> synonym = findSynonymIgnoreCase(normalizedKey);
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
                .calories(entity.getCalories() != null ? entity.getCalories() : java.math.BigDecimal.ZERO)
                .protein(entity.getProtein() != null ? entity.getProtein() : java.math.BigDecimal.ZERO)
                .fat(entity.getFat() != null ? entity.getFat() : java.math.BigDecimal.ZERO)
                .carbs(entity.getCarbs() != null ? entity.getCarbs() : java.math.BigDecimal.ZERO)
                .fiber(entity.getFiber() != null ? entity.getFiber() : java.math.BigDecimal.ZERO)
                .sugar(entity.getSugar() != null ? entity.getSugar() : java.math.BigDecimal.ZERO)
                .build();
    }

    /**
     * Lookup USDA foods by name (simple contains + alias) and return the first match.
     */
    private NutritionInfo lookupUsda(String normalizedKey) {
        try {
            String query = normalizedKey.replace("_", " ");
            java.util.List<UsdaFood> matches = usdaFoodSearchService.search(query, 1);
            if (matches.isEmpty()) {
                return null;
            }
            UsdaFood food = matches.get(0);
            if (food.getNutrition() == null) {
                return null;
            }
            log.info("Using USDA nutrition for '{}' : {}", normalizedKey, food.getName());
            return NutritionInfo.builder()
                    .calories(toBigDecimal(food.getNutrition().getCalories()))
                    .protein(toBigDecimal(food.getNutrition().getProteinG()))
                    .fat(toBigDecimal(food.getNutrition().getFatG()))
                    .carbs(toBigDecimal(food.getNutrition().getCarbsG()))
                    .build();
        } catch (Exception e) {
            log.debug("USDA lookup failed for {}: {}", normalizedKey, e.getMessage());
            return null;
        }
    }

    private java.math.BigDecimal toBigDecimal(Number value) {
        return value == null ? java.math.BigDecimal.ZERO : java.math.BigDecimal.valueOf(value.doubleValue());
    }
}
