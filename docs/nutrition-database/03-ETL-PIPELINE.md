# USDA → AuraFitness 营养数据库 ETL 方案

> 版本：1.0.0  
> 日期：2025-12-06  
> 作者：AuraFitness 后端团队

---

## 一、概述

本文档定义从 USDA FoodData Central 导入数据到 AuraFitness 营养数据库的完整 ETL (Extract-Transform-Load) 流程。

### 1.1 数据源

- **来源**: USDA FoodData Central (https://fdc.nal.usda.gov/)
- **格式**: JSON (支持 Foundation Foods, SR Legacy, Survey Foods)
- **更新频率**: 每年 2 次 (4月、10月)

### 1.2 目标

- 导入高质量食物营养数据
- 自动解析食物状态和属性
- 保证数据一致性和可追溯性
- 支持增量更新

---

## 二、USDA 数据结构分析

### 2.1 主要数据集类型

| 数据集 | 说明 | 优先级 | 数据量 |
|--------|------|--------|--------|
| Foundation Foods | 基础食物，数据最精确 | ⭐⭐⭐ | ~2,000 |
| SR Legacy | 标准参考数据库（传统） | ⭐⭐ | ~8,000 |
| Survey Foods (FNDDS) | 调查用食物数据 | ⭐ | ~10,000 |
| Branded Foods | 品牌食物（第三方） | 可选 | ~400,000 |

### 2.2 USDA JSON 结构示例

```json
{
  "fdcId": 171077,
  "dataType": "Foundation",
  "description": "Chicken, breast, meat only, cooked, roasted",
  "foodClass": "FinalFood",
  "publicationDate": "2019-04-01",
  "foodNutrients": [
    {
      "nutrient": {
        "id": 1008,
        "number": "208",
        "name": "Energy",
        "unitName": "kcal"
      },
      "amount": 165.0,
      "dataPoints": 12
    },
    {
      "nutrient": {
        "id": 1003,
        "number": "203",
        "name": "Protein",
        "unitName": "g"
      },
      "amount": 31.02,
      "dataPoints": 12
    },
    {
      "nutrient": {
        "id": 1004,
        "number": "204",
        "name": "Total lipid (fat)",
        "unitName": "g"
      },
      "amount": 3.57,
      "dataPoints": 12
    },
    {
      "nutrient": {
        "id": 1005,
        "number": "205",
        "name": "Carbohydrate, by difference",
        "unitName": "g"
      },
      "amount": 0.0,
      "dataPoints": 12
    }
  ],
  "foodCategory": {
    "id": 5,
    "code": "0500",
    "description": "Poultry Products"
  },
  "foodPortions": [
    {
      "gramWeight": 140.0,
      "portionDescription": "1 breast, bone and skin removed"
    }
  ]
}
```

### 2.3 关键营养素 ID 映射

| USDA Nutrient ID | USDA Number | 名称 | 我们的字段 | 单位 |
|------------------|-------------|------|------------|------|
| 1008 | 208 | Energy | calories | kcal |
| 1003 | 203 | Protein | protein | g |
| 1004 | 204 | Total lipid (fat) | fat | g |
| 1005 | 205 | Carbohydrate, by difference | carbs | g |
| 1079 | 291 | Fiber, total dietary | fiber | g |
| 2000 | 269 | Sugars, total | sugar | g |
| 1093 | 307 | Sodium, Na | sodium | mg |
| 1258 | 606 | Fatty acids, total saturated | saturated_fat | g |
| 1253 | 601 | Cholesterol | cholesterol | mg |

---

## 三、ETL 架构设计

### 3.1 整体流程

```
┌──────────────────────────────────────────────────────────────────┐
│                         ETL Pipeline                              │
└──────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   EXTRACT     │      │   TRANSFORM   │      │     LOAD      │
│               │      │               │      │               │
│ • 下载 JSON   │  →   │ • 解析描述    │  →   │ • 写入 food   │
│ • 读取文件    │      │ • 映射营养素  │      │ • 写入 nutri  │
│ • 验证格式    │      │ • 计算质量分  │      │ • 写入 alias  │
│ • 存入暂存    │      │ • 数据校验    │      │ • 更新索引    │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ usda_raw_data │      │ etl_staging   │      │ food          │
│ (临时表)      │      │ (处理中数据)   │      │ food_nutrition│
└───────────────┘      └───────────────┘      │ food_alias    │
                                               └───────────────┘
```

### 3.2 数据流状态

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐
│ PENDING │ →  │ PARSING  │ →  │ VALIDATING│ →  │ LOADING  │ →  │ COMPLETE│
└─────────┘    └──────────┘    └───────────┘    └──────────┘    └─────────┘
                    │                │                │
                    ▼                ▼                ▼
               ┌─────────┐    ┌───────────┐    ┌───────────┐
               │ PARSE   │    │ VALIDATION│    │ LOAD      │
               │ _ERROR  │    │ _FAILED   │    │ _ERROR    │
               └─────────┘    └───────────┘    └───────────┘
```

---

## 四、Extract（数据提取）

### 4.1 数据下载策略

```java
@Service
@Slf4j
public class UsdaDataExtractor {

    private static final String USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
    private static final String[] DATA_TYPES = {"Foundation", "SR Legacy"};
    
    @Value("${usda.api.key}")
    private String apiKey;
    
    /**
     * 下载指定数据类型的所有食物数据
     * 使用分页方式，每页 200 条
     */
    public List<UsdaRawFood> extractAllFoods(String dataType) {
        List<UsdaRawFood> allFoods = new ArrayList<>();
        int pageNumber = 1;
        int pageSize = 200;
        boolean hasMore = true;
        
        while (hasMore) {
            log.info("Fetching {} page {}", dataType, pageNumber);
            
            FoodSearchResponse response = fetchFoodsPage(dataType, pageNumber, pageSize);
            
            if (response.getFoods() == null || response.getFoods().isEmpty()) {
                hasMore = false;
            } else {
                allFoods.addAll(response.getFoods());
                pageNumber++;
                
                // Rate limiting: USDA API 限制 1000 次/小时
                sleep(100);
            }
        }
        
        log.info("Extracted {} foods of type {}", allFoods.size(), dataType);
        return allFoods;
    }
    
    /**
     * 获取单个食物的完整营养数据
     */
    public UsdaFoodDetail fetchFoodDetail(String fdcId) {
        String url = String.format("%s/food/%s?api_key=%s", USDA_API_BASE, fdcId, apiKey);
        
        return restTemplate.getForObject(url, UsdaFoodDetail.class);
    }
    
    /**
     * 下载完整数据集 JSON 文件（推荐用于批量导入）
     * 文件来源: https://fdc.nal.usda.gov/download-datasets.html
     */
    public void downloadBulkDataset(String datasetUrl, Path targetPath) throws IOException {
        log.info("Downloading bulk dataset from {}", datasetUrl);
        
        try (InputStream in = new URL(datasetUrl).openStream()) {
            Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }
        
        log.info("Downloaded to {}", targetPath);
    }
}
```

### 4.2 原始数据暂存表

```sql
-- 原始数据暂存表（用于追溯和重新处理）
CREATE TABLE usda_raw_data (
    id              BIGSERIAL PRIMARY KEY,
    fdc_id          VARCHAR(32) NOT NULL UNIQUE,
    data_type       VARCHAR(32) NOT NULL,
    raw_json        JSONB NOT NULL,
    extract_time    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    process_status  VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    error_message   TEXT,
    processed_at    TIMESTAMP
);

CREATE INDEX idx_raw_status ON usda_raw_data(process_status);
CREATE INDEX idx_raw_fdc_id ON usda_raw_data(fdc_id);
```

### 4.3 数据提取记录

```java
@Entity
@Table(name = "usda_raw_data")
@Data
public class UsdaRawData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "fdc_id", nullable = false, unique = true)
    private String fdcId;
    
    @Column(name = "data_type", nullable = false)
    private String dataType;
    
    @Column(name = "raw_json", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Map<String, Object> rawJson;
    
    @Column(name = "extract_time")
    private LocalDateTime extractTime;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "process_status")
    private ProcessStatus processStatus = ProcessStatus.PENDING;
    
    @Column(name = "error_message")
    private String errorMessage;
    
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}

