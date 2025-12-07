package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.domain.FoodNutrition;
import com.fitnessapp.backend.domain.FoodSynonym;
import com.fitnessapp.backend.nutrition.dto.FoodNutritionDto;
import com.fitnessapp.backend.repository.FoodNutritionRepository;
import com.fitnessapp.backend.repository.FoodSynonymRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Admin service for managing food nutrition database
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodNutritionAdminService {

    private final FoodNutritionRepository foodNutritionRepository;
    private final FoodSynonymRepository foodSynonymRepository;

    /**
     * Get all food items with their synonyms
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> getAllFoods() {
        List<FoodNutrition> foods = foodNutritionRepository.findByIsActiveTrueOrderByFoodKey();
        var synonymsByFoodKey = loadSynonyms(foods);
        return foods.stream()
                .map(f -> toDto(f, synonymsByFoodKey.getOrDefault(f.getFoodKey(), List.of())))
                .collect(Collectors.toList());
    }

    /**
     * Get food by ID
     */
    @Transactional(readOnly = true)
    public FoodNutritionDto getFoodById(UUID id) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));
        return toDto(food, loadSynonyms(List.of(food)).getOrDefault(food.getFoodKey(), List.of()));
    }

    /**
     * Get food by food key
     */
    @Transactional(readOnly = true)
    public FoodNutritionDto getFoodByKey(String foodKey) {
        FoodNutrition food = foodNutritionRepository.findByFoodKey(foodKey)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + foodKey));
        return toDto(food, loadSynonyms(List.of(food)).getOrDefault(food.getFoodKey(), List.of()));
    }

    /**
     * Search foods by keyword
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> searchFoods(String keyword) {
        List<FoodNutrition> foods = foodNutritionRepository.searchByKeyword(keyword);
        var synonymsByFoodKey = loadSynonyms(foods);
        return foods.stream()
                .map(f -> toDto(f, synonymsByFoodKey.getOrDefault(f.getFoodKey(), List.of())))
                .collect(Collectors.toList());
    }

    /**
     * Get foods by category
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> getFoodsByCategory(String category) {
        List<FoodNutrition> foods = foodNutritionRepository.findByCategoryAndIsActiveTrueOrderByFoodKey(category);
        var synonymsByFoodKey = loadSynonyms(foods);
        return foods.stream()
                .map(f -> toDto(f, synonymsByFoodKey.getOrDefault(f.getFoodKey(), List.of())))
                .collect(Collectors.toList());
    }

    /**
     * Get all categories
     */
    @Transactional(readOnly = true)
    public List<String> getCategories() {
        return foodNutritionRepository.findDistinctCategories();
    }

    /**
     * Create new food item
     */
    @Transactional
    public FoodNutritionDto createFood(FoodNutritionDto dto) {
        // Check if food key already exists
        if (foodNutritionRepository.existsByFoodKey(dto.getFoodKey())) {
            throw new IllegalArgumentException("Food key already exists: " + dto.getFoodKey());
        }

        FoodNutrition food = FoodNutrition.builder()
                .foodKey(dto.getFoodKey())
                .displayName(dto.getDisplayName())
                .displayNameCn(dto.getDisplayNameCn())
                .calories(dto.getCalories())
                .protein(dto.getProtein())
                .fat(dto.getFat())
                .carbs(dto.getCarbs())
                .fiber(dto.getFiber())
                .sodium(dto.getSodium())
                .category(dto.getCategory())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        food = foodNutritionRepository.save(food);
        log.info("Created food: {}", food.getFoodKey());

        // Create synonyms if provided
        if (dto.getSynonyms() != null && !dto.getSynonyms().isEmpty()) {
            createSynonyms(food.getFoodKey(), dto.getSynonyms());
        }

        return toDto(food, loadSynonyms(List.of(food)).getOrDefault(food.getFoodKey(), List.of()));
    }

    /**
     * Update existing food item
     */
    @Transactional
    public FoodNutritionDto updateFood(UUID id, FoodNutritionDto dto) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));

        // Check if food key changed and new key already exists
        if (!food.getFoodKey().equals(dto.getFoodKey()) &&
                foodNutritionRepository.existsByFoodKey(dto.getFoodKey())) {
            throw new IllegalArgumentException("Food key already exists: " + dto.getFoodKey());
        }

        String oldFoodKey = food.getFoodKey();

        food.setFoodKey(dto.getFoodKey());
        food.setDisplayName(dto.getDisplayName());
        food.setDisplayNameCn(dto.getDisplayNameCn());
        food.setCalories(dto.getCalories());
        food.setProtein(dto.getProtein());
        food.setFat(dto.getFat());
        food.setCarbs(dto.getCarbs());
        food.setFiber(dto.getFiber());
        food.setSodium(dto.getSodium());
        food.setCategory(dto.getCategory());
        if (dto.getIsActive() != null) {
            food.setIsActive(dto.getIsActive());
        }

        food = foodNutritionRepository.save(food);
        log.info("Updated food: {} -> {}", oldFoodKey, food.getFoodKey());

        // Update synonyms if food key changed
        if (!oldFoodKey.equals(food.getFoodKey())) {
            // Delete old synonyms and recreate with new key
            foodSynonymRepository.deleteByCanonicalFoodKey(oldFoodKey);
            if (dto.getSynonyms() != null && !dto.getSynonyms().isEmpty()) {
                createSynonyms(food.getFoodKey(), dto.getSynonyms());
            }
        } else if (dto.getSynonyms() != null) {
            // Recreate synonyms
            foodSynonymRepository.deleteByCanonicalFoodKey(food.getFoodKey());
            createSynonyms(food.getFoodKey(), dto.getSynonyms());
        }

        return toDto(food, loadSynonyms(List.of(food)).getOrDefault(food.getFoodKey(), List.of()));
    }

    /**
     * Delete food item (soft delete)
     */
    @Transactional
    public void deleteFood(UUID id) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));

        food.setIsActive(false);
        foodNutritionRepository.save(food);
        log.info("Soft deleted food: {}", food.getFoodKey());
    }

    /**
     * Hard delete food item and its synonyms
     */
    @Transactional
    public void hardDeleteFood(UUID id) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));

        foodSynonymRepository.deleteByCanonicalFoodKey(food.getFoodKey());
        foodNutritionRepository.delete(food);
        log.info("Hard deleted food: {}", food.getFoodKey());
    }

    /**
     * Add synonyms to a food item
     */
    @Transactional
    public void addSynonyms(String foodKey, List<String> synonyms) {
        if (!foodNutritionRepository.existsByFoodKey(foodKey)) {
            throw new EntityNotFoundException("Food not found: " + foodKey);
        }
        createSynonyms(foodKey, synonyms);
    }

    /**
     * Get synonyms for a food item
     */
    @Transactional(readOnly = true)
    public List<String> getSynonyms(String foodKey) {
        return foodSynonymRepository.findByCanonicalFoodKeyOrderBySynonym(foodKey)
                .stream()
                .map(FoodSynonym::getSynonym)
                .collect(Collectors.toList());
    }

    /**
     * Delete a synonym
     */
    @Transactional
    public void deleteSynonym(String synonym) {
        FoodSynonym foodSynonym = foodSynonymRepository.findBySynonym(synonym)
                .orElseThrow(() -> new EntityNotFoundException("Synonym not found: " + synonym));
        foodSynonymRepository.delete(foodSynonym);
        log.info("Deleted synonym: {} -> {}", synonym, foodSynonym.getCanonicalFoodKey());
    }

    // ---- Helper methods ----

    private void createSynonyms(String foodKey, List<String> synonyms) {
        for (String synonym : synonyms) {
            if (synonym == null || synonym.isBlank()) continue;
            if (foodSynonymRepository.existsBySynonym(synonym)) {
                log.warn("Synonym already exists, skipping: {}", synonym);
                continue;
            }

            FoodSynonym foodSynonym = FoodSynonym.builder()
                    .synonym(synonym.trim())
                    .canonicalFoodKey(foodKey)
                    .language(detectLanguage(synonym))
                    .build();
            foodSynonymRepository.save(foodSynonym);
            log.debug("Created synonym: {} -> {}", synonym, foodKey);
        }
    }

    private String detectLanguage(String text) {
        // Simple language detection based on character set
        for (char c : text.toCharArray()) {
            if (Character.UnicodeScript.of(c) == Character.UnicodeScript.HAN) {
                return "zh";
            }
        }
        return "en";
    }

    private FoodNutritionDto toDto(FoodNutrition entity, List<String> synonyms) {
        return FoodNutritionDto.builder()
                .id(entity.getId())
                .foodKey(entity.getFoodKey())
                .displayName(entity.getDisplayName())
                .displayNameCn(entity.getDisplayNameCn())
                .calories(entity.getCalories())
                .protein(entity.getProtein())
                .fat(entity.getFat())
                .carbs(entity.getCarbs())
                .fiber(entity.getFiber())
                .sodium(entity.getSodium())
                .category(entity.getCategory())
                .isActive(entity.getIsActive())
                .synonyms(synonyms)
                .build();
    }

    private java.util.Map<String, List<String>> loadSynonyms(List<FoodNutrition> foods) {
        if (foods.isEmpty()) return java.util.Collections.emptyMap();
        List<String> keys = foods.stream().map(FoodNutrition::getFoodKey).toList();
        return foodSynonymRepository.findByCanonicalFoodKeyIn(keys).stream()
                .collect(Collectors.groupingBy(FoodSynonym::getCanonicalFoodKey, Collectors.mapping(FoodSynonym::getSynonym, Collectors.toList())));
    }
}
