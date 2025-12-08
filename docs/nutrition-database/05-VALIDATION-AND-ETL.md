# USDA Integration: Data Validation & ETL

> Version: 1.0.0  
> Date: 2025-12-06  
> Target: AuraFitness Backend

---

## I. Overview

This document covers data validation rules and ETL (Extract-Transform-Load) process for USDA food data imports into AuraFitness.

**Goals:**
1. Ensure imported data accuracy (calorie consistency, no impossible values)
2. Assign quality scores to each food
3. Handle edge cases and data anomalies
4. Provide visibility into import process

---

## II. Validation Rules

### 2.1 Calorie Consistency (Level 1)

**Rule:** Theoretical calories from macros should match reported calories within 15%

**Formula:**
```
Theoretical = (Protein × 4) + (Carbs × 4) + (Fat × 9)
Deviation = |Actual - Theoretical| / Theoretical
Valid if Deviation ≤ 15%
```

**Implementation:**

```java
@Component
public class CalorieConsistencyValidator {
    
    public ValidationIssue validate(FoodNutrition nutrition) {
        ValidationIssue issue = new ValidationIssue();
        issue.setRule("CALORIE_CONSISTENCY");
        
        if (nutrition.getCalories() == null) {
            issue.setStatus("SKIP");
            issue.setMessage("No calories provided");
            return issue;
        }
        
        BigDecimal protein = nutrition.getProteinG() != null ? nutrition.getProteinG() : BigDecimal.ZERO;
        BigDecimal carbs = nutrition.getCarbsG() != null ? nutrition.getCarbsG() : BigDecimal.ZERO;
        BigDecimal fat = nutrition.getFatG() != null ? nutrition.getFatG() : BigDecimal.ZERO;
        
        BigDecimal theoretical = protein.multiply(new BigDecimal("4"))
            .add(carbs.multiply(new BigDecimal("4")))
            .add(fat.multiply(new BigDecimal("9")))
            .setScale(2, RoundingMode.HALF_UP);
        
        if (theoretical.compareTo(BigDecimal.ZERO) == 0) {
            issue.setStatus("PASS");
            issue.setMessage("Insufficient macros for validation");
            return issue;
        }
        
        BigDecimal deviation = nutrition.getCalories().subtract(theoretical).abs()
            .divide(theoretical, 4, RoundingMode.HALF_UP);
        
        issue.setActualValue(nutrition.getCalories().doubleValue());
        issue.setExpectedValue(theoretical.doubleValue());
        issue.setDeviation(deviation.doubleValue() * 100);
        
        if (deviation.compareTo(new BigDecimal("0.15")) <= 0) {
            issue.setStatus("PASS");
            issue.setMessage(String.format("Deviation: %.1f%%", issue.getDeviation()));
        } else if (deviation.compareTo(new BigDecimal("0.30")) <= 0) {
            issue.setStatus("WARNING");
            issue.setSeverity("MEDIUM");
            issue.setMessage(String.format("High deviation: %.1f%%", issue.getDeviation()));
        } else {
            issue.setStatus("FAIL");
            issue.setSeverity("HIGH");
            issue.setMessage(String.format("Critical deviation: %.1f%%", issue.getDeviation()));
        }
        
        return issue;
    }
}
```

**Examples:**
```
✓ PASS: Calories=100, P=5g, C=15g, F=2g → Theoretical=95-110 kcal ✓
⚠️ WARNING: Calories=100, P=25g, C=0g, F=0g → Theoretical=100 but high protein deviation
✗ FAIL: Calories=100, P=0g, C=0g, F=10g → Theoretical=90 vs Actual=100 (11% is ok)
```

### 2.2 Extreme Value Detection (Level 2)

**Nutritional Impossibilities:**

