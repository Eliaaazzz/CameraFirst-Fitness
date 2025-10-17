package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeCard {
    String id;
    String title;
    Integer timeMinutes;
    String difficulty;
    String imageUrl;
    List<RecipeStep> steps;
    Map<String, Object> nutrition;
}
