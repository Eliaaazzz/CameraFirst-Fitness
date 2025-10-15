package com.fitnessapp.backend.recipe.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeCurationResult {
    int targetRecipes;
    int curatedCount;
    int skippedExisting;
    int rejectedCount;
    int inspectedCount;
    List<String> reviewNotes;
}
