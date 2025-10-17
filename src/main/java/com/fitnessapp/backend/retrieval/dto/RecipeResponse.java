package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeResponse {
    List<RecipeCard> recipes;
    List<String> detectedIngredients;
    Integer maxTimeMinutes;
    Integer latencyMs;
}