```java
@Component
public class ExtremeValueValidator {
    
    public List<ValidationIssue> validate(FoodNutrition nutrition) {
        List<ValidationIssue> issues = new ArrayList<>();
        
        // Rule 1: Protein > 95g/100g (max is ~85 for pure protein powder)
        if (nutrition.getProteinG() != null && nutrition.getProteinG().compareTo(new BigDecimal("95")) > 0) {
            issues.add(createIssue("EXTREME_PROTEIN", "MEDIUM",
                String.format("Protein %.1fg/100g (max realistic: 95g)", nutrition.getProteinG())));
        }
        
        // Rule 2: Fat > 100g/100g (impossible - pure oil is 100g)
        if (nutrition.getFatG() != null && nutrition.getFatG().compareTo(new BigDecimal("100")) > 0) {
            issues.add(createIssue("IMPOSSIBLE_FAT", "HIGH",
                String.format("Fat %.1fg/100g (impossible - max 100g)", nutrition.getFatG())));
        }
        
        // Rule 3: Carbs > 100g/100g (impossible)
        if (nutrition.getCarbsG() != null && nutrition.getCarbsG().compareTo(new BigDecimal("100")) > 0) {
            issues.add(createIssue("IMPOSSIBLE_CARBS", "HIGH",
                String.format("Carbs %.1fg/100g (impossible - max 100g)", nutrition.getCarbsG())));
        }
        
        // Rule 4: Total macros (protein + fat + carbs + fiber) > 105g/100g (allow 5% for rounding)
        BigDecimal total = (nutrition.getProteinG() != null ? nutrition.getProteinG() : BigDecimal.ZERO)
            .add(nutrition.getFatG() != null ? nutrition.getFatG() : BigDecimal.ZERO)
            .add(nutrition.getCarbsG() != null ? nutrition.getCarbsG() : BigDecimal.ZERO)
            .add(nutrition.getFiberG() != null ? nutrition.getFiberG() : BigDecimal.ZERO);
        
        if (total.compareTo(new BigDecimal("105")) > 0) {
            issues.add(createIssue("MACROS_EXCEED_100", "MEDIUM",
                String.format("Total macros %.1fg/100g (max 100g)", total)));
        }
        
        // Rule 5: Calories > 950 kcal/100g (pure oil/fat is ~900)
        if (nutrition.getCalories() != null && nutrition.getCalories().compareTo(new BigDecimal("950")) > 0) {
            issues.add(createIssue("EXTREME_CALORIES", "MEDIUM",
                String.format("Calories %.0f kcal/100g (max realistic: 950)", nutrition.getCalories())));
        }
        
        // Rule 6: Sugar > Carbs (impossible)
        if (nutrition.getSugarG() != null && nutrition.getCarbsG() != null &&
            nutrition.getSugarG().compareTo(nutrition.getCarbsG()) > 0) {
            issues.add(createIssue("SUGAR_EXCEEDS_CARBS", "HIGH",
                String.format("Sugar %.1fg exceeds carbs %.1fg", 
                    nutrition.getSugarG(), nutrition.getCarbsG())));
        }
        
        // Rule 7: Saturated fat > Total fat (impossible)
        if (nutrition.getSaturatedFatG() != null && nutrition.getFatG() != null &&
            nutrition.getSaturatedFatG().compareTo(nutrition.getFatG()) > 0) {
            issues.add(createIssue("SAT_FAT_EXCEEDS_TOTAL", "HIGH",
                String.format("Saturated fat %.1fg exceeds total fat %.1fg",
                    nutrition.getSaturatedFatG(), nutrition.getFatG())));
        }
        
        // Rule 8: Sodium > 5000mg/100g (extreme - typical high salt is ~3800mg)
        if (nutrition.getSodiumMg() != null && nutrition.getSodiumMg().compareTo(new BigDecimal("5000")) > 0) {
            issues.add(createIssue("EXTREME_SODIUM", "MEDIUM",
                String.format("Sodium %.0fmg/100g (extreme - reference: salt ~3800mg)", 
                    nutrition.getSodiumMg())));
        }
        
        return issues;
    }
    
    private ValidationIssue createIssue(String rule, String severity, String message) {
        ValidationIssue issue = new ValidationIssue();
        issue.setRule(rule);
        issue.setSeverity(severity);
        issue.setStatus("FAIL");
        issue.setMessage(message);
        return issue;
    }
}
```

### 2.3 Logical Consistency (Level 3)

**Category-Specific Rules:**

