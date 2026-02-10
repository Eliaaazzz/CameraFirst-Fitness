package com.fitnessapp.backend.nutrition.service.admin;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitnessapp.backend.nutrition.dto.FoodNutritionDto;
import com.fitnessapp.backend.nutrition.entity.FoodNutrition;
import com.fitnessapp.backend.nutrition.repository.FoodNutritionRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Admin service for managing food nutrition database
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodNutritionAdminService {

    private final FoodNutritionRepository foodNutritionRepository;

    /**
     * Synonyms were previously stored in a dedicated table. That feature has been removed.
     * Keep these endpoints as no-ops for backwards compatibility with older clients/admin tooling.
     */
    @Transactional
    public void addSynonyms(String foodKey, List<String> synonyms) {
        foodNutritionRepository.findByFoodKey(foodKey)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + foodKey));
        log.debug("Ignoring addSynonyms request for foodKey={} (synonyms feature deprecated)", foodKey);
    }

    @Transactional(readOnly = true)
    public List<String> getSynonyms(String foodKey) {
        foodNutritionRepository.findByFoodKey(foodKey)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + foodKey));
        return List.of();
    }

    @Transactional
    public void deleteSynonym(String synonym) {
        log.debug("Ignoring deleteSynonym request for synonym={} (synonyms feature deprecated)", synonym);
    }

    /**
     * Get all food items
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> getAllFoods() {
        List<FoodNutrition> foods = foodNutritionRepository.findByIsActiveTrueOrderByFoodKey();
        return foods.stream()
                .map(f -> toDto(f, Collections.emptyList()))
                .collect(Collectors.toList());
    }

    /**
     * Get food by ID
     */
    @Transactional(readOnly = true)
    public FoodNutritionDto getFoodById(UUID id) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));
        return toDto(food, Collections.emptyList());
    }

    /**
     * Get food by food key
     */
    @Transactional(readOnly = true)
    public FoodNutritionDto getFoodByKey(String foodKey) {
        FoodNutrition food = foodNutritionRepository.findByFoodKey(foodKey)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + foodKey));
        return toDto(food, Collections.emptyList());
    }

    /**
     * Search foods by keyword
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> searchFoods(String keyword) {
        List<FoodNutrition> foods = foodNutritionRepository.searchByKeyword(keyword);
        return foods.stream()
                .map(f -> toDto(f, Collections.emptyList()))
                .collect(Collectors.toList());
    }

    /**
     * Get foods by category
     */
    @Transactional(readOnly = true)
    public List<FoodNutritionDto> getFoodsByCategory(String category) {
        List<FoodNutrition> foods = foodNutritionRepository.findByCategoryAndIsActiveTrueOrderByFoodKey(category);
        return foods.stream()
                .map(f -> toDto(f, Collections.emptyList()))
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

        return toDto(food, Collections.emptyList());
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

        return toDto(food, Collections.emptyList());
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
     * Hard delete food item
     */
    @Transactional
    public void hardDeleteFood(UUID id) {
        FoodNutrition food = foodNutritionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Food not found: " + id));

        foodNutritionRepository.delete(food);
        log.info("Hard deleted food: {}", food.getFoodKey());
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
}
