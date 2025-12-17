package com.fitnessapp.backend.nutrition.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for POST /api/v1/meals endpoint
 * Note: userId is ALWAYS extracted from JWT token (@AuthenticationPrincipal)
 * Client cannot specify userId - this prevents IDOR attacks
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMealRequest {

  @NotNull
  @Size(max = 32)
  private String mealType;

  @NotNull
  private List<FoodItemRequest> items;

  @Size(max = 500)
  private String note;

  @Size(max = 500)
  private String imageUrl;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class FoodItemRequest {
    @NotNull
    private String foodKey;

    @NotNull
    private String displayName;

    @NotNull
    private Integer grams;

    @NotNull
    private BigDecimal calories;

    @NotNull
    private BigDecimal protein;

    @NotNull
    private BigDecimal fat;

    @NotNull
    private BigDecimal carbs;

    private BigDecimal confidence;
  }
}
