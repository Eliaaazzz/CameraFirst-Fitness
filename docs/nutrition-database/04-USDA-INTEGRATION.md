# USDA Integration: Database Schema & Import

> Version: 1.0.0  
> Date: 2025-12-06  
> Target: AuraFitness Backend - Spring Boot

---

## I. Overview

This document defines how to add USDA food database to AuraFitness backend to enhance nutrition tracking.

**Current Architecture:**
```
Food Image → Claude Vision → Detected Foods → NutritionTrackingService.logMeal()
```

**New Architecture:**
```
Food Image → Claude Vision → Match against Food DB → NutritionTrackingService.logMeal()
                                        ↓
                          (If high confidence)
                          Use DB nutrition
                          (Else) Use image analysis
```

---

## II. Database Schema

### 2.1 Add Food Tables

Implementation note: in code the tables are created with the prefix `usda_` (usda_food, usda_food_nutrition, usda_food_alias) to avoid clashing with the existing food_nutrition table.

```sql
-- Main food table
CREATE TABLE food (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fdc_id VARCHAR(20) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    description TEXT,
    category VARCHAR(50),  -- VEGETABLE, FRUIT, MEAT, GRAIN, etc.
    food_state VARCHAR(50),  -- RAW, COOKED, FRIED, BAKED, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nutrition data (per 100g)
CREATE TABLE food_nutrition (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    food_id BIGINT NOT NULL UNIQUE,
    calories DECIMAL(10,2) NOT NULL,
    protein_g DECIMAL(10,2),
    fat_g DECIMAL(10,2),
    carbs_g DECIMAL(10,2),
    fiber_g DECIMAL(10,2),
    sugar_g DECIMAL(10,2),
    sodium_mg DECIMAL(10,2),
    saturated_fat_g DECIMAL(10,2),
    quality_score DECIMAL(3,2),  -- 0-1 rating of data accuracy
    FOREIGN KEY (food_id) REFERENCES food(id) ON DELETE CASCADE
);

-- Food aliases for search
CREATE TABLE food_alias (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    food_id BIGINT NOT NULL,
    alias VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',  -- en, zh
    FOREIGN KEY (food_id) REFERENCES food(id) ON DELETE CASCADE
);

CREATE INDEX idx_food_name_en ON food(name_en);
CREATE INDEX idx_food_category ON food(category);
CREATE INDEX idx_food_state ON food(food_state);
CREATE INDEX idx_food_alias ON food_alias(alias);
```

### 2.2 Add JPA Entities

```java
// Food.java
@Entity
@Table(name = "food", indexes = {
    @Index(name = "idx_food_fdc_id", columnList = "fdc_id", unique = true),
    @Index(name = "idx_food_name", columnList = "name_en")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Food {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String fdcId;
    
    @Column(nullable = false, length = 255)
    private String nameEn;
    
    @Column(length = 255)
    private String nameZh;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(length = 50)
    private String category;
    
    @Column(length = 50)
    private String foodState;
    
    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @OneToOne(mappedBy = "food", cascade = CascadeType.ALL, optional = false)
    private FoodNutrition nutrition;
    
    @OneToMany(mappedBy = "food", cascade = CascadeType.ALL)
    private List<FoodAlias> aliases = new ArrayList<>();
}

// FoodNutrition.java
@Entity
@Table(name = "food_nutrition")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FoodNutrition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "food_id", referencedColumnName = "id")
    private Food food;
    
    @Column(nullable = false)
    private BigDecimal calories;
    
    private BigDecimal proteinG;
    private BigDecimal fatG;
    private BigDecimal carbsG;
    private BigDecimal fiberG;
    private BigDecimal sugarG;
    private BigDecimal sodiumMg;
    private BigDecimal saturatedFatG;
    
    @Column(nullable = false)
    private BigDecimal qualityScore;  // 0-1
}

// FoodAlias.java
@Entity
@Table(name = "food_alias")
@Data
@NoArgsConstructor
public class FoodAlias {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "food_id", referencedColumnName = "id")
    private Food food;
    
    @Column(nullable = false, length = 255)
    private String alias;
    
    @Column(length = 10, nullable = false)
    private String language;
}
```

### 2.3 Repositories