public enum ProcessStatus {
    PENDING,      // 待处理
    PARSING,      // 解析中
    VALIDATING,   // 校验中
    LOADING,      // 加载中
    COMPLETE,     // 完成
    PARSE_ERROR,  // 解析错误
    VALIDATION_FAILED,  // 校验失败
    LOAD_ERROR    // 加载错误
}
```

---

## 五、Transform（数据转换）

### 5.1 转换流程详解

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UsdaDataTransformer {

    private final DescriptionParser descriptionParser;
    private final NutrientMapper nutrientMapper;
    private final DataValidator dataValidator;
    
    /**
     * 主转换方法：将 USDA 原始数据转换为我们的数据模型
     */
    @Transactional
    public TransformResult transform(UsdaRawData rawData) {
        TransformResult result = new TransformResult();
        result.setFdcId(rawData.getFdcId());
        
        try {
            Map<String, Object> json = rawData.getRawJson();
            
            // Step 1: 解析 description
            String description = (String) json.get("description");
            ParsedFood parsed = descriptionParser.parse(description);
            
            // Step 2: 构建 Food 实体
            Food food = buildFood(rawData.getFdcId(), json, parsed);
            
            // Step 3: 提取并映射营养数据
            List<Map<String, Object>> nutrients = (List<Map<String, Object>>) json.get("foodNutrients");
            FoodNutrition nutrition = buildNutrition(nutrients);
            
            // Step 4: 数据质量校验
            ValidationReport report = dataValidator.validate(food, nutrition);
            
            if (report.hasErrors()) {
                result.setStatus(TransformStatus.VALIDATION_FAILED);
                result.setErrors(report.getErrors());
                return result;
            }
            
            // Step 5: 计算质量分数
            nutrition.setQualityScore(calculateQualityScore(nutrition, report));
            
            // Step 6: 生成别名
            List<FoodAlias> aliases = generateAliases(food, json);
            
            result.setFood(food);
            result.setNutrition(nutrition);
            result.setAliases(aliases);
            result.setStatus(TransformStatus.SUCCESS);
            result.setWarnings(report.getWarnings());
            
        } catch (Exception e) {
            log.error("Transform failed for fdcId={}", rawData.getFdcId(), e);
            result.setStatus(TransformStatus.ERROR);
            result.setErrors(List.of(e.getMessage()));
        }
        
        return result;
    }
    
    /**
     * 构建 Food 实体
     */
    private Food buildFood(String fdcId, Map<String, Object> json, ParsedFood parsed) {
        Food food = new Food();
        food.setFdcId(fdcId);
        food.setNameEn(parsed.getNameEn());
        food.setCategory(parsed.getCategory());
        food.setState(parsed.getState());
        food.setHasSkin(parsed.getHasSkin());
        food.setHasBone(parsed.getHasBone());
        food.setEdibleRatio(parsed.getEdibleRatio());
        food.setSource("USDA");
        
        // 提取数据版本
        String dataType = (String) json.get("dataType");
        food.setSourceVersion(dataType);
        
        return food;
    }
    
    /**
     * 构建 FoodNutrition 实体
     */
    private FoodNutrition buildNutrition(List<Map<String, Object>> nutrients) {
        FoodNutrition nutrition = new FoodNutrition();
        nutrition.setBasis(NutritionBasis.PER_100G);
        
        // 初始化为 0
        nutrition.setCalories(BigDecimal.ZERO);
        nutrition.setProtein(BigDecimal.ZERO);
        nutrition.setFat(BigDecimal.ZERO);
        nutrition.setCarbs(BigDecimal.ZERO);
        
        for (Map<String, Object> nutrientData : nutrients) {
            Map<String, Object> nutrient = (Map<String, Object>) nutrientData.get("nutrient");
            Integer nutrientId = (Integer) nutrient.get("id");
            Object amountObj = nutrientData.get("amount");
            
            if (amountObj == null) continue;
            
            BigDecimal amount = new BigDecimal(amountObj.toString());
            
            // 根据 USDA nutrient ID 映射到我们的字段
            switch (nutrientId) {
                case 1008 -> nutrition.setCalories(amount.setScale(2, RoundingMode.HALF_UP));
                case 1003 -> nutrition.setProtein(amount.setScale(3, RoundingMode.HALF_UP));
                case 1004 -> nutrition.setFat(amount.setScale(3, RoundingMode.HALF_UP));
                case 1005 -> nutrition.setCarbs(amount.setScale(3, RoundingMode.HALF_UP));
                case 1079 -> nutrition.setFiber(amount.setScale(3, RoundingMode.HALF_UP));
                case 2000 -> nutrition.setSugar(amount.setScale(3, RoundingMode.HALF_UP));
                case 1093 -> nutrition.setSodium(amount.setScale(3, RoundingMode.HALF_UP));
                case 1258 -> nutrition.setSaturatedFat(amount.setScale(3, RoundingMode.HALF_UP));
                case 1253 -> nutrition.setCholesterol(amount.setScale(3, RoundingMode.HALF_UP));
            }
        }
        
        return nutrition;
    }
    
    /**
     * 生成食物别名
     */
    private List<FoodAlias> generateAliases(Food food, Map<String, Object> json) {
        List<FoodAlias> aliases = new ArrayList<>();
        
        // 1. 添加完整描述作为标准名
        String fullDescription = (String) json.get("description");
        aliases.add(createAlias(food, fullDescription, "en", AliasType.STANDARD, 100));
        
        // 2. 添加简化名称
        String simpleName = simplifyName(fullDescription);
        if (!simpleName.equals(fullDescription)) {
            aliases.add(createAlias(food, simpleName, "en", AliasType.COMMON, 90));
        }
        
        // 3. 添加 USDA 食物类别中的通用名
        Map<String, Object> foodCategory = (Map<String, Object>) json.get("foodCategory");
        if (foodCategory != null) {
            String categoryDesc = (String) foodCategory.get("description");
            // 可以根据类别添加更多别名
        }
        
        return aliases;
    }
    
    private FoodAlias createAlias(Food food, String alias, String language, AliasType type, int priority) {
        FoodAlias fa = new FoodAlias();
        fa.setFood(food);
        fa.setAlias(alias);
        fa.setLanguage(language);
        fa.setAliasType(type);
        fa.setPriority(priority);
        fa.setIsActive(true);
        return fa;
    }
    
    private String simplifyName(String description) {
        // 移除烹饪状态等修饰词，保留核心食物名
        return Arrays.stream(description.split(","))
            .limit(2)
            .map(String::trim)
            .collect(Collectors.joining(", "));
    }
    
    /**
     * 计算数据质量分数 (0-1)
     */
    private BigDecimal calculateQualityScore(FoodNutrition nutrition, ValidationReport report) {
        double score = 1.0;
        
        // 扣分项：
        // - 缺少核心营养素：-0.1 每项
        // - 有警告：-0.05 每条
        // - 营养素为 0 或极端值：-0.1 每项
        
        if (nutrition.getCalories() == null || nutrition.getCalories().compareTo(BigDecimal.ZERO) == 0) {
            score -= 0.1;
        }
        if (nutrition.getProtein() == null) score -= 0.1;
        if (nutrition.getFat() == null) score -= 0.1;
        if (nutrition.getCarbs() == null) score -= 0.1;
        
        score -= report.getWarnings().size() * 0.05;
        
        return BigDecimal.valueOf(Math.max(0, score)).setScale(2, RoundingMode.HALF_UP);
    }
}
```

