package com.fitnessapp.backend.usda.service;

import com.fitnessapp.backend.usda.domain.UsdaFood;
import com.fitnessapp.backend.usda.domain.UsdaFoodNutrition;
import com.fitnessapp.backend.usda.dto.UsdaSearchResponse;
import com.fitnessapp.backend.usda.repository.UsdaFoodRepository;
import com.fitnessapp.backend.usda.validation.NutritionValidators;
import org.springframework.transaction.annotation.Transactional;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsdaFoodImportService {

    private final UsdaFoodRepository foodRepository;
    private final UsdaFoodFetcher fetcher;

    @Transactional
    public ImportResult importFoods(String query, int maxFoods) {
        ImportResult result = new ImportResult(query);
        int pageSize = 50;
        int pageNumber = 1;
        int imported = 0;

        while (imported < maxFoods) {
            List<UsdaSearchResponse.UsdaFoodItem> foods = fetcher.searchFoods(query, pageSize, pageNumber);
            if (foods.isEmpty()) {
                break;
            }

            for (UsdaSearchResponse.UsdaFoodItem item : foods) {
                if (imported >= maxFoods) {
                    break;
                }

                try {
                    Optional<UsdaFood> existing = foodRepository.findByFdcId(item.getFdcId());
                    if (existing.isPresent()) {
                        result.incrementSkipped();
                        continue;
                    }

                    UsdaFood food = fetcher.toEntity(item);
                    applyQualityChecks(food.getNutrition(), result);

                    foodRepository.save(food);
                    imported++;
                    result.incrementSucceeded();

                    if (imported % 50 == 0) {
                        log.info("Imported {} USDA foods for query {}", imported, query);
                    }
                } catch (Exception e) {
                    log.error("Failed to import USDA food {}", item.getFdcId(), e);
                    result.incrementFailed();
                }
            }

            pageNumber++;
        }

        log.info("USDA import finished for '{}': {} success, {} skipped, {} failed",
                query, result.getSucceeded(), result.getSkipped(), result.getFailed());

        return result;
    }

    private void applyQualityChecks(UsdaFoodNutrition nutrition, ImportResult result) {
        NutritionValidators.ValidationOutcome outcome = NutritionValidators.calorieConsistency(nutrition);
        if (!outcome.valid()) {
            nutrition.setQualityScore(BigDecimal.valueOf(0.60));
            result.addWarning(outcome.message());
        }

        List<String> warnings = NutritionValidators.extremeValueWarnings(nutrition);
        if (!warnings.isEmpty()) {
            nutrition.setQualityScore(BigDecimal.valueOf(0.70));
            result.addWarnings(warnings);
        }

        if (nutrition.getQualityScore() == null) {
            nutrition.setQualityScore(BigDecimal.valueOf(0.80));
        }
    }

    @Getter
    public static class ImportResult {
        private final String query;
        private int succeeded;
        private int skipped;
        private int failed;
        private final List<String> warnings = new ArrayList<>();

        public ImportResult(String query) {
            this.query = query;
        }

        public void incrementSucceeded() {
            succeeded++;
        }

        public void incrementSkipped() {
            skipped++;
        }

        public void incrementFailed() {
            failed++;
        }

        public void addWarning(String message) {
            warnings.add(message);
        }

        public void addWarnings(List<String> messages) {
            warnings.addAll(messages);
        }
    }
}