```java
// FoodRepository.java
public interface FoodRepository extends JpaRepository<Food, Long> {
    Optional<Food> findByFdcId(String fdcId);
    
    List<Food> findByNameEnIgnoreCaseContaining(String name);
    
    List<Food> findByCategory(String category);
    
    @Query("SELECT f FROM Food f JOIN f.aliases a WHERE LOWER(a.alias) LIKE LOWER(CONCAT('%', ?1, '%'))")
    List<Food> searchByAlias(String alias);
}

// FoodNutritionRepository.java
public interface FoodNutritionRepository extends JpaRepository<FoodNutrition, Long> {
    Optional<FoodNutrition> findByFoodId(Long foodId);
}

// FoodAliasRepository.java
public interface FoodAliasRepository extends JpaRepository<FoodAlias, Long> {
    List<FoodAlias> findByAliasIgnoreCaseAndLanguage(String alias, String language);
}
```

---

## III. USDA API Integration

### 3.1 USDA FoodData Central API

USDA provides FDC (Food Data Central) API: https://fdc.nal.usda.gov/api-guide.html

**Get API Key:** https://fdc.nal.usda.gov/api-key-signup.html

**Endpoint:**
```
GET https://api.nal.usda.gov/fdc/v1/foods/search
  ?query=apple
  &pageSize=25
  &pageNumber=1
  &api_key=YOUR_API_KEY
```

**Response Example:**
```json
{
  "foods": [
    {
      "fdc_id": "167568",
      "description": "APPLE, FUJI, RAW",
      "data_type": "Survey (FNDDS)",
      "food_nutrients": [
        {
          "nutrient_id": 1008,
          "nutrient_name": "Energy",
          "value": 61,
          "unit_name": "kcal"
        },
        {
          "nutrient_id": 1003,
          "nutrient_name": "Protein",
          "value": 0.26,
          "unit_name": "g"
        }
      ]
    }
  ],
  "pageNumber": 1,
  "totalPages": 4
}
```

### 3.2 USDA Nutrient ID Mapping

Map USDA nutrient IDs to our schema:

| Nutrient | USDA ID | Our Field | Unit |
|----------|---------|-----------|------|
| Energy | 1008 | calories | kcal |
| Protein | 1003 | proteinG | g |
| Fat (Total) | 1004 | fatG | g |
| Carbohydrate | 1005 | carbsG | g |
| Fiber | 1079 | fiberG | g |
| Sugars | 2000 | sugarG | g |
| Sodium | 1093 | sodiumMg | mg |
| Fat (Saturated) | 1258 | saturatedFatG | g |

### 3.3 USDA Data Fetcher Service