```java
@Component
public class LogicalConsistencyValidator {
    
    public List<ValidationIssue> validate(Food food, FoodNutrition nutrition) {
        List<ValidationIssue> issues = new ArrayList<>();
        
        switch (food.getCategory()) {
            case "MEAT", "POULTRY", "SEAFOOD" -> {
                // Meat should have protein ≥ 10g/100g
                if (nutrition.getProteinG() != null && 
                    nutrition.getProteinG().compareTo(new BigDecimal("10")) < 0) {
                    issues.add(createWarning("LOW_PROTEIN_MEAT",
                        String.format("Meat with low protein: %.1fg/100g", nutrition.getProteinG())));
                }
                
                // Meat should have carbs < 5g/100g
                if (nutrition.getCarbsG() != null && 
                    nutrition.getCarbsG().compareTo(new BigDecimal("5")) > 0) {
                    issues.add(createWarning("HIGH_CARBS_MEAT",
                        String.format("Meat with unexpected carbs: %.1fg/100g", nutrition.getCarbsG())));
                }
            }
            
            case "VEGETABLE", "FRUIT" -> {
                // Vegetables/fruits should be low calorie (except nuts)
                if (!food.getNameEn().contains("NUT") && nutrition.getCalories() != null &&
                    nutrition.getCalories().compareTo(new BigDecimal("200")) > 0) {
                    issues.add(createWarning("HIGH_CALORIE_PRODUCE",
                        String.format("Produce with high calories: %.0f kcal/100g", nutrition.getCalories())));
                }
            }
            
            case "GRAIN" -> {
                // Grains should have carbs ≥ 50g/100g
                if (nutrition.getCarbsG() != null && 
                    nutrition.getCarbsG().compareTo(new BigDecimal("50")) < 0) {
                    issues.add(createWarning("LOW_CARBS_GRAIN",
                        String.format("Grain with low carbs: %.1fg/100g", nutrition.getCarbsG())));
                }
            }
        }
        
        return issues;
    }
    
    private ValidationIssue createWarning(String rule, String message) {
        ValidationIssue issue = new ValidationIssue();
        issue.setRule(rule);
        issue.setStatus("WARNING");
        issue.setSeverity("LOW");
        issue.setMessage(message);
        return issue;
    }
}
```

---

## III. Quality Score Calculation

### 3.1 Scoring Formula

```
QualityScore = (Completeness × 0.30) + (Consistency × 0.40) + (Accuracy × 0.30)

Completeness = # nutrients provided / # total nutrients (9)
Consistency = 1.0 - (# validation issues × 0.1)
Accuracy = Based on calorie deviation
```

### 3.2 Implementation

```java
@Component
public class QualityScoreCalculator {
    
    public BigDecimal calculateScore(Food food, FoodNutrition nutrition, 
                                     List<ValidationIssue> issues) {
        
        // 1. Completeness (30%)
        BigDecimal completeness = calculateCompleteness(nutrition);
        
        // 2. Consistency (40%)
        BigDecimal consistency = calculateConsistency(issues);
        
        // 3. Accuracy (30%) - based on calorie check
        BigDecimal accuracy = calculateAccuracy(issues);
        
        // Weighted average
        BigDecimal score = completeness.multiply(new BigDecimal("0.30"))
            .add(consistency.multiply(new BigDecimal("0.40")))
            .add(accuracy.multiply(new BigDecimal("0.30")))
            .setScale(2, RoundingMode.HALF_UP);
        
        return score.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }
    
    private BigDecimal calculateCompleteness(FoodNutrition nutrition) {
        int count = 0;
        int total = 9;  // calories, protein, fat, carbs, fiber, sugar, sodium, sat_fat, cholesterol
        
        if (nutrition.getCalories() != null) count++;
        if (nutrition.getProteinG() != null) count++;
        if (nutrition.getFatG() != null) count++;
        if (nutrition.getCarbsG() != null) count++;
        if (nutrition.getFiberG() != null) count++;
        if (nutrition.getSugarG() != null) count++;
        if (nutrition.getSodiumMg() != null) count++;
        if (nutrition.getSaturatedFatG() != null) count++;
        
        return new BigDecimal(count).divide(new BigDecimal(total), 4, RoundingMode.HALF_UP);
    }
    
    private BigDecimal calculateConsistency(List<ValidationIssue> issues) {
        BigDecimal score = BigDecimal.ONE;
        
        for (ValidationIssue issue : issues) {
            if ("FAIL".equals(issue.getStatus())) {
                if ("HIGH".equals(issue.getSeverity())) {
                    score = score.subtract(new BigDecimal("0.15"));
                } else {
                    score = score.subtract(new BigDecimal("0.10"));
                }
            } else if ("WARNING".equals(issue.getStatus())) {
                score = score.subtract(new BigDecimal("0.05"));
            }
        }
        
        return score.max(BigDecimal.ZERO);
    }
    
    private BigDecimal calculateAccuracy(List<ValidationIssue> issues) {
        // If no calorie issue, perfect accuracy
        Optional<ValidationIssue> calorieIssue = issues.stream()
            .filter(i -> "CALORIE_CONSISTENCY".equals(i.getRule()))
            .findFirst();
        
        if (calorieIssue.isEmpty()) {
            return BigDecimal.ONE;
        }
        
        ValidationIssue issue = calorieIssue.get();
        
        if ("FAIL".equals(issue.getStatus()) && issue.getDeviation() > 50) {
            return new BigDecimal("0.5");
        }
        if ("WARNING".equals(issue.getStatus())) {
            return new BigDecimal("0.8");
        }
        
        return BigDecimal.ONE;
    }
}
```

