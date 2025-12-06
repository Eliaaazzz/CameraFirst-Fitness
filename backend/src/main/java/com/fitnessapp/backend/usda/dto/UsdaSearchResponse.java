package com.fitnessapp.backend.usda.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UsdaSearchResponse {
    private List<UsdaFoodItem> foods;
    private int pageNumber;
    private int totalPages;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UsdaFoodItem {
        @JsonProperty("fdcId")
        private String fdcId;

        @JsonProperty("description")
        private String description;

        @JsonProperty("dataType")
        private String dataType;

        @JsonProperty("foodNutrients")
        private List<UsdaNutrient> foodNutrients;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UsdaNutrient {
        @JsonProperty("nutrientId")
        private Integer nutrientId;

        @JsonProperty("nutrientName")
        private String nutrientName;

        @JsonProperty("value")
        private BigDecimal value;

        @JsonProperty("unitName")
        private String unitName;
    }
}