```java
// USDAFoodFetcher.java
@Service
@RequiredArgsConstructor
@Slf4j
public class USDAFoodFetcher {
    
    private final RestTemplate restTemplate;
    
    @Value("${usda.api.key}")
    private String apiKey;
    
    @Value("${usda.api.base-url:https://api.nal.usda.gov/fdc/v1}")
    private String baseUrl;
    
    private static final Map<Integer, String> NUTRIENT_MAPPING = Map.ofEntries(
        Map.entry(1008, "calories"),
        Map.entry(1003, "proteinG"),
        Map.entry(1004, "fatG"),
        Map.entry(1005, "carbsG"),
        Map.entry(1079, "fiberG"),
        Map.entry(2000, "sugarG"),
        Map.entry(1093, "sodiumMg"),
        Map.entry(1258, "saturatedFatG")
    );
    
    /**
     * Fetch foods from USDA API
     */
    public List<USDAFood> searchFoods(String query, int pageSize, int pageNumber) {
        String url = String.format(
            "%s/foods/search?query=%s&pageSize=%d&pageNumber=%d&api_key=%s",
            baseUrl, URLEncoder.encode(query), pageSize, pageNumber, apiKey
        );
        
        try {
            USDASearchResponse response = restTemplate.getForObject(url, USDASearchResponse.class);
            return response.getFoods();
        } catch (Exception e) {
            log.error("USDA fetch failed for query: {}", query, e);
            throw new RuntimeException("Failed to fetch from USDA", e);
        }
    }
    
    /**
     * Convert USDA food to our Food entity
     */
    public Food convertUSDAFood(USDAFood usdaFood) {
        Food food = new Food();
        food.setFdcId(usdaFood.getFdcId());
        food.setNameEn(usdaFood.getDescription().toUpperCase());
        food.setDescription(usdaFood.getDescription());
        food.setCategory(classifyCategory(usdaFood.getDescription()));
        food.setFoodState(extractFoodState(usdaFood.getDescription()));
        
        // Extract nutrition
        FoodNutrition nutrition = new FoodNutrition();
        nutrition.setFood(food);
        nutrition.setQualityScore(new BigDecimal("0.8")); // Default
        
        for (USDANutrient nutrient : usdaFood.getFoodNutrients()) {
            String field = NUTRIENT_MAPPING.get(nutrient.getNutrientId());
            if (field != null) {
                setNutritionField(nutrition, field, nutrient.getValue());
            }
        }
        
        food.setNutrition(nutrition);
        return food;
    }
    
    private String classifyCategory(String description) {
        String desc = description.toUpperCase();
        if (desc.contains("VEGETABLE") || desc.contains("BROCCOLI") || desc.contains("CARROT")) return "VEGETABLE";
        if (desc.contains("FRUIT") || desc.contains("APPLE") || desc.contains("BANANA")) return "FRUIT";
        if (desc.contains("CHICKEN") || desc.contains("BEEF") || desc.contains("PORK")) return "MEAT";
        if (desc.contains("GRAIN") || desc.contains("RICE") || desc.contains("WHEAT")) return "GRAIN";
        return "OTHER";
    }
    
    private String extractFoodState(String description) {
        String desc = description.toUpperCase();
        if (desc.contains("RAW")) return "RAW";
        if (desc.contains("COOKED")) return "COOKED";
        if (desc.contains("FRIED")) return "FRIED";
        if (desc.contains("BAKED")) return "BAKED";
        if (desc.contains("ROASTED")) return "ROASTED";
        return "UNKNOWN";
    }
    
    private void setNutritionField(FoodNutrition nutrition, String field, BigDecimal value) {
        try {
            var method = FoodNutrition.class.getDeclaredMethod("set" + 
                field.substring(0, 1).toUpperCase() + field.substring(1), BigDecimal.class);
            method.invoke(nutrition, value);
        } catch (Exception e) {
            log.warn("Failed to set nutrition field: {}", field, e);
        }
    }
}

// USDA DTOs
@Data
class USDASearchResponse {
    private List<USDAFood> foods;
    private int pageNumber;
    private int totalPages;
}

@Data
class USDAFood {
    private String fdcId;
    private String description;
    private String dataType;
    private List<USDANutrient> foodNutrients;
}

@Data
class USDANutrient {
    private Integer nutrientId;
    private String nutrientName;
    private BigDecimal value;
    private String unitName;
}
```

---

## IV. Data Validation

### 4.1 Calorie Consistency Check

Validate: `4P + 4C + 9F ≈ kcal` (within 15% tolerance)

```java
// CalorieValidator.java
public class CalorieValidator {
    
    public static ValidationResult validate(FoodNutrition nutrition) {
        ValidationResult result = new ValidationResult();
        
        if (nutrition.getCalories() == null) {
            result.setValid(true);
            result.setMessage("No calories to validate");
            return result;
        }
        
        BigDecimal protein = nutrition.getProteinG() != null ? nutrition.getProteinG() : BigDecimal.ZERO;
        BigDecimal carbs = nutrition.getCarbsG() != null ? nutrition.getCarbsG() : BigDecimal.ZERO;
        BigDecimal fat = nutrition.getFatG() != null ? nutrition.getFatG() : BigDecimal.ZERO;
        
        // Atwater factors
        BigDecimal theoretical = protein.multiply(new BigDecimal("4"))
            .add(carbs.multiply(new BigDecimal("4")))
            .add(fat.multiply(new BigDecimal("9")));
        
        BigDecimal actual = nutrition.getCalories();
        
        if (theoretical.compareTo(BigDecimal.ZERO) == 0) {
            result.setValid(true);
            return result;
        }
        
        BigDecimal deviation = actual.subtract(theoretical).abs()
            .divide(theoretical, 4, RoundingMode.HALF_UP);
        
        boolean valid = deviation.compareTo(new BigDecimal("0.15")) <= 0;
        
        result.setValid(valid);
        result.setDeviation(deviation.doubleValue());
        result.setMessage(String.format(
            "Calories: actual=%.1f, theoretical=%.1f, deviation=%.1f%%",
            actual, theoretical, deviation.multiply(new BigDecimal("100"))
        ));
        
        return result;
    }
}

@Data
class ValidationResult {
    private boolean valid;
    private double deviation;
    private String message;
}
```

### 4.2 Extreme Value Detection

