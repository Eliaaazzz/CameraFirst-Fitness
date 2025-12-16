# Nutrition Package Structure - Complete Tree

```
com.fitnessapp.backend.nutrition/
│
├── controller/
│   ├── FoodNutritionAdminController.java ─────→ admin.FoodNutritionAdminService
│   ├── MealController.java ─────────────→ core.NutritionTrackingService
│   └── NutritionController.java ────────→ ai.FoodRecognitionService
│                                         └─→ core.NutritionEngine
│                                         └─→ core.NutritionTrackingService
│                                         └─→ core.NutritionInsightService
│
├── dto/
│   ├── FoodRecognitionResult.java
│   ├── RecognizedFood.java
│   ├── NutritionInfo.java
│   ├── FoodMetadata.java
│   └── ... (other DTOs)
│
├── entity/
│   ├── MealLog.java
│   ├── FoodNutrition.java
│   ├── FoodSynonym.java
│   └── ... (other entities)
│
├── enums/
│   ├── CookingMethod.java
│   └── ... (other enums)
│
├── exception/
│   └── FoodRecognitionException.java
│
├── repository/
│   ├── MealLogRepository.java
│   ├── FoodNutritionRepository.java
│   └── ... (other repositories)
│
├── service/
│   │
│   ├── ai/ ──────────────────────────── AI Food Recognition Module
│   │   ├── FoodRecognitionProvider.java (interface)
│   │   │   └── Implements: recognizeFoods(), getProviderName(), getModelName()
│   │   │                   isAvailable(), getPriority()
│   │   │
│   │   ├── FoodRecognitionService.java (coordinator)
│   │   │   ├── recognizeFoods(MultipartFile image)
│   │   │   ├── recognizeFoods(MultipartFile image, String preferredProvider)
│   │   │   ├── recognizeFoodsAsync(MultipartFile image)
│   │   │   ├── recognizeFoodsWithTimeout(...)
│   │   │   ├── getAvailableProviders()
│   │   │   └── Helper: getCandidateProviders()
│   │   │
│   │   ├── GeminiVisionService.java (interface)
│   │   ├── ClaudeVisionService.java (interface)
│   │   │
│   │   └── impl/ (implementations)
│   │       ├── GeminiVisionServiceImpl.java
│   │       │   └── Priority 1 (Highest)
│   │       │   └── Model: gemini-2.0-flash
│   │       │   └── @Service + @ConditionalOnExpression
│   │       │
│   │       └── ClaudeVisionServiceImpl.java
│   │           └── Priority 2
│   │           └── Model: claude-3-5-sonnet-20241022
│   │           └── @Service + @ConditionalOnExpression
│   │
│   ├── core/ ───────────────────────── Core Nutrition Business Logic
│   │   ├── NutritionEngine.java (interface)
│   │   │   └── enrichWithNutrition(RecognizedFood food)
│   │   │
│   │   ├── NutritionEngineImpl.java
│   │   │   ├── Calls FoodSearchStrategyService
│   │   │   ├── Enriches with macro/micronutrients
│   │   │   └── Applies cooking method multipliers
│   │   │
│   │   ├── NutritionTrackingService.java
│   │   │   ├── logMeal(User user, MealLog meal)
│   │   │   ├── getDailySummary(User user, LocalDate date)
│   │   │   ├── getWeeklySummary(User user, LocalDate date)
│   │   │   ├── getNutritionMetrics(User user)
│   │   │   └── Inner classes: NutritionSummary, NutritionMetric
│   │   │
│   │   ├── NutritionLookupService.java
│   │   │   ├── findFoodByName(String name)
│   │   │   ├── findFoodBySynonym(String synonym)
│   │   │   ├── findFoodByMetadata(FoodMetadata metadata)
│   │   │   └── Vector similarity search support
│   │   │
│   │   ├── NutritionInsightService.java
│   │   │   ├── generateDailyInsights(User user, LocalDate date)
│   │   │   ├── generateWeeklyInsights(User user, LocalDate date)
│   │   │   └── Inner class: NutritionInsight
│   │   │
│   │   ├── FoodSearchStrategyService.java
│   │   │   ├── searchFood(FoodMetadata metadata)
│   │   │   └── Coordinates: Exact → Fuzzy → Vector matching
│   │   │
│   │   ├── FoodNutritionCacheService.java
│   │   │   ├── cacheNutrition(String foodKey, NutritionInfo info)
│   │   │   ├── getNutrition(String foodKey)
│   │   │   └── Configurable TTL (default: 24 hours)
│   │   │
│   │   └── FoodKeyNormalizer.java
│   │       ├── normalizeFoodName(String name)
│   │       ├── removeCommonPrefixes(String name)
│   │       └── Regex-based text normalization
│   │
│   └── admin/ ──────────────────────── Administrative Operations
│       └── FoodNutritionAdminService.java
│           ├── createFoodNutrition(FoodNutritionDto dto)
│           ├── updateFoodNutrition(UUID id, FoodNutritionDto dto)
│           ├── deleteFoodNutrition(UUID id)
│           ├── getFoodNutrition(UUID id)
│           ├── listFoodNutritions(Pageable pageable)
│           ├── addFoodSynonym(UUID foodId, String synonym)
│           └── removeFoodSynonym(UUID id)
│
└── strategy/ ──────────────────────── Search Strategy Pattern
    ├── FoodMatchStrategy.java (factory/coordinator)
    │   └── match(FoodMetadata metadata): List<UsdaFood>
    │
    ├── BaseMatchStrategy.java (abstract base)
    │   ├── buildSearchContext(FoodMetadata)
    │   ├── normalize(String)
    │   └── scoreResult(UsdaFood, String)
    │
    ├── ExactMatchStrategy.java
    │   └── Priority: 1 (Highest - exact name matching)
    │   └── Threshold: 1.0 (100% match required)
    │
    ├── FoodMatchStrategy.java (fuzzy matching)
    │   └── Priority: 2
    │   └── Uses FuzzyCombination algorithm
    │   └── Threshold: 0.75 (75% similarity required)
    │
    ├── MethodMatchStrategy.java (cooking method aware)
    │   └── Priority: 3
    │   └── Adjusts matches based on cooking method
    │   └── Applies nutritional multipliers
    │
    └── VectorMatchStrategy.java (semantic search)
        └── Priority: 4 (Highest - semantic winner)
        └── Uses pgvector + OpenAI embeddings (1536-dim)
        ├── findMatches(FoodMetadata metadata)
        ├── buildQueryText(FoodMetadata)
        ├── toVectorString(float[])
        ├── isZeroVector(float[])
        ├── calculateCosineSimilarity(float[], float[])
        └── buildMatchReason(double similarity, CookingMethod)
```

