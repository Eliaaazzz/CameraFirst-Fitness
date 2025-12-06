package com.fitnessapp.backend.usda.controller;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.dto.UsdaFoodResponse;
import com.fitnessapp.backend.usda.dto.UsdaNutritionResponse;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import com.fitnessapp.backend.usda.service.UsdaFoodSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/usda/foods")
@RequiredArgsConstructor
public class UsdaFoodController {

    private final UsdaFoodSearchService searchService;
    private final UsdaFoodRepository foodRepository;

    @GetMapping("/search")
    public ResponseEntity<List<UsdaFoodResponse>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {
        List<UsdaFoodResponse> response = searchService.search(query, limit).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsdaFoodResponse> getById(@PathVariable Long id) {
        UsdaFood food = foodRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Food not found"));
        return ResponseEntity.ok(toResponse(food));
    }

    private UsdaFoodResponse toResponse(UsdaFood food) {
        var nutrition = food.getNutrition();
        return UsdaFoodResponse.builder()
                .id(food.getId())
                .fdcId(food.getFdcId())
                .name(food.getName())
                .description(food.getDescription())
                .category(food.getCategory())
                .foodState(food.getFoodState())
                .dataType(food.getDataType())
                .nutrition(nutrition == null ? null : UsdaNutritionResponse.builder()
                        .calories(nutrition.getCalories() != null ? nutrition.getCalories().doubleValue() : null)
                        .protein(nutrition.getProteinG() != null ? nutrition.getProteinG().doubleValue() : null)
                        .fat(nutrition.getFatG() != null ? nutrition.getFatG().doubleValue() : null)
                        .carbs(nutrition.getCarbsG() != null ? nutrition.getCarbsG().doubleValue() : null)
                        .fiber(nutrition.getFiberG() != null ? nutrition.getFiberG().doubleValue() : null)
                        .sugar(nutrition.getSugarG() != null ? nutrition.getSugarG().doubleValue() : null)
                        .sodium(nutrition.getSodiumMg() != null ? nutrition.getSodiumMg().doubleValue() : null)
                        .saturatedFat(nutrition.getSaturatedFatG() != null ? nutrition.getSaturatedFatG().doubleValue() : null)
                        .qualityScore(nutrition.getQualityScore() != null ? nutrition.getQualityScore().doubleValue() : null)
                        .build())
                .build();
    }
}