```java
public class ExtremeValueValidator {
    
    public static List<String> validate(FoodNutrition nutrition) {
        List<String> warnings = new ArrayList<>();
        
        if (nutrition.getCalories() != null && nutrition.getCalories().compareTo(new BigDecimal("950")) > 0) {
            warnings.add("Extremely high calories: " + nutrition.getCalories());
        }
        
        if (nutrition.getProteinG() != null && nutrition.getProteinG().compareTo(new BigDecimal("95")) > 0) {
            warnings.add("Extremely high protein: " + nutrition.getProteinG());
        }
        
        // Protein + Fat + Carbs should be ≤ 100
        BigDecimal total = (nutrition.getProteinG() != null ? nutrition.getProteinG() : BigDecimal.ZERO)
            .add(nutrition.getFatG() != null ? nutrition.getFatG() : BigDecimal.ZERO)
            .add(nutrition.getCarbsG() != null ? nutrition.getCarbsG() : BigDecimal.ZERO);
        
        if (total.compareTo(new BigDecimal("105")) > 0) {
            warnings.add("Macros exceed 100g/100g: " + total);
        }
        
        return warnings;
    }
}
```

---

## V. Batch Import Service

### 5.1 Import Job

```java
// FoodImportService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class FoodImportService {
    
    private final FoodRepository foodRepository;
    private final USDAFoodFetcher fetcher;
    
    /**
     * Import foods from USDA
     */
    @Transactional
    public ImportResult importFoods(String query, int maxFoods) {
        ImportResult result = new ImportResult();
        result.setQuery(query);
        
        int pageSize = 100;
        int pageNumber = 1;
        int imported = 0;
        
        while (imported < maxFoods) {
            try {
                List<USDAFood> foods = fetcher.searchFoods(query, pageSize, pageNumber);
                
                if (foods.isEmpty()) break;
                
                for (USDAFood usdaFood : foods) {
                    if (imported >= maxFoods) break;
                    
                    try {
                        // Check if already imported
                        if (foodRepository.findByFdcId(usdaFood.getFdcId()).isPresent()) {
                            result.incrementSkipped();
                            continue;
                        }
                        
                        Food food = fetcher.convertUSDAFood(usdaFood);
                        
                        // Validate
                        List<String> warnings = ExtremeValueValidator.validate(food.getNutrition());
                        CalorieValidator.ValidationResult calorieCheck = 
                            CalorieValidator.validate(food.getNutrition());
                        
                        if (!calorieCheck.isValid()) {
                            food.getNutrition().setQualityScore(new BigDecimal("0.6"));
                            result.addWarning("Calorie mismatch for " + food.getNameEn());
                        }
                        
                        if (!warnings.isEmpty()) {
                            food.getNutrition().setQualityScore(new BigDecimal("0.7"));
                            result.addWarnings(warnings);
                        }
                        
                        foodRepository.save(food);
                        result.incrementSucceeded();
                        imported++;
                        
                        if (imported % 50 == 0) {
                            log.info("Imported {} foods for query: {}", imported, query);
                        }
                        
                    } catch (Exception e) {
                        log.error("Failed to import food: {}", usdaFood.getFdcId(), e);
                        result.incrementFailed();
                    }
                }
                
                pageNumber++;
                
            } catch (Exception e) {
                log.error("Error importing page {}", pageNumber, e);
                break;
            }
        }
        
        log.info("Import complete for '{}': {} imported, {} skipped, {} failed",
            query, result.getSucceeded(), result.getSkipped(), result.getFailed());
        
        return result;
    }
}

@Data
class ImportResult {
    private String query;
    private int succeeded;
    private int skipped;
    private int failed;
    private List<String> warnings = new ArrayList<>();
    
    public void incrementSucceeded() { succeeded++; }
    public void incrementSkipped() { skipped++; }
    public void incrementFailed() { failed++; }
    public void addWarning(String msg) { warnings.add(msg); }
    public void addWarnings(List<String> msgs) { warnings.addAll(msgs); }
}
```

### 5.2 Admin Controller for Import

