# Spring @Transactional 深度解析

## 📚 目录

1. [什么是脚本自动化](#1-什么是脚本自动化)
2. [为什么事务没有提交](#2-为什么事务没有提交)
3. [@Transactional 详解](#3-transactional-详解)
4. [如何避免事务问题](#4-如何避免事务问题)
5. [实战案例分析](#5-实战案例分析)

---

## 1. 什么是脚本自动化？

### 概念理解

**脚本自动化** = 把重复的命令写成脚本文件，一键执行

**通俗例子**:

#### ❌ 手动操作（繁琐）

```bash
# 每次都要手动输入这些命令
docker compose up -d postgres redis
sleep 5
export SPOONACULAR_API_KEY="c06acb6339d6428aa8715889da7ce962"
export YOUTUBE_API_KEY="AIzaSyCvugM8by8scvZcdLbGR9owMLt1HUTfPyY"
./gradlew clean
./gradlew bootRun
```

#### ✅ 脚本自动化（简洁）

创建 `start-app.sh`:
```bash
#!/bin/bash
# 这是一个自动化脚本

# 启动容器
docker compose up -d postgres redis
sleep 5

# 设置环境变量
export SPOONACULAR_API_KEY="c06acb6339d6428aa8715889da7ce962"
export YOUTUBE_API_KEY="AIzaSyCvugM8by8scvZcdLbGR9owMLt1HUTfPyY"

# 编译并启动
./gradlew clean bootRun
```

**使用**:
```bash
./start-app.sh  # 一个命令搞定！
```

### 脚本自动化的好处

| 手动操作 | 脚本自动化 |
|---------|-----------|
| 每次输入多条命令 | 一条命令搞定 |
| 容易出错（输错命令） | 不会出错（固定流程） |
| 记不住复杂命令 | 不需要记 |
| 无法分享给别人 | 分享脚本即可 |
| 浪费时间 | 节省时间 |

### 实际例子

#### 例子 1: 测试 API 脚本

创建 `test-api.sh`:
```bash
#!/bin/bash

echo "🧪 Testing Recipe Import..."

# 1. 检查应用健康
HEALTH=$(curl -s http://localhost:8080/actuator/health | jq -r '.status')
if [ "$HEALTH" != "UP" ]; then
    echo "❌ App is not healthy"
    exit 1
fi
echo "✅ App is healthy"

# 2. 查看当前数量
BEFORE=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp \
    -c "SELECT COUNT(*) FROM recipe;" | grep -oP '\d+')
echo "📊 Before import: $BEFORE recipes"

# 3. 执行导入
echo "🚀 Importing recipes..."
RESULT=$(curl -s -X POST "http://localhost:8080/api/admin/import/recipes/curated")
echo "$RESULT" | jq '.'

# 4. 查看导入后数量
AFTER=$(docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp \
    -c "SELECT COUNT(*) FROM recipe;" | grep -oP '\d+')
echo "📊 After import: $AFTER recipes"

# 5. 计算差值
IMPORTED=$((AFTER - BEFORE))
echo "✅ Successfully imported: $IMPORTED recipes"
```

**使用**:
```bash
chmod +x test-api.sh
./test-api.sh
```

#### 例子 2: 数据库备份脚本

创建 `backup-database.sh`:
```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_$DATE.sql"

echo "📦 Backing up database..."
docker compose exec -T postgres pg_dump -U fitnessuser fitness_mvp > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "✅ Backup completed: $BACKUP_FILE ($SIZE)"
else
    echo "❌ Backup failed"
    exit 1
fi
```

#### 例子 3: 性能测试脚本

创建 `performance-test.sh`:
```bash
#!/bin/bash

echo "⚡ Performance Testing..."

# 测试 10 次，计算平均响应时间
TOTAL=0
COUNT=10

for i in $(seq 1 $COUNT); do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" \
        "http://localhost:8080/api/content/recipes?page=0&size=20")
    echo "Test $i: ${TIME}s"
    TOTAL=$(echo "$TOTAL + $TIME" | bc)
done

AVG=$(echo "scale=3; $TOTAL / $COUNT" | bc)
echo ""
echo "📊 Average response time: ${AVG}s"

# 判断是否符合要求（< 0.3秒）
if (( $(echo "$AVG < 0.3" | bc -l) )); then
    echo "✅ Performance test passed!"
else
    echo "❌ Performance test failed (requirement: < 0.3s)"
fi
```

### 脚本自动化 vs CI/CD

| 概念 | 运行方式 | 使用场景 |
|------|---------|---------|
| **脚本自动化** | 手动执行脚本 | 本地开发、手动测试 |
| **CI/CD** | 自动触发（代码提交时） | 持续集成、自动部署 |

**例子**: GitHub Actions (CI/CD)

`.github/workflows/test.yml`:
```yaml
name: Test

on: [push]  # 每次 push 代码时自动运行

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: ./gradlew test  # 自动执行测试脚本
```

---

## 2. 为什么事务没有提交？

### 问题分析

让我检查你当前的代码：

```java
private void persistRecipe(SearchResult summary, String primaryIngredient) 
    throws JsonProcessingException {
    // 没有 @Transactional 注解！
    Recipe recipe = Recipe.builder()...
    recipe = recipeRepository.save(recipe);  // 保存但可能没提交
}
```

### 事务提交失败的原因

#### 原因 1: 缺少 @Transactional 注解 ⭐

**问题**:
```java
// ❌ 没有事务管理
private void persistRecipe(...) {
    recipeRepository.save(recipe);  // 保存到内存，但没有提交到数据库
}
```

**解决**:
```java
// ✅ 有事务管理
@Transactional
public void persistRecipe(...) {
    recipeRepository.save(recipe);  // 方法结束时自动提交
}
```

#### 原因 2: @Transactional 在 private 方法上 ⭐⭐

**Spring 的限制**: `@Transactional` 只对 **public** 或 **protected** 方法有效

**为什么？** Spring 使用 **AOP 代理** 来实现事务管理：

```
正常调用流程:
Controller → Service.publicMethod() → repository.save()

Spring 代理流程:
Controller → 【代理】 → Service.publicMethod() → repository.save()
                ↑
            开启事务、提交事务
```

**private 方法无法被代理**:
```
同一个类内部调用:
Service.publicMethod() → Service.privateMethod()
                              ↑
                         代理拦截不到！
```

**错误示例**:
```java
@Service
public class RecipeCuratorService {
    
    public void importRecipes() {
        // ... 逻辑
        persistRecipe(data);  // 内部调用 private 方法
    }
    
    @Transactional  // ❌ 无效！因为是 private 方法
    private void persistRecipe(...) {
        recipeRepository.save(recipe);
    }
}
```

**正确做法**:
```java
@Service
public class RecipeCuratorService {
    
    public void importRecipes() {
        // ... 逻辑
        persistRecipe(data);  // 调用 protected 方法
    }
    
    @Transactional  // ✅ 有效！
    protected void persistRecipe(...) {
        recipeRepository.save(recipe);
    }
}
```

#### 原因 3: 调用方法也在事务中，但抛出异常

```java
@Transactional
public void importRecipes() {
    try {
        persistRecipe(data1);  // 成功
        persistRecipe(data2);  // 抛出异常
    } catch (Exception e) {
        // 捕获了异常，但事务已经标记为回滚
        log.error("Error", e);
    }
    // 方法结束，Spring 发现事务被标记为回滚
    // 所有操作都回滚，data1 和 data2 都没保存
}
```

#### 原因 4: 没有配置事务管理器

`application.yml` 需要配置:
```yaml
spring:
  jpa:
    properties:
      hibernate:
        enable_lazy_load_no_trans: true  # 允许懒加载
  datasource:
    url: jdbc:postgresql://localhost:5432/fitness_mvp
```

### 我们项目的具体问题

**当前代码**:
```java
// 1. 调用方法没有 @Transactional
public Map<String, Object> curateTopRecipes() {
    for (String ingredient : CURATED_INGREDIENTS) {
        try {
            List<SearchResult> results = spoonacularService.searchRecipesByIngredient(ingredient);
            for (SearchResult result : results) {
                persistRecipe(result, ingredient);  // ❌ 这里调用
            }
        } catch (Exception e) {
            log.warn("Failed for {}", ingredient, e);
        }
    }
}

// 2. persistRecipe 是 private 方法，即使加 @Transactional 也无效
private void persistRecipe(...) {  // ❌ private 方法
    recipeRepository.save(recipe);
}
```

**为什么数据丢失**:
1. `persistRecipe` 是 private 方法
2. 没有 `@Transactional` 注解
3. 即使有，Spring 也拦截不到 private 方法
4. **结果**: `save()` 只是把数据放到 Hibernate 缓存，没有 COMMIT 到数据库
5. 方法结束后，缓存清空，数据丢失

---

## 3. @Transactional 详解

### 什么是事务 (Transaction)？

**事务** = 一组必须**全部成功**或**全部失败**的数据库操作

**经典例子: 银行转账**

```java
@Transactional
public void transfer(Account from, Account to, int amount) {
    from.setBalance(from.getBalance() - amount);  // 操作 1: 扣款
    accountRepository.save(from);
    
    to.setBalance(to.getBalance() + amount);      // 操作 2: 加款
    accountRepository.save(to);
    
    // 如果操作 2 失败（如断电），操作 1 也会回滚
    // 保证数据一致性：要么都成功，要么都失败
}
```

**没有事务的后果**:
```
操作 1 成功: A 账户扣了 100 元
操作 2 失败: B 账户没收到钱
结果: 100 元凭空消失！💸
```

**有事务保护**:
```
操作 1 成功: A 账户扣了 100 元（暂存）
操作 2 失败: 检测到错误
结果: 回滚操作 1，A 账户恢复原状 ✅
```

### @Transactional 的工作原理

#### 1. Spring AOP 代理

**没有 @Transactional**:
```
Controller → Service.method() → Repository.save()
                                      ↓
                                  直接写入数据库
```

**有 @Transactional**:
```
Controller → [代理拦截] → Service.method() → Repository.save()
              ↓                                     ↓
          1. BEGIN TRANSACTION               2. 写入缓存
                                                    ↓
          3. COMMIT (方法成功) ← ─ ─ ─ ─ ─ 方法结束
          4. ROLLBACK (方法失败)
```

#### 2. 代理生成过程

**原始代码**:
```java
@Service
public class RecipeService {
    
    @Transactional
    public void saveRecipe(Recipe recipe) {
        recipeRepository.save(recipe);
    }
}
```

**Spring 生成的代理类（伪代码）**:
```java
public class RecipeService$Proxy extends RecipeService {
    
    private TransactionManager txManager;
    private RecipeService target;  // 原始对象
    
    @Override
    public void saveRecipe(Recipe recipe) {
        TransactionStatus tx = null;
        try {
            // 1. 开启事务
            tx = txManager.getTransaction();
            
            // 2. 调用原始方法
            target.saveRecipe(recipe);
            
            // 3. 提交事务
            txManager.commit(tx);
            
        } catch (Exception e) {
            // 4. 回滚事务
            if (tx != null) {
                txManager.rollback(tx);
            }
            throw e;
        }
    }
}
```

### @Transactional 的重要属性

#### 1. propagation (传播行为)

控制事务如何传播到其他方法

```java
@Transactional(propagation = Propagation.REQUIRED)  // 默认
public void method1() {
    method2();  // 使用同一个事务
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void method2() {
    // 创建新事务，独立于 method1
}
```

**常用值**:

| 值 | 含义 | 使用场景 |
|---|---|---|
| `REQUIRED` (默认) | 如果有事务就加入，没有就新建 | 大多数情况 |
| `REQUIRES_NEW` | 总是新建事务 | 独立的日志记录 |
| `NESTED` | 嵌套事务 | 部分回滚场景 |
| `NOT_SUPPORTED` | 不使用事务 | 只读查询 |

#### 2. isolation (隔离级别)

控制并发事务之间的影响

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void method() {
    // ...
}
```

**常用值**:

| 级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|-----|------|-----------|------|------|
| `READ_UNCOMMITTED` | ✗ | ✗ | ✗ | 最快 |
| `READ_COMMITTED` (默认) | ✓ | ✗ | ✗ | 快 |
| `REPEATABLE_READ` | ✓ | ✓ | ✗ | 慢 |
| `SERIALIZABLE` | ✓ | ✓ | ✓ | 最慢 |

#### 3. readOnly (只读)

优化查询性能

```java
@Transactional(readOnly = true)
public List<Recipe> getAllRecipes() {
    return recipeRepository.findAll();
}
```

**好处**:
- Hibernate 不会flush缓存
- 数据库可以优化查询
- 避免脏写

#### 4. timeout (超时)

设置事务超时时间（秒）

```java
@Transactional(timeout = 5)  // 5秒超时
public void longOperation() {
    // 如果超过5秒，自动回滚
}
```

#### 5. rollbackFor (回滚条件)

指定哪些异常触发回滚

```java
@Transactional(rollbackFor = Exception.class)  // 所有异常都回滚
public void method() {
    // ...
}
```

**默认行为**:
- **RuntimeException** (unchecked): 回滚
- **Exception** (checked): 不回滚

---

## 4. 如何避免事务问题？

### 最佳实践

#### ✅ 规则 1: 在 Service 层的 public 方法上使用

```java
@Service
public class RecipeService {
    
    @Transactional  // ✅ public 方法
    public void importRecipes() {
        // 业务逻辑
    }
    
    @Transactional  // ❌ 不要在 private 方法上用
    private void helperMethod() {
        // ...
    }
}
```

#### ✅ 规则 2: 避免在同一类内部调用

```java
// ❌ 错误：内部调用导致事务失效
@Service
public class RecipeService {
    
    public void importRecipes() {
        saveRecipe(recipe);  // 内部调用，@Transactional 失效
    }
    
    @Transactional
    public void saveRecipe(Recipe recipe) {
        recipeRepository.save(recipe);
    }
}

// ✅ 正确：通过注入的Bean调用
@Service
public class RecipeService {
    
    @Autowired
    private RecipeService self;  // 注入自己
    
    public void importRecipes() {
        self.saveRecipe(recipe);  // 通过代理调用，事务生效
    }
    
    @Transactional
    public void saveRecipe(Recipe recipe) {
        recipeRepository.save(recipe);
    }
}
```

#### ✅ 规则 3: 合理处理异常

```java
// ❌ 错误：捕获异常导致事务不回滚
@Transactional
public void importRecipes() {
    try {
        recipeRepository.save(recipe);
    } catch (Exception e) {
        log.error("Error", e);  // 吞掉异常，事务不会回滚
    }
}

// ✅ 正确：重新抛出异常
@Transactional
public void importRecipes() {
    try {
        recipeRepository.save(recipe);
    } catch (Exception e) {
        log.error("Error", e);
        throw e;  // 重新抛出，触发回滚
    }
}

// ✅ 正确：手动标记回滚
@Transactional
public void importRecipes() {
    try {
        recipeRepository.save(recipe);
    } catch (Exception e) {
        log.error("Error", e);
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```

#### ✅ 规则 4: 事务边界要清晰

```java
// ❌ 事务太大，包含了外部API调用
@Transactional
public void importRecipes() {
    List<Recipe> recipes = externalAPI.fetchRecipes();  // 慢速网络调用
    recipes.forEach(recipeRepository::save);  // 数据库操作
}

// ✅ 只在数据库操作时使用事务
public void importRecipes() {
    List<Recipe> recipes = externalAPI.fetchRecipes();  // 不在事务中
    saveRecipes(recipes);  // 只有这里有事务
}

@Transactional
public void saveRecipes(List<Recipe> recipes) {
    recipes.forEach(recipeRepository::save);
}
```

#### ✅ 规则 5: 使用 @Transactional(readOnly = true) 优化查询

```java
// ✅ 查询方法标记为只读
@Transactional(readOnly = true)
public List<Recipe> searchRecipes(String keyword) {
    return recipeRepository.findByTitleContaining(keyword);
}
```

### 调试技巧

#### 1. 启用事务日志

`application.yml`:
```yaml
logging:
  level:
    org.springframework.transaction: DEBUG
    org.springframework.orm.jpa: DEBUG
```

**日志输出**:
```
Creating new transaction with name [RecipeService.saveRecipe]
Opened new EntityManager
Participating in existing transaction
Committing JPA transaction
Closing JPA EntityManager
```

#### 2. 查看事务状态

```java
@Transactional
public void saveRecipe(Recipe recipe) {
    // 打印当前事务状态
    TransactionStatus status = TransactionAspectSupport.currentTransactionStatus();
    log.info("Transaction active: {}", status.isNewTransaction());
    log.info("Rollback only: {}", status.isRollbackOnly());
    
    recipeRepository.save(recipe);
}
```

#### 3. 实时监控数据库

**终端 1**: 运行应用
```bash
./gradlew bootRun
```

**终端 2**: 监控数据库
```bash
watch -n 1 'docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"'
```

执行导入操作时，可以看到数量实时变化。

---

## 5. 实战案例分析

### 案例 1: 我们的 Recipe 导入问题

#### 问题代码

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipeCuratorService {
    
    // ❌ 没有 @Transactional
    public Map<String, Object> curateTopRecipes() {
        for (String ingredient : CURATED_INGREDIENTS) {
            List<SearchResult> results = spoonacularService.searchRecipesByIngredient(ingredient);
            for (SearchResult result : results) {
                persistRecipe(result, ingredient);  // 调用 private 方法
            }
        }
    }
    
    // ❌ private 方法，@Transactional 无效
    private void persistRecipe(SearchResult summary, String primaryIngredient) {
        Recipe recipe = Recipe.builder()...
        recipeRepository.save(recipe);  // 只保存到缓存，没有提交
    }
}
```

#### 解决方案 1: 在外层方法添加 @Transactional

```java
@Transactional  // ✅ 在公共方法上
public Map<String, Object> curateTopRecipes() {
    for (String ingredient : CURATED_INGREDIENTS) {
        List<SearchResult> results = spoonacularService.searchRecipesByIngredient(ingredient);
        for (SearchResult result : results) {
            persistRecipe(result, ingredient);
        }
    }
    // 方法结束，自动提交所有 recipe
}

// 不需要 @Transactional，使用外层事务
private void persistRecipe(SearchResult summary, String primaryIngredient) {
    Recipe recipe = Recipe.builder()...
    recipeRepository.save(recipe);
}
```

**问题**: 如果中途失败，已导入的数据也会回滚

#### 解决方案 2: 每个 recipe 单独事务

```java
public Map<String, Object> curateTopRecipes() {
    int successCount = 0;
    for (String ingredient : CURATED_INGREDIENTS) {
        List<SearchResult> results = spoonacularService.searchRecipesByIngredient(ingredient);
        for (SearchResult result : results) {
            try {
                persistRecipe(result, ingredient);
                successCount++;
            } catch (Exception e) {
                log.warn("Failed to import {}", result.title(), e);
            }
        }
    }
    return Map.of("imported", successCount);
}

@Transactional  // ✅ protected 方法，可以被代理
protected void persistRecipe(SearchResult summary, String primaryIngredient) {
    Recipe recipe = Recipe.builder()...
    recipeRepository.save(recipe);
    // 方法结束，自动提交
}
```

**优点**: 单个失败不影响其他

#### 解决方案 3: 批量提交

```java
@Transactional
public Map<String, Object> curateTopRecipes() {
    List<Recipe> recipesToSave = new ArrayList<>();
    
    for (String ingredient : CURATED_INGREDIENTS) {
        List<SearchResult> results = spoonacularService.searchRecipesByIngredient(ingredient);
        for (SearchResult result : results) {
            Recipe recipe = buildRecipe(result, ingredient);
            recipesToSave.add(recipe);
        }
    }
    
    // 批量保存，性能更好
    recipeRepository.saveAll(recipesToSave);
    
    return Map.of("imported", recipesToSave.size());
}
```

### 案例 2: 级联保存问题

```java
// Recipe 和 RecipeIngredient 是一对多关系

// ❌ 错误：没有级联事务
public void saveRecipeWithIngredients(Recipe recipe, List<Ingredient> ingredients) {
    recipeRepository.save(recipe);  // 保存 recipe
    
    for (Ingredient ing : ingredients) {
        RecipeIngredient ri = new RecipeIngredient(recipe, ing);
        recipeIngredientRepository.save(ri);  // 可能失败
    }
}

// ✅ 正确：使用事务和级联
@Transactional
public void saveRecipeWithIngredients(Recipe recipe, List<Ingredient> ingredients) {
    recipe = recipeRepository.save(recipe);
    
    for (Ingredient ing : ingredients) {
        RecipeIngredient ri = new RecipeIngredient(recipe, ing);
        recipe.getIngredients().add(ri);  // 通过关系保存
    }
    
    recipeRepository.save(recipe);  // 级联保存所有 ingredients
    // 全部成功或全部失败
}
```

---

## 📋 总结

### 核心要点

1. **脚本自动化**: 把重复命令写成脚本文件，一键执行，节省时间避免错误

2. **事务失败原因**:
   - ❌ 缺少 `@Transactional` 注解
   - ❌ 在 private 方法上使用 `@Transactional`
   - ❌ 同一类内部调用
   - ❌ 捕获异常但不重新抛出

3. **@Transactional 原理**: Spring 使用 AOP 代理拦截方法，自动管理事务的开启、提交、回滚

4. **避免事务问题**:
   - ✅ 在 Service 层的 public 方法上使用
   - ✅ 避免内部调用，或通过注入的 Bean 调用
   - ✅ 异常要重新抛出或手动标记回滚
   - ✅ 事务边界要清晰，避免包含慢速操作
   - ✅ 查询方法使用 `readOnly = true`

### 快速检查清单

**检查代码时问自己**:

- [ ] `@Transactional` 在 public/protected 方法上？
- [ ] 是否是同一类内部调用？
- [ ] 异常是否被正确处理（重新抛出）？
- [ ] 事务范围是否合理（不包含网络调用）？
- [ ] 是否启用了事务日志来调试？

### 修复建议（针对你的代码）

```java
// 当前代码问题：persistRecipe 是 private 方法，没有 @Transactional

// 建议修复：
@Transactional(propagation = Propagation.REQUIRES_NEW)
protected void persistRecipe(SearchResult summary, String primaryIngredient) 
    throws JsonProcessingException {
    // ... 保存逻辑
}
```

或者:

```java
@Transactional
public Map<String, Object> curateTopRecipes() {
    // 整个导入过程在一个事务中
    for (String ingredient : CURATED_INGREDIENTS) {
        // ...
        persistRecipe(result, ingredient);  // private 方法在外层事务中执行
    }
}
```

---

**文档创建时间**: 2025-10-17  
**作者**: GitHub Copilot  
**状态**: 生产就绪
