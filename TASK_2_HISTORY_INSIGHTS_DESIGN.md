# Task 2: History & Insights API 设计与实现方案

## 📋 需求分析

### Feature A: History Log (历史记录)
**目标**: 按时间顺序列出用户的所有餐食记录

**要求**:
- ✅ 支持分页 (page/size)
- ✅ 支持日期范围过滤 (startDate, endDate)
- ✅ 按时间倒序排列（最新的在前）

### Feature B: Weekly Insights (每周洞察)
**目标**: 提供过去 7 天的可视化分析数据

**指标**:
1. 每日总卡路里 vs 目标
2. 每周平均宏量营养素分布（蛋白质、碳水、脂肪）
3. 糖分摄入警告（使用新字段）

**约束**:
- ❌ 不创建新表
- ✅ 使用高效的 SQL/JPA 查询聚合 meal_log 数据

---

## 🏗️ API 设计

### 1. History Log API

#### Endpoint
```
GET /api/v1/meals/history
```

#### Query Parameters
| 参数 | 类型 | 必填 | 描述 | 默认值 | 示例 |
|------|------|------|------|--------|------|
| `page` | Integer | ❌ | 页码（从0开始） | 0 | 0, 1, 2 |
| `size` | Integer | ❌ | 每页记录数 | 20 | 10, 20, 50 |
| `startDate` | LocalDate | ❌ | 开始日期（ISO格式） | null | 2025-01-01 |
| `endDate` | LocalDate | ❌ | 结束日期（ISO格式） | null | 2025-01-15 |
| `sort` | String | ❌ | 排序字段 | consumedAt,desc | consumedAt,asc |

#### Request Example
```bash
# 获取第一页（最近20条）
GET /api/v1/meals/history?page=0&size=20

# 获取指定日期范围
GET /api/v1/meals/history?startDate=2025-01-01&endDate=2025-01-15&page=0&size=10

# 按时间升序排列（最旧的在前）
GET /api/v1/meals/history?sort=consumedAt,asc
```

#### Response Structure
```json
{
  "content": [
    {
      "id": 123,
      "userId": "uuid",
      "mealType": "breakfast",
      "consumedAt": "2025-01-15T08:30:00Z",
      "totalCalories": 450,
      "totalProtein": 25.5,
      "totalCarbs": 50.0,
      "totalFat": 15.0,
      "totalSugar": 12.0,
      "foodItems": [
        {
          "displayName": "Oatmeal",
          "grams": 100,
          "calories": 350
        }
      ],
      "imageUrl": "https://...",
      "notes": "Breakfast at home"
    }
  ],
  "page": {
    "size": 20,
    "number": 0,
    "totalElements": 150,
    "totalPages": 8
  }
}
```

---

### 2. Weekly Insights API

#### Endpoint
```
GET /api/v1/meals/insights/weekly
```

#### Query Parameters
| 参数 | 类型 | 必填 | 描述 | 默认值 |
|------|------|------|------|--------|
| `endDate` | LocalDate | ❌ | 结束日期（向前推7天） | 今天 |

#### Request Example
```bash
# 获取最近7天的数据
GET /api/v1/meals/insights/weekly

# 获取指定日期前7天的数据
GET /api/v1/meals/insights/weekly?endDate=2025-01-15
```

#### Response Structure
```json
{
  "dateRange": {
    "startDate": "2025-01-09",
    "endDate": "2025-01-15"
  },
  "summary": {
    "totalMeals": 21,
    "totalCalories": 14500,
    "averageDailyCalories": 2071.4,
    "averageProtein": 120.5,
    "averageCarbs": 180.0,
    "averageFat": 75.0,
    "averageSugar": 45.0
  },
  "dailyData": [
    {
      "date": "2025-01-09",
      "calories": {
        "actual": 2100,
        "target": 2000,
        "percentage": 105.0
      },
      "protein": 125.0,
      "carbs": 190.0,
      "fat": 80.0,
      "sugar": 50.0,
      "mealCount": 3
    },
    // ... 其他6天
  ],
  "macrosDistribution": {
    "protein": {
      "grams": 843.5,
      "percentage": 22.5,
      "caloriesFromProtein": 3374
    },
    "carbs": {
      "grams": 1260.0,
      "percentage": 47.5,
      "caloriesFromCarbs": 5040
    },
    "fat": {
      "grams": 525.0,
      "percentage": 30.0,
      "caloriesFromFat": 4725
    }
  },
  "sugarWarning": {
    "hasWarning": true,
    "averageDailySugar": 45.0,
    "recommendedLimit": 50.0,
    "daysExceeded": 3,
    "message": "You exceeded the recommended sugar limit on 3 days this week."
  },
  "userGoal": {
    "dailyCalorieTarget": 2000,
    "dailyProteinTarget": 150,
    "dailyCarbsTarget": 200,
    "dailyFatTarget": 65
  }
}
```