### 3.3 Score Interpretation

| Score | Grade | Action |
|-------|-------|--------|
| 0.90-1.00 | A | Use as-is in production |
| 0.80-0.89 | B | Use with caution |
| 0.70-0.79 | C | Flag for manual review |
| 0.60-0.69 | D | Consider excluding |
| < 0.60 | F | Exclude from database |

---

## IV. Full Validation Pipeline

### 4.1 Orchestrator

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class FoodValidationService {
    
    private final CalorieConsistencyValidator calorieValidator;
    private final ExtremeValueValidator extremeValidator;
    private final LogicalConsistencyValidator logicalValidator;
    private final QualityScoreCalculator scoreCalculator;
    
    public ValidationReport validate(Food food) {
        ValidationReport report = new ValidationReport();
        report.setFdcId(food.getFdcId());
        report.setFoodName(food.getNameEn());
        
        List<ValidationIssue> allIssues = new ArrayList<>();
        
        // Level 1: Calorie consistency
        ValidationIssue calorieCheck = calorieValidator.validate(food.getNutrition());
        allIssues.add(calorieCheck);
        
        // Level 2: Extreme values
        allIssues.addAll(extremeValidator.validate(food.getNutrition()));
        
        // Level 3: Logical consistency
        allIssues.addAll(logicalValidator.validate(food, food.getNutrition()));
        
        report.setIssues(allIssues);
        
        // Calculate quality score
        BigDecimal score = scoreCalculator.calculateScore(food, food.getNutrition(), allIssues);
        report.setQualityScore(score);
        food.getNutrition().setQualityScore(score);
        
        // Determine overall status
        long failCount = allIssues.stream().filter(i -> "FAIL".equals(i.getStatus())).count();
        if (failCount > 0) {
            report.setOverallStatus("FAIL");
        } else {
            long warningCount = allIssues.stream().filter(i -> "WARNING".equals(i.getStatus())).count();
            report.setOverallStatus(warningCount > 0 ? "WARNING" : "PASS");
        }
        
        log.info("Validation complete for {}: status={}, score={}", 
            food.getNameEn(), report.getOverallStatus(), score);
        
        return report;
    }
}

@Data
class ValidationReport {
    private String fdcId;
    private String foodName;
    private List<ValidationIssue> issues;
    private BigDecimal qualityScore;
    private String overallStatus;  // PASS, WARNING, FAIL
}

@Data
class ValidationIssue {
    private String rule;
    private String status;  // PASS, WARNING, FAIL, SKIP
    private String severity;  // LOW, MEDIUM, HIGH
    private String message;
    private Double actualValue;
    private Double expectedValue;
    private Double deviation;
}
```

### 4.2 Integration with Import Service

```java
// Update FoodImportService to use validation

