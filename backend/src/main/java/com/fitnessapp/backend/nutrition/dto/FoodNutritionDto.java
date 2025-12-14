package com.fitnessapp.backend.nutrition.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    @DecimalMin(value = "0.0", inclusive = false, message = "Calories must be positive")
    private BigDecimal calories;

    @NotNull(message = "Protein is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Protein must be positive")
    private BigDecimal protein;

    @NotNull(message = "Fat is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Fat must be positive")
    private BigDecimal fat;

    @NotNull(message = "Carbs is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Carbs must be positive")
    private BigDecimal carbs;

    private BigDecimal fiber;

    private BigDecimal sodium;

    private String category;

    private Boolean isActive;

    private List<String> synonyms; // List of synonyms for this food

}
