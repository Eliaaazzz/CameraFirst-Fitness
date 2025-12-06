package com.fitnessapp.backend.usda.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UsdaNutritionResponse {
    private Double calories;
    private Double protein;
    private Double fat;
    private Double carbs;
    private Double fiber;
    private Double sugar;
    private Double sodium;
    private Double saturatedFat;
    private Double qualityScore;
}
