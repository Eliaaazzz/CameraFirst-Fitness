package com.fitnessapp.backend.nutrition.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitnessapp.backend.nutrition.dto.FoodNutritionDto;
import com.fitnessapp.backend.nutrition.service.admin.FoodNutritionAdminService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Admin REST API for managing food nutrition database
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/foods")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FoodNutritionAdminController {

    private final FoodNutritionAdminService adminService;

    /**
     * Get all foods
     */
    @GetMapping
    public ResponseEntity<List<FoodNutritionDto>> getAllFoods() {
        log.info("Getting all foods");
        return ResponseEntity.ok(adminService.getAllFoods());
    }

    /**
     * Get food by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<FoodNutritionDto> getFoodById(@PathVariable UUID id) {
        log.info("Getting food by id: {}", id);
        return ResponseEntity.ok(adminService.getFoodById(id));
    }

    /**
     * Get food by food key
     */
    @GetMapping("/key/{foodKey}")
    public ResponseEntity<FoodNutritionDto> getFoodByKey(@PathVariable String foodKey) {
        log.info("Getting food by key: {}", foodKey);
        return ResponseEntity.ok(adminService.getFoodByKey(foodKey));
    }

    /**
     * Search foods by keyword
     */
    @GetMapping("/search")
    public ResponseEntity<List<FoodNutritionDto>> searchFoods(@RequestParam String keyword) {
        log.info("Searching foods by keyword: {}", keyword);
        return ResponseEntity.ok(adminService.searchFoods(keyword));
    }

    /**
     * Get foods by category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<FoodNutritionDto>> getFoodsByCategory(@PathVariable String category) {
        log.info("Getting foods by category: {}", category);
        return ResponseEntity.ok(adminService.getFoodsByCategory(category));
    }

    /**
     * Get all categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        log.info("Getting all categories");
        return ResponseEntity.ok(adminService.getCategories());
    }

    /**
     * Create new food
     */
    @PostMapping
    public ResponseEntity<FoodNutritionDto> createFood(@Valid @RequestBody FoodNutritionDto dto) {
        log.info("Creating food: {}", dto.getFoodKey());
        FoodNutritionDto created = adminService.createFood(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update existing food
     */
    @PutMapping("/{id}")
    public ResponseEntity<FoodNutritionDto> updateFood(
            @PathVariable UUID id,
            @Valid @RequestBody FoodNutritionDto dto) {
        log.info("Updating food: {}", id);
        return ResponseEntity.ok(adminService.updateFood(id, dto));
    }

    /**
     * Delete food (soft delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFood(@PathVariable UUID id) {
        log.info("Deleting food: {}", id);
        adminService.deleteFood(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Hard delete food and its synonyms
     */
    @DeleteMapping("/{id}/hard")
    public ResponseEntity<Void> hardDeleteFood(@PathVariable UUID id) {
        log.info("Hard deleting food: {}", id);
        adminService.hardDeleteFood(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Add synonyms to a food
     */
    @PostMapping("/key/{foodKey}/synonyms")
    public ResponseEntity<Void> addSynonyms(
            @PathVariable String foodKey,
            @RequestBody List<String> synonyms) {
        log.info("Adding {} synonyms to food: {}", synonyms.size(), foodKey);
        adminService.addSynonyms(foodKey, synonyms);
        return ResponseEntity.ok().build();
    }

    /**
     * Get synonyms for a food
     */
    @GetMapping("/key/{foodKey}/synonyms")
    public ResponseEntity<List<String>> getSynonyms(@PathVariable String foodKey) {
        log.info("Getting synonyms for food: {}", foodKey);
        return ResponseEntity.ok(adminService.getSynonyms(foodKey));
    }

    /**
     * Delete a synonym
     */
    @DeleteMapping("/synonyms/{synonym}")
    public ResponseEntity<Void> deleteSynonym(@PathVariable String synonym) {
        log.info("Deleting synonym: {}", synonym);
        adminService.deleteSynonym(synonym);
        return ResponseEntity.noContent().build();
    }

    /**
     * Bulk import foods
     */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkImportFoods(@RequestBody List<FoodNutritionDto> foods) {
        log.info("Bulk importing {} foods", foods.size());
        int success = 0;
        int failed = 0;

        for (FoodNutritionDto dto : foods) {
            try {
                adminService.createFood(dto);
                success++;
            } catch (Exception e) {
                log.warn("Failed to import food {}: {}", dto.getFoodKey(), e.getMessage());
                failed++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "total", foods.size(),
                "success", success,
                "failed", failed
        ));
    }
}