### 5.2 缺失值处理策略

| 情况 | 处理方式 | 说明 |
|------|----------|------|
| calories 缺失 | 计算: 4×protein + 4×carbs + 9×fat | 使用 Atwater 因子计算 |
| protein 缺失 | 设为 0，标记警告 | 不影响导入 |
| fat 缺失 | 设为 0，标记警告 | 不影响导入 |
| carbs 缺失 | 设为 0，标记警告 | 不影响导入 |
| fiber 缺失 | 设为 NULL | 非核心字段 |
| sugar 缺失 | 设为 NULL | 非核心字段 |
| sodium 缺失 | 设为 NULL | 非核心字段 |

```java
/**
 * 处理缺失的热量值
 */
private void handleMissingCalories(FoodNutrition nutrition) {
    if (nutrition.getCalories() == null || 
        nutrition.getCalories().compareTo(BigDecimal.ZERO) == 0) {
        
        // 使用 Atwater 因子计算: 4P + 4C + 9F
        BigDecimal protein = Optional.ofNullable(nutrition.getProtein()).orElse(BigDecimal.ZERO);
        BigDecimal carbs = Optional.ofNullable(nutrition.getCarbs()).orElse(BigDecimal.ZERO);
        BigDecimal fat = Optional.ofNullable(nutrition.getFat()).orElse(BigDecimal.ZERO);
        
        BigDecimal calculated = protein.multiply(new BigDecimal("4"))
            .add(carbs.multiply(new BigDecimal("4")))
            .add(fat.multiply(new BigDecimal("9")));
        
        nutrition.setCalories(calculated.setScale(2, RoundingMode.HALF_UP));
        nutrition.setIsCalculated(true);  // 标记为计算值
    }
}
```