---

## 🔧 后端实现策略

### 架构层次
```
Controller Layer (MealController)
    ↓
Service Layer (MealHistoryService, MealInsightsService)
    ↓
Repository Layer (MealLogRepository - 扩展查询方法)
    ↓
Database (meal_log table)
```

---

### 1. Repository Layer 扩展

**文件**: `MealLogRepository.java`

**新增方法**:

```java
public interface MealLogRepository extends JpaRepository<MealLog, Long> {
  
  // === 现有方法（保持不变） ===
  List<MealLog> findByUserIdAndConsumedAtBetweenOrderByConsumedAtAsc(...);
  Long sumCalories(...);
  BigDecimal sumProtein(...);
  // ... 其他现有方法

  // === 新增：History Log 分页查询 ===
  
  /**
   * 分页查询用户的餐食记录（支持日期范围过滤）
   */
  @Query("""
    SELECT m FROM MealLog m 
    WHERE m.userId = :userId
      AND (:startDate IS NULL OR m.consumedAt >= :startDate)
      AND (:endDate IS NULL OR m.consumedAt < :endDate)
  """)
  Page<MealLog> findMealHistory(
    @Param("userId") UUID userId,
    @Param("startDate") OffsetDateTime startDate,
    @Param("endDate") OffsetDateTime endDate,
    Pageable pageable
  );

  // === 新增：Weekly Insights 聚合查询 ===
  
  /**
   * 按日期分组统计营养数据（用于每日趋势图）
   */
  @Query("""
    SELECT 
      DATE(m.consumedAt) as date,
      COUNT(m) as mealCount,
      SUM(COALESCE(m.calories, 0) + COALESCE(m.totalCalories, 0)) as totalCalories,
      SUM(COALESCE(m.proteinGrams, 0) + COALESCE(m.totalProtein, 0)) as totalProtein,
      SUM(COALESCE(m.carbsGrams, 0) + COALESCE(m.totalCarbs, 0)) as totalCarbs,
      SUM(COALESCE(m.fatGrams, 0) + COALESCE(m.totalFat, 0)) as totalFat
    FROM MealLog m
    WHERE m.userId = :userId
      AND m.consumedAt >= :start
      AND m.consumedAt < :end
    GROUP BY DATE(m.consumedAt)
    ORDER BY DATE(m.consumedAt) ASC
  """)
  List<DailyNutritionSummary> getDailyNutritionSummary(
    @Param("userId") UUID userId,
    @Param("start") OffsetDateTime start,
    @Param("end") OffsetDateTime end
  );
  
  /**
   * 周期内总计统计（用于平均值计算）
   */
  @Query("""
    SELECT 
      COUNT(m) as totalMeals,
      SUM(COALESCE(m.calories, 0) + COALESCE(m.totalCalories, 0)) as totalCalories,
      SUM(COALESCE(m.proteinGrams, 0) + COALESCE(m.totalProtein, 0)) as totalProtein,
      SUM(COALESCE(m.carbsGrams, 0) + COALESCE(m.totalCarbs, 0)) as totalCarbs,
      SUM(COALESCE(m.fatGrams, 0) + COALESCE(m.totalFat, 0)) as totalFat
    FROM MealLog m
    WHERE m.userId = :userId
      AND m.consumedAt >= :start
      AND m.consumedAt < :end
  """)
  WeeklySummary getWeeklySummary(
    @Param("userId") UUID userId,
    @Param("start") OffsetDateTime start,
    @Param("end") OffsetDateTime end
  );
  
  // === 投影接口（Projection Interfaces） ===
  
  interface DailyNutritionSummary {
    LocalDate getDate();
    Long getMealCount();
    Long getTotalCalories();
    BigDecimal getTotalProtein();
    BigDecimal getTotalCarbs();
    BigDecimal getTotalFat();
  }
  
  interface WeeklySummary {
    Long getTotalMeals();
    Long getTotalCalories();
    BigDecimal getTotalProtein();
    BigDecimal getTotalCarbs();
    BigDecimal getTotalFat();
  }
}
```