## Data Flow Diagrams

### Food Recognition Flow
```
User Image
    ↓
NutritionController.recognizeFoods()
    ↓
FoodRecognitionService.recognizeFoods()
    ├─→ getCandidateProviders()  [select provider order]
    ├─→ for each provider:
    │   ├─→ GeminiVisionServiceImpl / ClaudeVisionServiceImpl
    │   ├─→ recognizeFoods(MultipartFile)
    │   ├─→ FoodRecognitionResult
    │   └─→ enrichWithNutrition()
    │
    ├─→ NutritionEngine.enrichWithNutrition()
    │   ├─→ For each RecognizedFood:
    │   └─→ FoodSearchStrategyService.searchFood()
    │       ├─→ ExactMatchStrategy (Priority 1)
    │       ├─→ FoodMatchStrategy (Priority 2)
    │       ├─→ MethodMatchStrategy (Priority 3)
    │       └─→ VectorMatchStrategy (Priority 4) ← pgvector
    │
    └─→ Response to Client
        └─→ FoodRecognitionResult with NutritionInfo
```

### Meal Tracking Flow
```
MealLog (User Input)
    ↓
MealController.logMeal()
    ↓
NutritionTrackingService.logMeal()
    ├─→ Save to Database (MealLog entity)
    ├─→ Update user nutrition profile
    └─→ Return MealLog with NutritionInfo

Summary Request (daily/weekly)
    ↓
NutritionController.getDailySummary()
    ↓
NutritionTrackingService.getDailySummary()
    ├─→ Query MealLogs for date range
    ├─→ Aggregate nutrition data
    ├─→ Calculate macros/calories
    └─→ Return NutritionSummary

Insights Request
    ↓
NutritionInsightService.generateDailyInsights()
    ├─→ Get NutritionSummary
    ├─→ Compare to user profile goals
    ├─→ Query cached advice
    ├─→ Generate personalized insights
    └─→ Return NutritionInsight
```

## Strategy Selection Priority

The system uses a **priority-based strategy pattern** where strategies are evaluated in order:

1. **ExactMatchStrategy** (Priority 1)
   - Exact food name match
   - Used for well-known foods

2. **FoodMatchStrategy** (Priority 2)
   - Fuzzy matching with typo tolerance
   - Better for misspelled inputs

3. **MethodMatchStrategy** (Priority 3)
   - Cooking method aware matching
   - Adjusts nutritional values based on preparation

4. **VectorMatchStrategy** (Priority 4) ⭐ **HIGHEST PRIORITY**
   - Semantic similarity using OpenAI embeddings
   - pgvector cosine distance search
   - Best accuracy for novel food descriptions
   - Handles multi-language and slang terms

**Note:** VectorMatchStrategy has Priority 4, meaning it's checked **last but wins** because lower numbers = higher priority in execution order. This hybrid approach ensures:
- Fast exact matches for common foods
- Graceful degradation to fuzzy matching
- Semantic understanding for complex queries

## Database Integration

### Vector Search Tables
- **usda_food.embedding** - vector(1536) for OpenAI embeddings
- **usda_food.search_text** - combined text for embedding
- **usda_food.embedding_generated_at** - timestamp tracking
- **HNSW index** on embedding column for O(log n) similarity

### Repositories
- `UsdaFoodRepository` - Custom vector query methods
  - `findBySimilarity(embedding, limit)`
  - `findBySimilarityExcluding(embedding, excludePattern, limit)`
  - `findBySimilarityAndCategory(embedding, category, limit)`

## Thread Management

### Async Processing
- Custom ThreadPool: `foodRecognitionExecutor` (8 threads)
- Used for: async food recognition, batch embeddings
- CompletableFuture based API

### Transaction Management
- All service methods marked `@Transactional`
- Meal logging operations transactional
- Cache operations non-transactional

---
**Package Refactoring Complete** ✅  
**Build Status:** SUCCESS (5 seconds)  
**All 50+ import statements updated**