### 5.3 代表性条目选择逻辑

当同一食物有多个 USDA 条目时（如不同烹饪方式），选择策略：

```java
/**
 * 选择代表性条目
 * 优先级: Foundation > SR Legacy > Survey Foods
 * 同类型时选择数据点最多的
 */
public UsdaRawData selectRepresentative(List<UsdaRawData> candidates) {
    return candidates.stream()
        .sorted(Comparator
            .comparing(this::getDataTypePriority).reversed()
            .thenComparing(this::getDataPoints).reversed())
        .findFirst()
        .orElse(null);
}

private int getDataTypePriority(UsdaRawData data) {
    String dataType = (String) data.getRawJson().get("dataType");
    return switch (dataType) {
        case "Foundation" -> 3;
        case "SR Legacy" -> 2;
        case "Survey (FNDDS)" -> 1;
        default -> 0;
    };
}

private int getDataPoints(UsdaRawData data) {
    List<Map<String, Object>> nutrients = (List<Map<String, Object>>) 
        data.getRawJson().get("foodNutrients");
    return nutrients.stream()
        .mapToInt(n -> Optional.ofNullable((Integer) n.get("dataPoints")).orElse(0))
        .sum();
}
```

---

## 六、Load（数据加载）

### 6.1 加载流程

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class UsdaDataLoader {

    private final FoodRepository foodRepository;
    private final FoodNutritionRepository nutritionRepository;
    private final FoodAliasRepository aliasRepository;
    private final UsdaRawDataRepository rawDataRepository;
    
    /**
     * 加载转换后的数据到正式表
     */
    @Transactional
    public LoadResult load(TransformResult transformResult) {
        LoadResult result = new LoadResult();
        result.setFdcId(transformResult.getFdcId());
        
        try {
            Food food = transformResult.getFood();
            FoodNutrition nutrition = transformResult.getNutrition();
            List<FoodAlias> aliases = transformResult.getAliases();
            
            // 检查是否已存在（基于 fdc_id）
            Optional<Food> existing = foodRepository.findByFdcId(food.getFdcId());
            
            if (existing.isPresent()) {
                // 更新模式
                Food existingFood = existing.get();
                updateFood(existingFood, food);
                food = foodRepository.save(existingFood);
                
                // 更新营养数据
                updateNutrition(food.getId(), nutrition);
                
                result.setAction(LoadAction.UPDATED);
            } else {
                // 新增模式
                food = foodRepository.save(food);
                
                nutrition.setFoodId(food.getId());
                nutritionRepository.save(nutrition);
                
                // 保存别名
                for (FoodAlias alias : aliases) {
                    alias.setFoodId(food.getId());
                    try {
                        aliasRepository.save(alias);
                    } catch (DataIntegrityViolationException e) {
                        // 别名已存在，跳过
                        log.debug("Alias already exists: {}", alias.getAlias());
                    }
                }
                
                result.setAction(LoadAction.INSERTED);
            }
            
            // 更新原始数据状态
            rawDataRepository.updateStatus(
                transformResult.getFdcId(), 
                ProcessStatus.COMPLETE, 
                LocalDateTime.now()
            );
            
            result.setFoodId(food.getId());
            result.setStatus(LoadStatus.SUCCESS);
            
        } catch (Exception e) {
            log.error("Load failed for fdcId={}", transformResult.getFdcId(), e);
            result.setStatus(LoadStatus.ERROR);
            result.setError(e.getMessage());
            
            rawDataRepository.updateStatusWithError(
                transformResult.getFdcId(),
                ProcessStatus.LOAD_ERROR,
                e.getMessage()
            );
        }
        
        return result;
    }
    
    private void updateFood(Food existing, Food newData) {
        // 只更新非空字段
        if (newData.getNameEn() != null) existing.setNameEn(newData.getNameEn());
        if (newData.getCategory() != null) existing.setCategory(newData.getCategory());
        if (newData.getState() != null) existing.setState(newData.getState());
        existing.setHasSkin(newData.getHasSkin());
        existing.setHasBone(newData.getHasBone());
        existing.setEdibleRatio(newData.getEdibleRatio());
        existing.setSourceVersion(newData.getSourceVersion());
    }
    
    private void updateNutrition(Long foodId, FoodNutrition newNutrition) {
        Optional<FoodNutrition> existing = nutritionRepository.findByFoodIdAndBasis(
            foodId, NutritionBasis.PER_100G);
        
        if (existing.isPresent()) {
            FoodNutrition existingNutrition = existing.get();
            existingNutrition.setCalories(newNutrition.getCalories());
            existingNutrition.setProtein(newNutrition.getProtein());
            existingNutrition.setFat(newNutrition.getFat());
            existingNutrition.setCarbs(newNutrition.getCarbs());
            existingNutrition.setFiber(newNutrition.getFiber());
            existingNutrition.setSugar(newNutrition.getSugar());
            existingNutrition.setSodium(newNutrition.getSodium());
            existingNutrition.setSaturatedFat(newNutrition.getSaturatedFat());
            existingNutrition.setCholesterol(newNutrition.getCholesterol());
            existingNutrition.setQualityScore(newNutrition.getQualityScore());
            nutritionRepository.save(existingNutrition);
        } else {
            newNutrition.setFoodId(foodId);
            nutritionRepository.save(newNutrition);
        }
    }
}
```

### 6.2 批量加载优化

```java
@Service
@Slf4j
public class BatchEtlService {