---

### 2. Service Layer 实现

#### 2.1 MealHistoryService.java（新增）

**职责**: 处理历史记录的业务逻辑

```java
package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.MealHistoryResponse;
import com.fitnessapp.backend.nutrition.entity.MealLog;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealHistoryService {

  private final MealLogRepository mealLogRepository;

  /**
   * 获取用户的餐食历史记录（支持分页和日期过滤）
   */
  public Page<MealLog> getMealHistory(
      UUID userId, 
      LocalDate startDate, 
      LocalDate endDate, 
      Pageable pageable
  ) {
    log.info("Fetching meal history for user: {}, startDate: {}, endDate: {}, page: {}", 
             userId, startDate, endDate, pageable.getPageNumber());
    
    // 转换日期为 OffsetDateTime
    OffsetDateTime start = startDate != null 
        ? startDate.atStartOfDay().atOffset(ZoneOffset.UTC) 
        : null;
    
    OffsetDateTime end = endDate != null 
        ? endDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC) 
        : null;
    
    Page<MealLog> result = mealLogRepository.findMealHistory(userId, start, end, pageable);
    
    log.info("Found {} meal records (total: {})", 
             result.getNumberOfElements(), result.getTotalElements());
    
    return result;
  }
}
```

#### 2.2 MealInsightsService.java（新增）

**职责**: 处理周报数据分析和聚合

