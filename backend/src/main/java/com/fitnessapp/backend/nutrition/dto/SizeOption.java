package com.fitnessapp.backend.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a portion size option (Small/Medium/Large) for food recognition.
 * Allows users to easily adjust AI-estimated portion sizes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SizeOption {
    private int calories;
    private int grams;
    private int protein;
    private int carbs;
    private int fat;
    private String description;
}
