# Recipe Import Verification Report
**Date**: October 19, 2025  
**Status**: ⚠️ NEEDS ATTENTION

## Executive Summary

Your recipe import system has **TWO independent importers**:
1. **RecipeCuratorService** - API-based importer (Spoonacular)
2. **RecipeImportService** - CSV file-based importer

Both importers have **critical issues** that need to be fixed before they can work reliably.

---

## 🔍 Importer Analysis

### 1. RecipeCuratorService (API-based)
**Location**: `src/main/java/com/fitnessapp/backend/recipe/RecipeCuratorService.java`  
**Endpoint**: `POST /api/admin/import/recipes/curated`

#### ✅ Strengths
- Comprehensive quality filtering (ready time, step count, popularity)
- Proper transaction management with `TransactionTemplate`
- Includes EntityManager flush and clear operations
- Rich data extraction (steps, nutrition, ingredients)
- Good error handling and logging

#### ❌ Critical Issues Found

**Issue #1: Missing @Transactional Annotation**
```java
public RecipeCurationResult curateTopRecipes() {
    // This method calls transactionTemplate.executeWithoutResult()
    // but the outer method itself is not transactional
```
**Impact**: Recipe entities and RecipeIngredient relationships may not be persisted in same transaction  
**Fix**: Add `@Transactional` to `curateTopRecipes()` method

**Issue #2: Cascade Persistence Not Working**
```java
private void persistRecipe(SearchResult summary, String primaryIngredient) {
    recipe = recipeRepository.save(recipe);  // First save
    attachIngredients(recipe, ...);          // Add ingredients
    recipeRepository.save(recipe);           // Second save - but ingredients collection not merged
}
```
**Impact**: RecipeIngredient relationships might not be persisted  
**Root Cause**: Adding to `recipe.getIngredients()` collection after first save doesn't trigger cascade  
**Fix**: Either use `EntityManager.merge()` or persist ingredients directly

**Issue #3: Ingredient Deduplication Problem**
```java
// In attachIngredients():
names.add(normalizeIngredient(primaryIngredient));  // LinkedHashSet prevents duplicates
// BUT: If "chicken" is primary and also in extendedIngredients, it gets added twice
```
**Impact**: Duplicate RecipeIngredient entries with same ingredient  
**Fix**: Already using LinkedHashSet, but need to verify no duplicate RecipeIngredient IDs

**Issue #4: API Quota Not Checked Proactively**
```java
for (String ingredient : CURATED_INGREDIENTS) {
    try {
        // Makes API call without checking quota first
    } catch (Exception ex) {
        if (ex.getMessage() != null && ex.getMessage().contains("402")) {
            log.warn("💳 API quota exceeded. Stopping further requests.");
            break;
        }
    }
}
```
**Impact**: Wastes quota points on failed requests  
**Fix**: Check quota BEFORE making requests, cache quota status

---

### 2. RecipeImportService (CSV-based)
**Location**: `src/main/java/com/fitnessapp/backend/importer/RecipeImportService.java`  
**Endpoint**: `POST /api/admin/import/recipes?file=<path>`

#### ✅ Strengths
- Simple CSV parsing logic
- Proper ingredient lookup/create pattern
- Good progress logging (every 5 recipes)

#### ❌ Critical Issues Found

**Issue #1: NO Transaction Management**
```java
public int importRecipesFromCsv(String filePath) {
    // NO @Transactional annotation
    // NO TransactionTemplate usage
    // Each save() is auto-committed individually
```
**Impact**: 
- Recipe saved, then ingredients added, then recipe saved again - 3 separate commits
- If ingredient attachment fails, you get orphaned recipes with no ingredients
- Database can have inconsistent state

**Fix**: Add `@Transactional` annotation to method