```java
package com.fitnessapp.backend.nutrition.service;

import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse;
import com.fitnessapp.backend.nutrition.dto.WeeklyInsightsResponse.*;
import com.fitnessapp.backend.nutrition.repository.MealLogRepository;
import com.fitnessapp.backend.user.entity.UserProfile;
import com.fitnessapp.backend.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealInsightsService {

  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  
  private static final int DAYS_IN_WEEK = 7;
  private static final BigDecimal RECOMMENDED_DAILY_SUGAR_LIMIT = new BigDecimal("50.0");
  
  // 营养素热量系数（每克产生的卡路里）
  private static final BigDecimal CALORIES_PER_GRAM_PROTEIN = new BigDecimal("4");
  private static final BigDecimal CALORIES_PER_GRAM_CARBS = new BigDecimal("4");
  private static final BigDecimal CALORIES_PER_GRAM_FAT = new BigDecimal("9");

  /**
   * 获取每周洞察数据
   */
  public WeeklyInsightsResponse getWeeklyInsights(UUID userId, LocalDate endDate) {
    log.info("Generating weekly insights for user: {}, endDate: {}", userId, endDate);
    
    // 获取用户目标数据
    UserProfile profile = userProfileRepository.findByUserId(userId)
        .orElseThrow(() -> new EntityNotFoundException("User profile not found: " + userId));
    
    // 计算日期范围（过去7天）
    LocalDate end = endDate != null ? endDate : LocalDate.now();
    LocalDate start = end.minusDays(DAYS_IN_WEEK - 1);
    
    OffsetDateTime startDateTime = start.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime endDateTime = end.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
    
    // 获取周汇总数据
    MealLogRepository.WeeklySummary weeklySummary = 
        mealLogRepository.getWeeklySummary(userId, startDateTime, endDateTime);
    
    // 获取每日数据
    List<MealLogRepository.DailyNutritionSummary> dailySummaries = 
        mealLogRepository.getDailyNutritionSummary(userId, startDateTime, endDateTime);
    
    // 构建响应
    return buildWeeklyInsightsResponse(
        profile, 
        weeklySummary, 
        dailySummaries, 
        start, 
        end
    );
  }
  
  private WeeklyInsightsResponse buildWeeklyInsightsResponse(
      UserProfile profile,
      MealLogRepository.WeeklySummary weeklySummary,
      List<MealLogRepository.DailyNutritionSummary> dailySummaries,
      LocalDate start,
      LocalDate end
  ) {
    // 计算平均值
    long totalMeals = weeklySummary.getTotalMeals() != null ? weeklySummary.getTotalMeals() : 0L;
    long totalCalories = weeklySummary.getTotalCalories() != null ? weeklySummary.getTotalCalories() : 0L;
    BigDecimal totalProtein = weeklySummary.getTotalProtein() != null ? weeklySummary.getTotalProtein() : BigDecimal.ZERO;
    BigDecimal totalCarbs = weeklySummary.getTotalCarbs() != null ? weeklySummary.getTotalCarbs() : BigDecimal.ZERO;
    BigDecimal totalFat = weeklySummary.getTotalFat() != null ? weeklySummary.getTotalFat() : BigDecimal.ZERO;
    
    double avgDailyCalories = totalCalories / (double) DAYS_IN_WEEK;
    double avgProtein = totalProtein.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    double avgCarbs = totalCarbs.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    double avgFat = totalFat.divide(new BigDecimal(DAYS_IN_WEEK), 2, RoundingMode.HALF_UP).doubleValue();
    
    // 构建每日数据
    List<DailyData> dailyDataList = buildDailyDataList(dailySummaries, profile);
    
    // 构建宏量营养素分布
    MacrosDistribution macrosDistribution = buildMacrosDistribution(totalProtein, totalCarbs, totalFat);
    
    // 构建糖分警告（注意：当前表没有 sugar 字段，这里暂时返回占位数据）
    SugarWarning sugarWarning = buildSugarWarning(dailySummaries);
    
    // 构建用户目标
    UserGoal userGoal = UserGoal.builder()
        .dailyCalorieTarget(profile.getDailyCalorieTarget())
        .dailyProteinTarget(profile.getDailyProteinTarget())
        .dailyCarbsTarget(profile.getDailyCarbsTarget())
        .dailyFatTarget(profile.getDailyFatTarget())
        .build();
    
    return WeeklyInsightsResponse.builder()
        .dateRange(DateRange.builder()
            .startDate(start.toString())
            .endDate(end.toString())
            .build())
        .summary(Summary.builder()
            .totalMeals(totalMeals)
            .totalCalories(totalCalories)
            .averageDailyCalories(avgDailyCalories)
            .averageProtein(avgProtein)
            .averageCarbs(avgCarbs)
            .averageFat(avgFat)
            .averageSugar(0.0) // TODO: 需要添加 sugar 字段
            .build())
        .dailyData(dailyDataList)
        .macrosDistribution(macrosDistribution)
        .sugarWarning(sugarWarning)
        .userGoal(userGoal)
        .build();
  }
  
  private List<DailyData> buildDailyDataList(
      List<MealLogRepository.DailyNutritionSummary> summaries,
      UserProfile profile
  ) {
    List<DailyData> dailyDataList = new ArrayList<>();
    Integer calorieTarget = profile.getDailyCalorieTarget() != null ? profile.getDailyCalorieTarget() : 2000;
    
    for (MealLogRepository.DailyNutritionSummary summary : summaries) {
      long actualCalories = summary.getTotalCalories() != null ? summary.getTotalCalories() : 0L;
      double percentage = (actualCalories / (double) calorieTarget) * 100.0;
      
      DailyData dailyData = DailyData.builder()
          .date(summary.getDate().toString())
          .calories(CaloriesData.builder()
              .actual((int) actualCalories)
              .target(calorieTarget)
              .percentage(Math.round(percentage * 10.0) / 10.0)
              .build())
          .protein(summary.getTotalProtein() != null ? summary.getTotalProtein().doubleValue() : 0.0)
          .carbs(summary.getTotalCarbs() != null ? summary.getTotalCarbs().doubleValue() : 0.0)
          .fat(summary.getTotalFat() != null ? summary.getTotalFat().doubleValue() : 0.0)
          .sugar(0.0) // TODO: 需要添加 sugar 字段
          .mealCount(summary.getMealCount() != null ? summary.getMealCount().intValue() : 0)
          .build();
      
      dailyDataList.add(dailyData);
    }
    
    return dailyDataList;
  }
  
  private MacrosDistribution buildMacrosDistribution(
      BigDecimal totalProtein, 
      BigDecimal totalCarbs, 
      BigDecimal totalFat
  ) {
    // 计算每种营养素产生的总热量
    BigDecimal caloriesFromProtein = totalProtein.multiply(CALORIES_PER_GRAM_PROTEIN);
    BigDecimal caloriesFromCarbs = totalCarbs.multiply(CALORIES_PER_GRAM_CARBS);
    BigDecimal caloriesFromFat = totalFat.multiply(CALORIES_PER_GRAM_FAT);
    
    // 计算总热量
    BigDecimal totalCalories = caloriesFromProtein
        .add(caloriesFromCarbs)
        .add(caloriesFromFat);
    
    // 防止除零错误
    if (totalCalories.compareTo(BigDecimal.ZERO) == 0) {
      return MacrosDistribution.builder()
          .protein(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromProtein(0).build())
          .carbs(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromCarbs(0).build())
          .fat(MacroDetail.builder().grams(0.0).percentage(0.0).caloriesFromFat(0).build())
          .build();
    }
    
    // 计算百分比
    double proteinPercent = caloriesFromProtein
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    double carbsPercent = caloriesFromCarbs
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    double fatPercent = caloriesFromFat
        .divide(totalCalories, 4, RoundingMode.HALF_UP)
        .multiply(new BigDecimal("100"))
        .doubleValue();
    
    return MacrosDistribution.builder()
        .protein(MacroDetail.builder()
            .grams(totalProtein.doubleValue())
            .percentage(Math.round(proteinPercent * 10.0) / 10.0)
            .caloriesFromProtein(caloriesFromProtein.intValue())
            .build())
        .carbs(MacroDetail.builder()
            .grams(totalCarbs.doubleValue())
            .percentage(Math.round(carbsPercent * 10.0) / 10.0)
            .caloriesFromCarbs(caloriesFromCarbs.intValue())
            .build())
        .fat(MacroDetail.builder()
            .grams(totalFat.doubleValue())
            .percentage(Math.round(fatPercent * 10.0) / 10.0)
            .caloriesFromFat(caloriesFromFat.intValue())
            .build())
        .build();
  }
  
  private SugarWarning buildSugarWarning(
      List<MealLogRepository.DailyNutritionSummary> summaries
  ) {
    // TODO: 当前 meal_log 表没有 sugar 字段
    // 这里返回占位数据，需要后续添加 total_sugar 字段后实现
    
    return SugarWarning.builder()
        .hasWarning(false)
        .averageDailySugar(0.0)
        .recommendedLimit(RECOMMENDED_DAILY_SUGAR_LIMIT.doubleValue())
        .daysExceeded(0)
        .message("Sugar tracking not available yet. Please update your meal logs.")
        .build();
  }
}
```

