package com.fitnessapp.backend.usda.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UsdaFoodResponse {
    private Long id;
    private String fdcId;
    private String name;
    private String description;
    private String category;
    private String foodState;
    private String dataType;
    private UsdaNutritionResponse nutrition;
}