**Issue #2: Duplicate Recipe Persistence**
```java
r = recipeRepo.save(r);  // FIRST save - gets ID

for (String name : topIngredients) {
    // ... create RecipeIngredient and add to r.ingredients
}
recipeRepo.save(r);  // SECOND save - but ingredients already added to managed entity
```
**Impact**: 
- Inefficient - saves recipe twice
- Second save may not actually persist ingredients (they're already in managed entity)
- CASCADE not explicitly triggered

**Fix**: Use single save with proper cascade, OR use EntityManager.merge()

**Issue #3: Weak CSV Parsing**
```java
List<String> cols = Arrays.stream(row.split(","))
    .map(String::trim)
    .collect(Collectors.toList());
```
**Impact**:
- Fails if any cell contains a comma (even if quoted)
- No proper CSV escaping handling
- Will silently skip malformed rows

**Example Breaking Data**:
```csv
Spoonacular,123,"Chicken, Rice & Beans",https://...,30,easy,...
          ^^^^^^^ This comma will break the parser! ^^^^^^^
```

**Fix**: Use proper CSV library (OpenCSV, Apache Commons CSV)

**Issue #4: Spoonacular API Calls Not Tested**
```java
private Map<String, JsonNode> fetchRecipeDetails(String apiSource, String recipeId) {
    // Only fetches if apiSource == "Spoonacular" AND key is set
    // BUT: No error handling for quota exceeded
    // Returns empty map if any error occurs
}
```
**Impact**: 
- Silently fails if API quota exceeded
- Recipes imported without steps/nutrition data
- No way to tell which recipes have incomplete data

**Fix**: 
- Return Optional or throw exception on quota errors
- Log warning for incomplete data
- Consider marking recipes as "partial" in database

**Issue #5: Hardcoded File Path**
```java
public int importRecipesFromCsv(String filePath) {
    List<String> lines = Files.readAllLines(Path.of(filePath));
    // What if file doesn't exist?
    // What if path is outside project directory (security)?
    // No file size validation (could crash with OOM on huge files)
```
**Impact**: 
- Security risk: users could provide paths like `/etc/passwd`
- Memory risk: large CSV files load entirely into memory
- No validation of file format

**Fix**: 
- Validate file path is within allowed directory
- Stream parse CSV instead of loading all lines
- Add file size limits

---

## 🔧 Required Fixes

### Priority 1: Transaction Management (CRITICAL)

**RecipeCuratorService.java**:
```java
@Transactional  // ADD THIS
public RecipeCurationResult curateTopRecipes() {
    // existing code...
}
```

**RecipeImportService.java**:
```java
@Transactional  // ADD THIS
public int importRecipesFromCsv(String filePath) {
    // existing code...
}
```

### Priority 2: Fix Cascade Persistence

**RecipeCuratorService.java** - Replace `persistRecipe()` method:
```java
private void persistRecipe(SearchResult summary, String primaryIngredient) {
    JsonNode stepsJson = toStepsJson(summary);
    JsonNode nutritionJson = toNutritionJson(summary, primaryIngredient);

    Recipe recipe = Recipe.builder()
            .title(summary.title())
            .imageUrl(summary.image())
            .timeMinutes(summary.readyInMinutes())
            .difficulty("easy")
            .steps(stepsJson)
            .swaps(objectMapper.createArrayNode())
            .nutritionSummary(nutritionJson)
            .build();

    // Attach ingredients BEFORE saving
    Set<String> names = new LinkedHashSet<>();
    if (StringUtils.hasText(primaryIngredient)) {
        names.add(normalizeIngredient(primaryIngredient));
    }
    if (!CollectionUtils.isEmpty(summary.extendedIngredients())) {
        summary.extendedIngredients().stream()
                .map(ExtendedIngredient::name)
                .filter(StringUtils::hasText)
                .map(this::normalizeIngredient)
                .limit(5)
                .forEach(names::add);
    }

    for (String name : names) {
        Ingredient ingredient = ingredientRepository.findByName(name)
                .orElseGet(() -> ingredientRepository.save(Ingredient.builder().name(name).build()));
        RecipeIngredient relation = RecipeIngredient.builder()
                .id(new RecipeIngredientId(null, ingredient.getId()))  // Recipe ID will be set after save
                .recipe(recipe)
                .ingredient(ingredient)
                .quantity(null)
                .unit(null)
                .build();
        recipe.getIngredients().add(relation);
    }

    // Single save with cascade
    recipeRepository.save(recipe);
}
```

**RecipeImportService.java** - Remove duplicate save:
```java
// Build recipe with all ingredients FIRST
Recipe r = Recipe.builder()
    .title(title)
    .imageUrl(imageUrl)
    .timeMinutes(timeMinutes)
    .difficulty(difficulty)
    .steps(steps)
    .swaps(swaps)
    .nutritionSummary(nutrition)
    .build();

// Attach ingredients to unsaved recipe
for (String name : topIngredients) {
    Ingredient ing = ingredientRepo.findByName(name)
        .orElseGet(() -> ingredientRepo.save(Ingredient.builder().name(name).build()));
    RecipeIngredient ri = RecipeIngredient.builder()
        .id(new RecipeIngredientId(null, ing.getId()))  // Will be set after save
        .recipe(r)
        .ingredient(ing)
        .quantity(null)
        .unit(null)
        .build();
    r.getIngredients().add(ri);
}

// Single save
recipeRepo.save(r);  // ONLY SAVE ONCE
```

### Priority 3: Use Proper CSV Parser

**RecipeImportService.java** - Add dependency and fix parsing:

1. Add to `build.gradle.kts`:
```kotlin
implementation("com.opencsv:opencsv:5.9")
```

2. Update import method:
```java
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;

public int importRecipesFromCsv(String filePath) {
    // Validate file path
    Path csvPath = Path.of(filePath);
    if (!csvPath.startsWith(System.getProperty("user.dir"))) {
        throw new SecurityException("File path must be within project directory");
    }
    if (!Files.exists(csvPath)) {
        throw new IllegalArgumentException("File not found: " + filePath);
    }

    AtomicInteger counter = new AtomicInteger(0);
    try (CSVReader reader = new CSVReader(new FileReader(csvPath.toFile()))) {
        List<String[]> rows = reader.readAll();
        if (rows.isEmpty()) return 0;
        
        // Skip header row
        for (int i = 1; i < rows.size(); i++) {
            String[] cols = rows.get(i);
            // ... rest of parsing logic
        }
    } catch (IOException | CsvException e) {
        log.error("Failed to import recipes from {}", filePath, e);
        return counter.get();
    }
}
```

---

## 🧪 Testing Checklist

### Pre-Testing Setup
- [ ] Start Docker: `open -a Docker` (wait until running)
- [ ] Verify PostgreSQL: `docker ps | grep postgres`
- [ ] Check database connection: `docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"`
- [ ] Set API key: `export SPOONACULAR_API_KEY="c06acb6339d6428aa8715889da7ce962"`
- [ ] Check API quota: Visit https://spoonacular.com/food-api/console#Dashboard

### Test 1: API-Based Import (RecipeCuratorService)
```bash
# Start application
export SPOONACULAR_API_KEY="c06acb6339d6428aa8715889da7ce962"
java -jar build/libs/fitness-app-0.0.1-SNAPSHOT.jar &
sleep 40

# Test curated recipe import
curl -X POST http://localhost:8080/api/admin/import/recipes/curated \
  -H "Content-Type: application/json" | python3 -m json.tool

# Verify recipes were persisted
docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp \
  -c "SELECT COUNT(*) FROM recipe;"

# Verify ingredients were attached
docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp \
  -c "SELECT COUNT(*) FROM recipe_ingredient;"

# Check sample recipe with ingredients
docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp \
  -c "SELECT r.title, COUNT(ri.ingredient_id) as ingredient_count 
      FROM recipe r 
      LEFT JOIN recipe_ingredient ri ON r.id = ri.recipe_id 
      GROUP BY r.id, r.title 
      LIMIT 5;"
```

### Test 2: CSV-Based Import (RecipeImportService)
```bash
# Create test CSV file
cat > /tmp/test-recipes.csv << 'EOF'
API Source,Recipe ID,Title,Image URL,Time (minutes),Difficulty,Diet Tilt[],Calories,Protein (g),Top 3 Ingredients
Spoonacular,123,Grilled Chicken Salad,https://example.com/img.jpg,25,easy,[],350,30g,chicken|lettuce|tomato
Manual,456,Quick Pasta,https://example.com/pasta.jpg,15,easy,[],450,15g,pasta|tomato|basil
EOF

# Test CSV import
curl -X POST "http://localhost:8080/api/admin/import/recipes?file=/tmp/test-recipes.csv" | python3 -m json.tool

# Verify import
docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp \
  -c "SELECT title, time_minutes FROM recipe WHERE title IN ('Grilled Chicken Salad', 'Quick Pasta');"
```

### Test 3: Transaction Rollback
```bash
# Create CSV with intentional error in middle
cat > /tmp/test-rollback.csv << 'EOF'
API Source,Recipe ID,Title,Image URL,Time (minutes),Difficulty,Diet Tilt[],Calories,Protein (g),Top 3 Ingredients
Manual,789,Good Recipe 1,https://example.com/1.jpg,20,easy,[],300,25g,chicken
Manual,790,INVALID_NO_TIME,https://example.com/2.jpg,INVALID,easy,[],400,20g,beef
Manual,791,Good Recipe 2,https://example.com/3.jpg,30,easy,[],500,35g,salmon
EOF

# Test - should either import all or none
curl -X POST "http://localhost:8080/api/admin/import/recipes?file=/tmp/test-rollback.csv"

# Check if partial import occurred (BAD) or full rollback (GOOD)
docker exec camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp \
  -c "SELECT COUNT(*) FROM recipe WHERE title LIKE 'Good Recipe%';"
# Expected: 0 (transaction rolled back) or 3 (all succeeded)
# If result is 1 or 2: BUG - partial commit occurred!
```

---

## 📊 Expected Results

### After Fixes Applied

| Test | Expected Behavior | Database State |
|------|------------------|----------------|
| API Import (50 recipes) | All 50 recipes persisted with ingredients | `recipe`: 50 rows, `recipe_ingredient`: 150-250 rows |
| CSV Import (2 recipes) | Both recipes with ingredients | `recipe`: +2, `recipe_ingredient`: +4-6 |
| Rollback Test | Either all 3 imported OR none | `recipe_ingredient` count matches recipe count × avg ingredients |
| Duplicate Test | Existing recipe skipped | Same count as before |

### Current State (Before Fixes)

⚠️ **Symptoms You Likely Experience**:
- Recipes imported but `recipe_ingredient` table empty or incomplete
- Application logs show "Imported 50 recipes" but database has 0
- Some recipes missing steps/nutrition JSON
- Duplicate recipes with same title

---

## 🚀 Recommended Action Plan

### Immediate (Today)
1. ✅ Apply transaction annotations (`@Transactional`)
2. ✅ Fix cascade persistence (merge ingredients before save)
3. ✅ Add OpenCSV dependency
4. ⚠️ Start Docker Desktop
5. ⚠️ Rebuild application: `./gradlew clean bootJar`

### Short-term (This Week)
1. Run comprehensive import tests
2. Add integration test for both importers
3. Implement API quota checking
4. Add recipe validation (prevent duplicates)

### Long-term (Next Sprint)
1. Create admin UI for import monitoring
2. Add retry logic for failed API calls
3. Implement bulk import with progress tracking
4. Add data quality metrics dashboard

---

## 💡 Additional Recommendations

### 1. Add Recipe Import Validation Endpoint
```java
@GetMapping("/recipes/validate-csv")
public ResponseEntity<?> validateCsv(@RequestParam("file") String filePath) {
    // Parse CSV and return validation errors without importing
    // Shows: missing columns, invalid data types, duplicate titles
}
```

### 2. Add Import Progress Tracking
```java
@GetMapping("/recipes/import-status")
public ResponseEntity<?> getImportStatus() {
    // Return: total recipes, last import time, pending imports
}
```

### 3. Add Dry-Run Mode
```java
@PostMapping("/recipes/curated")
public ResponseEntity<?> curateRecipes(@RequestParam(defaultValue = "false") boolean dryRun) {
    if (dryRun) {
        // Show what WOULD be imported without actually importing
    }
}
```

---

## 📝 Summary

**Current Status**: ⚠️ Both importers have critical bugs that prevent reliable data persistence

**Root Causes**:
1. Missing transaction management → inconsistent state
2. Incorrect cascade usage → orphaned recipes
3. Weak CSV parsing → data corruption
4. No quota checking → wasted API calls

**Fix Complexity**: 
- Transaction fixes: 5 minutes ⏱️
- Cascade fixes: 15 minutes ⏱️
- CSV parser: 10 minutes ⏱️
- Testing: 30 minutes ⏱️

**Total Estimated Time**: ~1 hour to make both importers production-ready

**Priority**: HIGH - Current importers will cause data integrity issues in production

---

**Next Steps**: 
1. Review this report
2. Apply Priority 1 & 2 fixes
3. Start Docker and test with commands above
4. Report results

Need help with implementation? Let me know which fixer to implement first!