    private static final int BATCH_SIZE = 100;
    
    @Autowired
    private UsdaDataExtractor extractor;
    
    @Autowired
    private UsdaDataTransformer transformer;
    
    @Autowired
    private UsdaDataLoader loader;
    
    @Autowired
    private UsdaRawDataRepository rawDataRepository;
    
    /**
     * 执行完整的批量 ETL 流程
     */
    @Async
    public CompletableFuture<EtlReport> runFullEtl() {
        EtlReport report = new EtlReport();
        report.setStartTime(LocalDateTime.now());
        
        try {
            // Phase 1: Extract
            log.info("Starting extraction phase...");
            List<UsdaRawFood> rawFoods = extractor.extractAllFoods("Foundation");
            rawFoods.addAll(extractor.extractAllFoods("SR Legacy"));
            
            report.setTotalExtracted(rawFoods.size());
            log.info("Extracted {} foods", rawFoods.size());
            
            // 保存到暂存表
            List<UsdaRawData> savedRaw = saveRawData(rawFoods);
            
            // Phase 2 & 3: Transform + Load (批量处理)
            log.info("Starting transform and load phase...");
            
            List<List<UsdaRawData>> batches = partition(savedRaw, BATCH_SIZE);
            int batchNum = 0;
            
            for (List<UsdaRawData> batch : batches) {
                batchNum++;
                log.info("Processing batch {}/{}", batchNum, batches.size());
                
                for (UsdaRawData raw : batch) {
                    try {
                        // Transform
                        TransformResult transformResult = transformer.transform(raw);
                        
                        if (transformResult.getStatus() == TransformStatus.SUCCESS) {
                            // Load
                            LoadResult loadResult = loader.load(transformResult);
                            
                            if (loadResult.getStatus() == LoadStatus.SUCCESS) {
                                if (loadResult.getAction() == LoadAction.INSERTED) {
                                    report.incrementInserted();
                                } else {
                                    report.incrementUpdated();
                                }
                            } else {
                                report.incrementFailed();
                                report.addError(raw.getFdcId(), loadResult.getError());
                            }
                        } else {
                            report.incrementFailed();
                            report.addErrors(raw.getFdcId(), transformResult.getErrors());
                        }
                        
                    } catch (Exception e) {
                        log.error("Error processing fdcId={}", raw.getFdcId(), e);
                        report.incrementFailed();
                        report.addError(raw.getFdcId(), e.getMessage());
                    }
                }
                
                // 每批次后记录进度
                log.info("Progress: inserted={}, updated={}, failed={}", 
                    report.getInsertedCount(), 
                    report.getUpdatedCount(), 
                    report.getFailedCount());
            }
            
        } catch (Exception e) {
            log.error("ETL failed", e);
            report.setStatus(EtlStatus.FAILED);
            report.setFatalError(e.getMessage());
        }
        
        report.setEndTime(LocalDateTime.now());
        report.setStatus(report.getFailedCount() == 0 ? EtlStatus.SUCCESS : EtlStatus.PARTIAL);
        
        log.info("ETL completed: {}", report);
        return CompletableFuture.completedFuture(report);
    }
    
    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}