```java
// AdminFoodController.java
@RestController
@RequestMapping("/api/v1/admin/foods")
@RequiredArgsConstructor
@Slf4j
public class AdminFoodController {
    
    private final FoodImportService importService;
    private final FoodRepository foodRepository;
    
    /**
     * POST /api/v1/admin/foods/import?query=apple&maxFoods=100
     */
    @PostMapping("/import")
    public ResponseEntity<FoodImportService.ImportResult> importFoods(
            @RequestParam String query,
            @RequestParam(defaultValue = "100") int maxFoods) {
        
        log.info("Starting food import for query: {}, maxFoods: {}", query, maxFoods);
        
        FoodImportService.ImportResult result = importService.importFoods(query, maxFoods);
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * GET /api/v1/admin/foods/count
     */
    @GetMapping("/count")
    public ResponseEntity<Long> getFoodCount() {
        return ResponseEntity.ok(foodRepository.count());
    }
}
```

---

## VI. Food Search Service

### 6.1 Service Layer

```java
// FoodSearchService.java
@Service
@RequiredArgsConstructor
@Slf4j
public class FoodSearchService {
    
    private final FoodRepository foodRepository;
    
    /**
     * Search foods by name
     */
    public List<Food> searchByName(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        
        return foodRepository.findByNameEnIgnoreCaseContaining(query);
    }
    
    /**
     * Search foods by alias
     */
    public List<Food> searchByAlias(String alias) {
        if (alias == null || alias.trim().isEmpty()) {
            return Collections.emptyList();
        }
        
        return foodRepository.searchByAlias(alias);
    }
    
    /**
     * Get food by FDC ID
     */
    public Optional<Food> getFoodByFdcId(String fdcId) {
        return foodRepository.findByFdcId(fdcId);
    }
    
    /**
     * Get top matches by combining name and alias search
     */
    public List<Food> getTopMatches(String query, int limit) {
        Set<Food> matches = new HashSet<>();
        
        matches.addAll(searchByName(query));
        matches.addAll(searchByAlias(query));
        
        return matches.stream().limit(limit).toList();
    }
}
```

### 6.2 API Endpoint

```java
// FoodController.java
@RestController
@RequestMapping("/api/v1/foods")
@RequiredArgsConstructor
public class FoodController {
    
    private final FoodSearchService searchService;
    
    /**
     * GET /api/v1/foods/search?query=apple&limit=10
     */
    @GetMapping("/search")
    public ResponseEntity<List<FoodSearchResponse>> search(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {
        
        List<Food> foods = searchService.getTopMatches(query, limit);
        
        return ResponseEntity.ok(foods.stream()
            .map(this::toResponse)
            .toList());
    }
    
    /**
     * GET /api/v1/foods/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<FoodSearchResponse> getFood(@PathVariable Long id) {
        Food food = foodRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Food not found"));
        
        return ResponseEntity.ok(toResponse(food));
    }
    
    private FoodSearchResponse toResponse(Food food) {
        return FoodSearchResponse.builder()
            .id(food.getId())
            .fdcId(food.getFdcId())
            .nameEn(food.getNameEn())
            .nameZh(food.getNameZh())
            .category(food.getCategory())
            .foodState(food.getFoodState())
            .nutrition(FoodNutritionResponse.builder()
                .calories(food.getNutrition().getCalories().doubleValue())
                .protein(food.getNutrition().getProteinG().doubleValue())
                .carbs(food.getNutrition().getCarbsG().doubleValue())
                .fat(food.getNutrition().getFatG().doubleValue())
                .fiber(food.getNutrition().getFiberG() != null ? 
                    food.getNutrition().getFiberG().doubleValue() : null)
                .qualityScore(food.getNutrition().getQualityScore().doubleValue())
                .build())
            .build();
    }
}

@Data
@Builder
class FoodSearchResponse {
    private Long id;
    private String fdcId;
    private String nameEn;
    private String nameZh;
    private String category;
    private String foodState;
    private FoodNutritionResponse nutrition;
}

@Data
@Builder
class FoodNutritionResponse {
    private Double calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    private Double fiber;
    private Double qualityScore;
}
```

---

## VII. Integration with Existing Flow

### 7.1 Update NutritionTrackingService

When logging a meal, try food database first:

```java
// In NutritionTrackingService.logMeal()

public MealLog logMeal(MealLog meal) {
    
    // If nutrition values not provided, try to fetch from database
    if (meal.getCalories() == null && meal.getRecipeId() != null) {
        Optional<Food> food = foodRepository.findByFdcId(meal.getRecipeId());
        if (food.isPresent()) {
            FoodNutrition nutrition = food.get().getNutrition();
            meal.setCalories(nutrition.getCalories().intValue());
            meal.setProteinGrams(nutrition.getProteinG());
            meal.setCarbsGrams(nutrition.getCarbsG());
            meal.setFatGrams(nutrition.getFatG());
        }
    }
    
    return mealRepository.save(meal);
}
```