---

### 3. Controller Layer 扩展

**文件**: `MealController.java`

**新增端点**:

```java
@RestController
@RequestMapping("/api/v1/meals")
@RequiredArgsConstructor
@Validated
public class MealController {

  // 现有依赖
  private final MealLogRepository mealLogRepository;
  private final UserProfileRepository userProfileRepository;
  private final NutritionTrackingService nutritionTrackingService;
  private final ObjectMapper objectMapper;
  private final CurrentUser currentUser;
  
  // 新增依赖
  private final MealHistoryService mealHistoryService;
  private final MealInsightsService mealInsightsService;

  // === 现有方法保持不变 ===
  // ...

  // === 新增：History Log Endpoint ===
  
  /**
   * 获取用户的餐食历史记录（分页 + 日期过滤）
   * GET /api/v1/meals/history
   * 
   * @param page 页码（从0开始），默认0
   * @param size 每页记录数，默认20
   * @param startDate 开始日期（ISO格式：2025-01-01），可选
   * @param endDate 结束日期（ISO格式：2025-01-15），可选
   * @param sort 排序规则，默认 "consumedAt,desc"
   */
  @GetMapping("/history")
  public ResponseEntity<Page<MealResponse>> getMealHistory(
      @AuthenticationPrincipal AuthenticatedUser currentUser,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      @RequestParam(defaultValue = "consumedAt,desc") String sort
  ) {
    UUID userId = currentUser.userId();
    log.info("Fetching meal history for user: {}, page: {}, size: {}, startDate: {}, endDate: {}",
             userId, page, size, startDate, endDate);
    
    // 解析排序参数
    String[] sortParams = sort.split(",");
    String sortField = sortParams.length > 0 ? sortParams[0] : "consumedAt";
    Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc")
        ? Sort.Direction.ASC
        : Sort.Direction.DESC;
    
    Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
    
    // 调用 Service
    Page<MealLog> mealPage = mealHistoryService.getMealHistory(userId, startDate, endDate, pageable);
    
    // 转换为 Response DTO
    Page<MealResponse> responsePage = mealPage.map(this::toResponse);
    
    return ResponseEntity.ok(responsePage);
  }
  
  // === 新增：Weekly Insights Endpoint ===
  
  /**
   * 获取每周营养洞察数据
   * GET /api/v1/meals/insights/weekly
   * 
   * @param endDate 结束日期（默认今天），向前推7天
   */
  @GetMapping("/insights/weekly")
  public ResponseEntity<WeeklyInsightsResponse> getWeeklyInsights(
      @AuthenticationPrincipal AuthenticatedUser currentUser,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
  ) {
    UUID userId = currentUser.userId();
    log.info("Fetching weekly insights for user: {}, endDate: {}", userId, endDate);
    
    WeeklyInsightsResponse insights = mealInsightsService.getWeeklyInsights(userId, endDate);
    
    return ResponseEntity.ok(insights);
  }
}
```