```

---

## 七、数据校验方案

### 7.1 校验规则

```java
@Component
public class DataValidator {

    /**
     * 验证食物和营养数据
     */
    public ValidationReport validate(Food food, FoodNutrition nutrition) {
        ValidationReport report = new ValidationReport();
        
        // 1. 必填字段检查
        validateRequiredFields(food, nutrition, report);
        
        // 2. 热量一致性检查 (4P + 4C + 9F ≈ kcal)
        validateCalorieConsistency(nutrition, report);
        
        // 3. 极端值检测
        validateExtremeValues(nutrition, report);
        
        // 4. 逻辑一致性检查
        validateLogicalConsistency(food, nutrition, report);
        
        return report;
    }
    
    private void validateRequiredFields(Food food, FoodNutrition nutrition, ValidationReport report) {
        if (food.getNameEn() == null || food.getNameEn().isBlank()) {
            report.addError("name_en is required");
        }
        if (nutrition.getCalories() == null) {
            report.addError("calories is required");
        }
    }
    
    /**
     * 热量一致性检查
     * 公式: 4 × protein + 4 × carbs + 9 × fat ≈ calories
     * 允许误差: ±15%
     */
    private void validateCalorieConsistency(FoodNutrition nutrition, ValidationReport report) {
        BigDecimal protein = Optional.ofNullable(nutrition.getProtein()).orElse(BigDecimal.ZERO);
        BigDecimal carbs = Optional.ofNullable(nutrition.getCarbs()).orElse(BigDecimal.ZERO);
        BigDecimal fat = Optional.ofNullable(nutrition.getFat()).orElse(BigDecimal.ZERO);
        BigDecimal actualCalories = nutrition.getCalories();
        
        if (actualCalories == null || actualCalories.compareTo(BigDecimal.ZERO) == 0) {
            return; // 如果没有热量数据，跳过此检查
        }
        
        // 计算理论热量
        BigDecimal theoreticalCalories = protein.multiply(new BigDecimal("4"))
            .add(carbs.multiply(new BigDecimal("4")))
            .add(fat.multiply(new BigDecimal("9")));
        
        // 计算偏差率
        if (theoreticalCalories.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal deviation = actualCalories.subtract(theoreticalCalories)
                .abs()
                .divide(theoreticalCalories, 4, RoundingMode.HALF_UP);
            
            if (deviation.compareTo(new BigDecimal("0.15")) > 0) {
                report.addWarning(String.format(
                    "Calorie inconsistency: actual=%.2f, calculated=%.2f (deviation=%.1f%%)",
                    actualCalories, theoreticalCalories, deviation.multiply(new BigDecimal("100"))
                ));
            }
        }
    }
    