### 7.2 Update FoodRecognitionService

Add database fallback:

```java
// In FoodRecognitionService.recognizeFoods()

public FoodRecognitionResult recognizeFoods(MultipartFile image, String provider) {
    
    FoodRecognitionResult result = /* ... analyze with Claude ... */;
    
    // Try to match detected foods with database
    for (NutritionInfo item : result.getItems()) {
        List<Food> dbFoods = foodSearchService.getTopMatches(item.getName(), 1);
        
        if (!dbFoods.isEmpty()) {
            Food matched = dbFoods.get(0);
            FoodNutrition dbNutrition = matched.getNutrition();
            
            // Use database nutrition if available and high quality
            if (dbNutrition.getQualityScore().compareTo(new BigDecimal("0.7")) >= 0) {
                item.setCalories(dbNutrition.getCalories().intValue());
                item.setProtein(dbNutrition.getProteinG().doubleValue());
                item.setCarbs(dbNutrition.getCarbsG().doubleValue());
                item.setFat(dbNutrition.getFatG().doubleValue());
            }
        }
    }
    
    return result;
}
```

---

## VIII. Configuration

### 8.1 application.yml

```yaml
usda:
  api:
    key: ${USDA_API_KEY}
    base-url: https://api.nal.usda.gov/fdc/v1
    
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/aurafitness
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
```

### 8.2 Environment Variables

```bash
USDA_API_KEY=YOUR_API_KEY_FROM_USDA
DB_USERNAME=postgres
DB_PASSWORD=password
```

---

## IX. Implementation Checklist

- [ ] Create database schema (SQL migrations)
- [ ] Create JPA entities (Food, FoodNutrition, FoodAlias)
- [ ] Create repositories
- [ ] Implement USDAFoodFetcher service
- [ ] Implement validation logic
- [ ] Implement FoodImportService
- [ ] Create AdminFoodController for imports
- [ ] Create FoodSearchService
- [ ] Create FoodController for search API
- [ ] Integrate with NutritionTrackingService
- [ ] Update FoodRecognitionService to use database
- [ ] Test end-to-end flow
- [ ] Load initial foods (apple, banana, chicken breast, rice, etc.)

---

## X. Example: Quick Start

```bash
# 1. Get USDA API key from https://fdc.nal.usda.gov/api-key-signup.html

# 2. Set environment variable
export USDA_API_KEY=your_api_key

# 3. Run backend
cd backend && ./gradlew bootRun

# 4. Import foods via curl
curl -X POST "http://localhost:8080/api/v1/admin/usda/foods/import?query=apple&maxFoods=50"

curl -X POST "http://localhost:8080/api/v1/admin/usda/foods/import?query=chicken&maxFoods=50"

curl -X POST "http://localhost:8080/api/v1/admin/usda/foods/import?query=rice&maxFoods=50"

# 5. Check count
curl "http://localhost:8080/api/v1/admin/usda/foods/count"

# 6. Search
curl "http://localhost:8080/api/v1/usda/foods/search?query=apple&limit=5"
```

This is simple, actionable, and directly addresses your current setup.


## XI. Data Freshness, Versioning & Ops

- Refresh SLA: run at least one incremental refresh daily; raise an alert if data is more than 48 hours stale.
- Source versioning: store FDC package metadata (publish date, download time, checksum, record count) and keep the last five snapshots for replay.
- Deprecation handling: honor USDA deprecated/withdrawn flags using soft delete and write an audit entry for removals.
- Monitoring & alerts: track ingestion success/failure rate, processing time, download size/time, and schema drift; alert on sustained anomalies.

## XII. Sync Implementation Playbook

- Full load:
  - Download the latest full dataset and import into the `usda_food*` tables.
  - Snapshot the database before the load and persist source metadata after the load.
- Incremental load:
  - Detect new package versions, download the diff, and apply to `usda_food*`.
  - Rate limit to avoid throttling; retry 429/5xx with exponential backoff (start 1s, max 5 attempts) and write failed rows to a dead-letter queue for replay.
  - Allow partial failures without blocking the batch and emit a summary report.
  - Support replay by combining the previous snapshot with the differential package.