@Transactional
public ImportResult importFoods(String query, int maxFoods) {
    ImportResult result = new ImportResult();
    
    // ... fetch foods from USDA ...
    
    for (USDAFood usdaFood : foods) {
        try {
            Food food = fetcher.convertUSDAFood(usdaFood);
            
            // Validate
            ValidationReport report = validationService.validate(food);
            
            // Decide action based on validation
            if ("FAIL".equals(report.getOverallStatus())) {
                result.addFailedFood(food.getNameEn(), report);
                result.incrementFailed();
                continue;
            }
            
            // Save even if WARNING - but with lower quality score
            foodRepository.save(food);
            
            if ("WARNING".equals(report.getOverallStatus())) {
                result.addWarningFood(food.getNameEn(), report);
            }
            
            result.incrementSucceeded();
            
        } catch (Exception e) {
            log.error("Failed to import: {}", usdaFood.getFdcId(), e);
            result.incrementFailed();
        }
    }
    
    return result;
}
```

---

## V. Monitoring & Reporting

### 5.1 Import Status Endpoint

```java
// AdminFoodController.java

@GetMapping("/import-status")
public ResponseEntity<ImportStats> getImportStatus() {
    long total = foodRepository.count();
    
    BigDecimal avgScore = foodRepository.getAverageQualityScore();
    
    long gradeA = foodRepository.countByScoreRange(0.90, 1.00);
    long gradeB = foodRepository.countByScoreRange(0.80, 0.89);
    long gradeC = foodRepository.countByScoreRange(0.70, 0.79);
    long gradeD = foodRepository.countByScoreRange(0.60, 0.69);
    long gradeF = foodRepository.countByScoreRange(0.00, 0.59);
    
    return ResponseEntity.ok(ImportStats.builder()
        .totalFoods(total)
        .averageQualityScore(avgScore.doubleValue())
        .gradeDistribution(Map.of(
            "A", gradeA,
            "B", gradeB,
            "C", gradeC,
            "D", gradeD,
            "F", gradeF
        ))
        .build());
}

@Data
@Builder
class ImportStats {
    private Long totalFoods;
    private Double averageQualityScore;
    private Map<String, Long> gradeDistribution;
}
```

---

## VI. Implementation Checklist

- [ ] Implement CalorieConsistencyValidator
- [ ] Implement ExtremeValueValidator
- [ ] Implement LogicalConsistencyValidator
- [ ] Implement QualityScoreCalculator
- [ ] Implement FoodValidationService
- [ ] Update FoodImportService with validation
- [ ] Add validation report endpoint
- [ ] Add import status dashboard endpoint
- [ ] Test validation with 100+ USDA foods
- [ ] Document validation rules for ops team



## III. Actions, Thresholds & Ownership

- Threshold examples:
  - Calorie consistency: deviation ≤15% PASS, 15-30% WARNING, >30% FAIL; a FAIL forces quality_score to 0.3 and routes the row to manual review.
  - Extreme values: numbers beyond physical limits (e.g., fat >100g/100g, sodium >5000mg/100g) are marked FAIL and sent to a dead-letter queue.
  - Total macros >105g/100g: WARNING with auto-normalization to 100g; if still out of bounds mark FAIL.
- Handling:
  - AUTO-FIX: proportionally scale fixable values and tag the record.
  - QUARANTINE: park unfixable records in an isolation table for follow-up.
  - MANUAL REVIEW: force review for high-value or high-risk categories (e.g., infant or medical nutrition).
- Monitoring: track validation pass rate, rule hit rate, auto-fix count, and quarantined rows; publish metrics and alerts.
- Audit: keep both original and corrected records for traceability.
- Ownership: Data Quality owner cleans the quarantine queue and publishes weekly reports; ETL owner manages ingestion retries/replays.

## IV. Testing & Playbook

- Unit tests: add positive and negative (edge) cases for each rule and run them in CI.
- Integration tests: run the full ETL on real USDA samples to verify drop/fix/quarantine paths.
- Rollback: snapshot before import; if the batch failure rate >5% or critical rule FAIL >1%, roll back to the previous snapshot and stop scheduling.
- Ops handbook:
  - Retry/replay: allow idempotent replays from a source snapshot plus incremental package.
  - Incident response: when FAIL counts spike or alerts fire, pause the pipeline, export a failure summary, and determine whether the issue is source data or overly strict rules.