---

### 4. DTO 定义

#### 4.1 MealHistoryResponse.java（复用现有 MealResponse）

现有的 `MealResponse` 已经包含所需字段，无需新增。

#### 4.2 WeeklyInsightsResponse.java（新增）

```java
package com.fitnessapp.backend.nutrition.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyInsightsResponse {
  private DateRange dateRange;
  private Summary summary;
  private List<DailyData> dailyData;
  private MacrosDistribution macrosDistribution;
  private SugarWarning sugarWarning;
  private UserGoal userGoal;
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DateRange {
    private String startDate;
    private String endDate;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Summary {
    private Long totalMeals;
    private Long totalCalories;
    private Double averageDailyCalories;
    private Double averageProtein;
    private Double averageCarbs;
    private Double averageFat;
    private Double averageSugar;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DailyData {
    private String date;
    private CaloriesData calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    private Double sugar;
    private Integer mealCount;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class CaloriesData {
    private Integer actual;
    private Integer target;
    private Double percentage;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MacrosDistribution {
    private MacroDetail protein;
    private MacroDetail carbs;
    private MacroDetail fat;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class MacroDetail {
    private Double grams;
    private Double percentage;
    private Integer caloriesFromProtein;
    private Integer caloriesFromCarbs;
    private Integer caloriesFromFat;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class SugarWarning {
    private Boolean hasWarning;
    private Double averageDailySugar;
    private Double recommendedLimit;
    private Integer daysExceeded;
    private String message;
  }
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class UserGoal {
    private Integer dailyCalorieTarget;
    private Integer dailyProteinTarget;
    private Integer dailyCarbsTarget;
    private Integer dailyFatTarget;
  }
}
```

---

## 🗄️ 数据库考虑

### 现有表结构（无需修改）

```sql
-- meal_log 表（已存在）
CREATE TABLE meal_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_type VARCHAR(32) NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL,
  food_items JSONB,
  total_calories INTEGER,
  total_protein NUMERIC(8,2),
  total_carbs NUMERIC(8,2),
  total_fat NUMERIC(8,2),
  -- ... 其他字段
);

-- 索引建议（提升查询性能）
CREATE INDEX idx_meal_log_user_consumed 
  ON meal_log(user_id, consumed_at DESC);
```

### 未来扩展：添加 Sugar 字段

```sql
-- Migration: 添加 total_sugar 字段
ALTER TABLE meal_log 
ADD COLUMN total_sugar NUMERIC(8,2) DEFAULT 0;

-- 更新现有记录（从 food_items JSON 提取）
-- 需要根据实际 JSON 结构编写提取逻辑
```

---

## ✅ 实施检查清单

### Repository Layer
- [ ] 在 `MealLogRepository` 添加 `findMealHistory()` 方法
- [ ] 在 `MealLogRepository` 添加 `getDailyNutritionSummary()` 方法
- [ ] 在 `MealLogRepository` 添加 `getWeeklySummary()` 方法
- [ ] 添加投影接口 `DailyNutritionSummary` 和 `WeeklySummary`