    /**
     * 极端值检测
     */
    private void validateExtremeValues(FoodNutrition nutrition, ValidationReport report) {
        // 蛋白质极限检查 (纯蛋白质粉约 80-90g/100g)
        if (nutrition.getProtein() != null && 
            nutrition.getProtein().compareTo(new BigDecimal("95")) > 0) {
            report.addWarning("Protein value extremely high: " + nutrition.getProtein() + "g/100g");
        }
        
        // 脂肪极限检查 (纯油脂为 100g/100g)
        if (nutrition.getFat() != null && 
            nutrition.getFat().compareTo(new BigDecimal("100")) > 0) {
            report.addError("Fat value exceeds 100g/100g: " + nutrition.getFat());
        }
        
        // 碳水极限检查 (纯糖约 100g/100g)
        if (nutrition.getCarbs() != null && 
            nutrition.getCarbs().compareTo(new BigDecimal("100")) > 0) {
            report.addError("Carbs value exceeds 100g/100g: " + nutrition.getCarbs());
        }
        
        // 热量极限检查 (纯脂肪约 900kcal/100g)
        if (nutrition.getCalories() != null && 
            nutrition.getCalories().compareTo(new BigDecimal("900")) > 0) {
            report.addWarning("Calories extremely high: " + nutrition.getCalories() + "kcal/100g");
        }
        
        // 钠极限检查 (高盐食物约 3000-4000mg/100g)
        if (nutrition.getSodium() != null && 
            nutrition.getSodium().compareTo(new BigDecimal("5000")) > 0) {
            report.addWarning("Sodium value extremely high: " + nutrition.getSodium() + "mg/100g");
        }
    }
    
    /**
     * 逻辑一致性检查
     */
    private void validateLogicalConsistency(Food food, FoodNutrition nutrition, ValidationReport report) {
        // 1. 可食比例检查
        if (food.getEdibleRatio().compareTo(BigDecimal.ZERO) <= 0 || 
            food.getEdibleRatio().compareTo(BigDecimal.ONE) > 0) {
            report.addError("Invalid edible_ratio: " + food.getEdibleRatio());
        }
        
        // 2. 总宏量营养素不应超过 100g
        BigDecimal totalMacros = Optional.ofNullable(nutrition.getProtein()).orElse(BigDecimal.ZERO)
            .add(Optional.ofNullable(nutrition.getFat()).orElse(BigDecimal.ZERO))
            .add(Optional.ofNullable(nutrition.getCarbs()).orElse(BigDecimal.ZERO));
        
        if (totalMacros.compareTo(new BigDecimal("105")) > 0) {  // 允许 5% 误差
            report.addWarning("Total macronutrients exceed 100g: " + totalMacros + "g/100g");
        }
        
        // 3. 糖不应超过碳水
        if (nutrition.getSugar() != null && nutrition.getCarbs() != null &&
            nutrition.getSugar().compareTo(nutrition.getCarbs()) > 0) {
            report.addWarning("Sugar exceeds total carbs");
        }
        
        // 4. 饱和脂肪不应超过总脂肪
        if (nutrition.getSaturatedFat() != null && nutrition.getFat() != null &&
            nutrition.getSaturatedFat().compareTo(nutrition.getFat()) > 0) {
            report.addWarning("Saturated fat exceeds total fat");
        }
    }
}
```

### 7.2 校验报告结构

```java
@Data
public class ValidationReport {
    private List<String> errors = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    
    public void addError(String error) {
        errors.add(error);
    }
    
    public void addWarning(String warning) {
        warnings.add(warning);
    }
    
    public boolean hasErrors() {
        return !errors.isEmpty();
    }
    
