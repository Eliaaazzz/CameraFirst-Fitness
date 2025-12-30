package com.fitnessapp.backend.retrieval.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Builder;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecipeIngredientDto implements Serializable {
    private static final long serialVersionUID = 1L;
    String name;
    BigDecimal quantity;
    String unit;
}
