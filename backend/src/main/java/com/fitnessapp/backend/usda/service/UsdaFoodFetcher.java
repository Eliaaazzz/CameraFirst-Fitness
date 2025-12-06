package com.fitnessapp.backend.usda.service;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;
import com.fitnessapp.backend.usda.dto.UsdaSearchResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class UsdaFoodFetcher {

    private final RestTemplate restTemplate;

    @Value("${usda.api.key:}")
    private String apiKey;

    @Value("${usda.api.base-url:https://api.nal.usda.gov/fdc/v1}")
    private String baseUrl;

    private static final Map<Integer, String> NUTRIENT_MAPPING = Map.of(
            1008, "calories",
            1003, "proteinG",
            1004, "fatG",
            1005, "carbsG",
            1079, "fiberG",
            2000, "sugarG",
            1093, "sodiumMg",
            1258, "saturatedFatG"
    );

    public UsdaFoodFetcher(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
    }

    public List<UsdaSearchResponse.UsdaFoodItem> searchFoods(String query, int pageSize, int pageNumber) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("USDA_API_KEY is missing");
        }

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/foods/search")
                .queryParam("query", query)
                .queryParam("pageSize", pageSize)
                .queryParam("pageNumber", pageNumber)
                .queryParam("api_key", apiKey)
                .build()
                .toUriString();

        try {
            UsdaSearchResponse response = restTemplate.getForObject(url, UsdaSearchResponse.class);
            if (response == null || response.getFoods() == null) {
                return Collections.emptyList();
            }
            return response.getFoods();
        } catch (Exception e) {
            log.error("Failed to fetch USDA foods for query {} page {}", query, pageNumber, e);
            throw new RuntimeException("USDA fetch failed", e);
        }
    }

    public UsdaFood toEntity(UsdaSearchResponse.UsdaFoodItem usdaFood) {
        UsdaFood food = UsdaFood.builder()
                .fdcId(usdaFood.getFdcId())
                .name(usdaFood.getDescription())
                .description(usdaFood.getDescription())
                .dataType(usdaFood.getDataType())
                .category(classifyCategory(usdaFood.getDescription()))
                .foodState(extractFoodState(usdaFood.getDescription()))
                .build();

        UsdaFoodNutrition nutrition = UsdaFoodNutrition.builder()
                .food(food)
                .qualityScore(BigDecimal.valueOf(0.80))
                .build();

        if (usdaFood.getFoodNutrients() != null) {
            for (UsdaSearchResponse.UsdaNutrient nutrient : usdaFood.getFoodNutrients()) {
                if (nutrient.getNutrientId() == null) {
                    continue;
                }
                String target = NUTRIENT_MAPPING.get(nutrient.getNutrientId());
                if (target != null) {
                    setNutritionField(nutrition, target, nutrient.getValue());
                }
            }
        }

        // Ensure calories is never null because column is NOT NULL
        if (nutrition.getCalories() == null) {
            nutrition.setCalories(deriveCalories(nutrition));
        }

        food.attachNutrition(nutrition);
        return food;
    }

    private void setNutritionField(UsdaFoodNutrition nutrition, String field, BigDecimal value) {
        if (value == null) {
            return;
        }
        switch (field) {
            case "calories" -> nutrition.setCalories(value);
            case "proteinG" -> nutrition.setProteinG(value);
            case "fatG" -> nutrition.setFatG(value);
            case "carbsG" -> nutrition.setCarbsG(value);
            case "fiberG" -> nutrition.setFiberG(value);
            case "sugarG" -> nutrition.setSugarG(value);
            case "sodiumMg" -> nutrition.setSodiumMg(value);
            case "saturatedFatG" -> nutrition.setSaturatedFatG(value);
            default -> log.debug("Unused nutrient field: {}", field);
        }
    }

    private BigDecimal deriveCalories(UsdaFoodNutrition nutrition) {
        BigDecimal protein = defaultZero(nutrition.getProteinG());
        BigDecimal carbs = defaultZero(nutrition.getCarbsG());
        BigDecimal fat = defaultZero(nutrition.getFatG());
        BigDecimal calculated = protein.multiply(BigDecimal.valueOf(4))
                .add(carbs.multiply(BigDecimal.valueOf(4)))
                .add(fat.multiply(BigDecimal.valueOf(9)));
        return calculated.compareTo(BigDecimal.ZERO) > 0 ? calculated : BigDecimal.ZERO;
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String classifyCategory(String description) {
        String desc = description == null ? "" : description.toUpperCase();
        if (desc.contains("VEGETABLE") || desc.contains("BROCCOLI") || desc.contains("CARROT")) return "VEGETABLE";
        if (desc.contains("FRUIT") || desc.contains("APPLE") || desc.contains("BANANA")) return "FRUIT";
        if (desc.contains("CHICKEN") || desc.contains("BEEF") || desc.contains("PORK") || desc.contains("TURKEY")) return "MEAT";
        if (desc.contains("GRAIN") || desc.contains("RICE") || desc.contains("WHEAT") || desc.contains("BREAD")) return "GRAIN";
        return "OTHER";
    }

    private String extractFoodState(String description) {
        String desc = description == null ? "" : description.toUpperCase();
        if (desc.contains("RAW")) return "RAW";
        if (desc.contains("COOKED")) return "COOKED";
        if (desc.contains("FRIED")) return "FRIED";
        if (desc.contains("BAKED")) return "BAKED";
        if (desc.contains("ROASTED")) return "ROASTED";
        if (desc.contains("GRILLED")) return "GRILLED";
        return "UNKNOWN";
    }
}