    public boolean isValid() {
        return errors.isEmpty();
    }
}
```

---

## 八、ETL 管理接口

### 8.1 REST API

```java
@RestController
@RequestMapping("/api/v1/admin/etl")
@RequiredArgsConstructor
@Slf4j
public class EtlController {

    private final BatchEtlService batchEtlService;
    private final EtlReportRepository reportRepository;
    
    /**
     * 启动完整 ETL 流程
     */
    @PostMapping("/run")
    public ResponseEntity<EtlJobResponse> startEtl() {
        String jobId = UUID.randomUUID().toString();
        
        batchEtlService.runFullEtl()
            .thenAccept(report -> {
                report.setJobId(jobId);
                reportRepository.save(report);
            });
        
        return ResponseEntity.accepted()
            .body(new EtlJobResponse(jobId, "ETL job started"));
    }
    
    /**
     * 查询 ETL 任务状态
     */
    @GetMapping("/status/{jobId}")
    public ResponseEntity<EtlReport> getStatus(@PathVariable String jobId) {
        return reportRepository.findByJobId(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * 导入单个食物
     */
    @PostMapping("/import/{fdcId}")
    public ResponseEntity<LoadResult> importSingleFood(@PathVariable String fdcId) {
        // 实现单条导入逻辑
        return ResponseEntity.ok().build();
    }
    
    /**
     * 重新处理失败的记录
     */
    @PostMapping("/retry-failed")
    public ResponseEntity<String> retryFailed() {
        int retried = batchEtlService.retryFailedRecords();
        return ResponseEntity.ok("Retried " + retried + " records");
    }
}
```

---

## 九、调度配置

### 9.1 Spring Scheduler 配置

```java
@Configuration
@EnableScheduling
@EnableAsync
public class EtlSchedulerConfig {

    @Autowired
    private BatchEtlService batchEtlService;
    
    /**
     * 每周日凌晨 3 点执行增量更新
     */
    @Scheduled(cron = "0 0 3 ? * SUN")
    public void weeklyIncrementalUpdate() {
        log.info("Starting weekly incremental ETL update");
        batchEtlService.runIncrementalEtl();
    }
    
    /**
     * 每天检查失败记录并重试
     */
    @Scheduled(cron = "0 0 4 * * ?")
    public void dailyRetryFailed() {
        log.info("Retrying failed ETL records");
        batchEtlService.retryFailedRecords();
    }
}
```

---

## 十、监控与告警

### 10.1 ETL 指标

```java
@Component
@RequiredArgsConstructor
public class EtlMetrics {

    private final MeterRegistry meterRegistry;
    
    private Counter extractedCounter;
    private Counter transformedCounter;
    private Counter loadedCounter;
    private Counter failedCounter;
    private Timer etlDuration;
    
    @PostConstruct
    public void init() {
        extractedCounter = meterRegistry.counter("etl.extracted.total");
        transformedCounter = meterRegistry.counter("etl.transformed.total");
        loadedCounter = meterRegistry.counter("etl.loaded.total");
        failedCounter = meterRegistry.counter("etl.failed.total");
        etlDuration = meterRegistry.timer("etl.duration");
    }
    
    public void recordExtracted(int count) {
        extractedCounter.increment(count);
    }
    
    public void recordTransformed() {
        transformedCounter.increment();
    }
    
    public void recordLoaded() {
        loadedCounter.increment();
    }
    
    public void recordFailed() {
        failedCounter.increment();
    }
    
    public Timer.Sample startTimer() {
        return Timer.start(meterRegistry);
    }
    
    public void stopTimer(Timer.Sample sample) {
        sample.stop(etlDuration);
    }
}
```

---

## 十一、最佳实践总结

### 11.1 数据质量保障

1. **优先使用 Foundation Foods**：数据最精确
2. **保留原始 JSON**：便于问题追溯和重新处理
3. **严格校验热量一致性**：4P + 4C + 9F ≈ kcal
4. **标记计算值**：区分原始数据和推导数据

### 11.2 性能优化

1. **批量处理**：每次 100-500 条，避免内存溢出
2. **异步执行**：ETL 不阻塞主服务
3. **增量更新**：只处理变更的数据
4. **索引优化**：确保 fdc_id 和 name_en 有索引

### 11.3 错误处理

1. **单条失败不影响整体**：记录错误，继续处理
2. **自动重试机制**：每日重试失败记录
3. **告警通知**：失败率超过阈值时发送告警

### 11.4 数据一致性

1. **所有营养值基于每 100g 可食部分**
2. **edible_ratio 用于计算实际摄入**
3. **保持 food 和 food_nutrition 的一对一关系**