### Service Layer
- [ ] 创建 `MealHistoryService.java`
- [ ] 创建 `MealInsightsService.java`
- [ ] 实现分页查询逻辑
- [ ] 实现周数据聚合逻辑
- [ ] 实现宏量营养素分布计算

### Controller Layer
- [ ] 在 `MealController` 添加 `/history` 端点
- [ ] 在 `MealController` 添加 `/insights/weekly` 端点
- [ ] 添加参数验证
- [ ] 添加错误处理

### DTO Layer
- [ ] 创建 `WeeklyInsightsResponse.java`
- [ ] 创建内部静态类（DateRange, Summary, DailyData 等）

### 测试
- [ ] 单元测试：Repository 查询方法
- [ ] 单元测试：Service 业务逻辑
- [ ] 集成测试：Controller 端点
- [ ] 性能测试：大数据量分页查询

### 文档
- [ ] 更新 API 文档（Swagger/OpenAPI）
- [ ] 更新 README
- [ ] 添加使用示例

---

## 🚀 性能优化建议

### 1. 数据库索引
```sql
-- 复合索引：提升日期范围查询性能
CREATE INDEX idx_meal_log_user_consumed 
  ON meal_log(user_id, consumed_at DESC);

-- 可选：按月分区表（如果数据量超大）
-- CREATE TABLE meal_log_2025_01 PARTITION OF meal_log ...
```

### 2. 查询优化
- ✅ 使用 Spring Data JPA Projection 减少数据传输
- ✅ 使用 `@Query` 避免 N+1 查询问题
- ✅ 在 Service 层添加 `@Transactional(readOnly = true)`

### 3. 缓存策略
```java
// 可选：缓存每周洞察数据（1小时过期）
@Cacheable(value = "weekly-insights", key = "#userId + '_' + #endDate")
public WeeklyInsightsResponse getWeeklyInsights(UUID userId, LocalDate endDate) {
  // ...
}
```

---

## 📊 前端集成示例

### History Log 前端调用

```typescript
// frontend/src/services/mealApi.ts

export interface MealHistoryParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export const getMealHistory = async (params: MealHistoryParams) => {
  const queryString = new URLSearchParams({
    page: String(params.page || 0),
    size: String(params.size || 20),
    ...(params.startDate && { startDate: params.startDate }),
    ...(params.endDate && { endDate: params.endDate }),
    ...(params.sort && { sort: params.sort }),
  }).toString();
  
  const response = await apiClient.get(`/api/v1/meals/history?${queryString}`);
  return response.data;
};

// React Query Hook
export const useMealHistory = (params: MealHistoryParams) => {
  return useQuery({
    queryKey: ['meal-history', params],
    queryFn: () => getMealHistory(params),
    staleTime: 2 * 60 * 1000, // 2分钟
  });
};
```

### Weekly Insights 前端调用

```typescript
export const getWeeklyInsights = async (endDate?: string) => {
  const url = endDate 
    ? `/api/v1/meals/insights/weekly?endDate=${endDate}`
    : '/api/v1/meals/insights/weekly';
  
  const response = await apiClient.get(url);
  return response.data;
};

// React Query Hook
export const useWeeklyInsights = (endDate?: string) => {
  return useQuery({
    queryKey: ['weekly-insights', endDate],
    queryFn: () => getWeeklyInsights(endDate),
    staleTime: 60 * 60 * 1000, // 1小时
  });
};
```

---

## 🎯 总结

### 核心优势
1. ✅ **零数据库迁移**：完全复用现有 `meal_log` 表
2. ✅ **高性能聚合**：利用数据库层面的 GROUP BY 和 SUM
3. ✅ **灵活分页**：支持自定义 page/size/sort
4. ✅ **类型安全**：使用 JPA Projection 接口
5. ✅ **前后端分离**：清晰的 DTO 结构

### 下一步行动
1. 实施 Repository 查询方法
2. 创建 Service 业务逻辑类
3. 扩展 Controller 端点
4. 创建 DTO 类
5. 编写单元测试
6. 更新 API 文档

**预估工作量**: 6-8 小时（包括测试）

---

**文档创建时间**: 2025-01-18  
**作者**: GitHub Copilot
