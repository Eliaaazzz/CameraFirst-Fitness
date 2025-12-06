package com.fitnessapp.backend.usda.validation;

import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

public final class NutritionValidators {

    private NutritionValidators() {
    }

    public static ValidationOutcome calorieConsistency(UsdaFoodNutrition nutrition) {
        if (nutrition.getCalories() == null) {
            return new ValidationOutcome(true, 0.0, "No calorie value provided");
        }

        BigDecimal protein = zeroIfNull(nutrition.getProteinG());
        BigDecimal carbs = zeroIfNull(nutrition.getCarbsG());
        BigDecimal fat = zeroIfNull(nutrition.getFatG());

        BigDecimal theoretical = protein.multiply(BigDecimal.valueOf(4))
                .add(carbs.multiply(BigDecimal.valueOf(4)))
                .add(fat.multiply(BigDecimal.valueOf(9)));

        if (theoretical.compareTo(BigDecimal.ZERO) == 0) {
            return new ValidationOutcome(true, 0.0, "No macros to validate");
        }

        BigDecimal deviation = nutrition.getCalories().subtract(theoretical).abs()
                .divide(theoretical, 4, RoundingMode.HALF_UP);

        boolean valid = deviation.compareTo(BigDecimal.valueOf(0.15)) <= 0;
        return new ValidationOutcome(valid, deviation.doubleValue(),
                String.format("Calories deviation %.2f%%", deviation.multiply(BigDecimal.valueOf(100))));
    }

    public static List<String> extremeValueWarnings(UsdaFoodNutrition nutrition) {
        List<String> warnings = new ArrayList<>();

        if (nutrition.getCalories() != null && nutrition.getCalories().compareTo(BigDecimal.valueOf(950)) > 0) {
            warnings.add("Calories unusually high: " + nutrition.getCalories());
        }

        if (nutrition.getProteinG() != null && nutrition.getProteinG().compareTo(BigDecimal.valueOf(95)) > 0) {
            warnings.add("Protein unusually high: " + nutrition.getProteinG());
        }

        BigDecimal totalMacros = zeroIfNull(nutrition.getProteinG())
                .add(zeroIfNull(nutrition.getFatG()))
                .add(zeroIfNull(nutrition.getCarbsG()));
        if (totalMacros.compareTo(BigDecimal.valueOf(105)) > 0) {
            warnings.add("Macros exceed 100g/100g: " + totalMacros);
        }

        return warnings;
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public record ValidationOutcome(boolean valid, double deviation, String message) {
    }
}
