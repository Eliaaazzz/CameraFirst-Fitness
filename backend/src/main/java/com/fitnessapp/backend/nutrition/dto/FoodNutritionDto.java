package com.fitnessapp.backend.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * DTO for Food Nutrition CRUD operations
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodNutritionDto {

    private UUID id;

    @NotBlank(message = "Food key is required")
    private String foodKey;

    private String displayName;

    private String displayNameCn;

    @NotNull(message = "Calories is required")
    @Positive(message = "Calories must be positive")
    private Double calories;

    @NotNull(message = "Protein is required")
    @Positive(message = "Protein must be positive")
    private Double protein;

    @NotNull(message = "Fat is required")
    @Positive(message = "Fat must be positive")
    private Double fat;

    @NotNull(message = "Carbs is required")
    @Positive(message = "Carbs must be positive")
    private Double carbs;

    private Double fiber;

    private Double sodium;

    private String category;

    private Boolean isActive;

    private List<String> synonyms; // List of synonyms for this food
}
