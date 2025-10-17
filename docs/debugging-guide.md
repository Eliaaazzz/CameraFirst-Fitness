# 调试指南 - Debugging Guide

## 📚 目录 (Table of Contents)

1. [如何确保数据不丢失](#1-如何确保数据不丢失)
2. [什么是 Hibernate](#2-什么是-hibernate)
3. [如何测试导入 - 实用命令](#3-如何测试导入---实用命令)
4. [curl 命令详解](#4-curl-命令详解)
5. [故障排除步骤](#5-故障排除步骤)

---

## 1. 如何确保数据不丢失

### 问题根源 (Root Cause)

在我们的项目中，发现了一个**关键问题**：

```java
// ❌ 错误的写法 - @Transactional 在 private 方法上不起作用
@Transactional
private void persistRecipe(SearchResult summary, String primaryIngredient) {
    // ... 保存数据的代码
}
```

**为什么数据丢失？**

1. **Spring 的代理机制**: Spring 使用 **AOP (面向切面编程)** 来实现事务管理
2. **代理限制**: Spring 只能代理 **public** 或 **protected** 方法，不能代理 private 方法
3. **结果**: 即使加了 `@Transactional`，事务也不会生效，数据可能在方法执行完后丢失

### 解决方案 (Solutions)

#### 方案 1: 改为 protected 方法 ✅ (推荐)

```java
// ✅ 正确的写法
@Transactional
protected void persistRecipe(SearchResult summary, String primaryIngredient) {
    // ... 保存数据的代码
}
```

#### 方案 2: 在公共方法上添加 @Transactional

```java
@Transactional
public Map<String, Object> curateTopRecipes() {
    // ... 调用 persistRecipe 的代码
}

private void persistRecipe(SearchResult summary, String primaryIngredient) {
    // ... 保存数据的代码
}
```

### 如何验证数据是否保存成功

#### 步骤 1: 导入前查询

```bash
# 查询当前 recipe 数量
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"
```

**输出示例:**
```
 count 
-------
     5
(1 row)
```

#### 步骤 2: 执行导入

```bash
# 执行导入请求
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated"
```

**输出示例:**
```json
{
  "targetRecipes": 60,
  "curatedCount": 43,
  "skippedExisting": 102,
  "rejectedCount": 67
}
```

#### 步骤 3: 导入后查询

```bash
# 再次查询 recipe 数量
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"
```

**预期输出:**
```
 count 
-------
    48    # 5 (原有) + 43 (新导入) = 48
(1 row)
```

**如果数量没变，说明事务没有提交！**

#### 步骤 4: 查看最新导入的数据

```bash
# 按创建时间倒序查看最新的 10 条
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT id, title, time_minutes FROM recipe ORDER BY created_at DESC LIMIT 10;"
```

### 检查事务是否生效的方法

#### 方法 1: 查看应用日志

```bash
# 查看日志中的事务相关信息
tail -f /tmp/fitness-app.log | grep -i "transaction\|rollback\|commit"
```

**如果事务正常，会看到:**
```
Transaction started
...操作日志...
Transaction committed successfully
```

**如果有问题，会看到:**
```
Transaction rolled back
Exception in transaction
```

#### 方法 2: 启用 Hibernate SQL 日志

在 `application.yml` 中添加:

```yaml
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
    org.springframework.transaction: DEBUG
```

重启应用后，可以看到每条 SQL 语句和事务边界。

#### 方法 3: 实时监控数据库连接

在另一个终端窗口运行:

```bash
# 每 2 秒查询一次 recipe 数量
watch -n 2 'docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"'
```

然后执行导入，可以实时看到数量变化。

---

## 2. 什么是 Hibernate

### 简介 (Introduction)

**Hibernate** 是一个 **ORM (Object-Relational Mapping)** 框架。

**通俗解释:**
- **问题**: Java 是面向对象的，数据库是关系型的，两者不匹配
- **Hibernate 的作用**: 自动在 Java 对象和数据库表之间做转换
- **好处**: 你不需要写 SQL，直接操作 Java 对象即可

### 核心概念

#### 1. Entity (实体类)

```java
@Entity                    // 告诉 Hibernate: 这是一个数据库表
@Table(name = "recipe")    // 表名是 "recipe"
public class Recipe {
    @Id                                // 主键
    @GeneratedValue                    // 自动生成
    private UUID id;
    
    @Column(nullable = false)          // 列不能为空
    private String title;
    
    @Column(name = "time_minutes")     // 列名映射
    private Integer timeMinutes;
}
```

**对应的数据库表:**
```sql
CREATE TABLE recipe (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    time_minutes INTEGER
);
```

#### 2. Repository (仓库)

```java
public interface RecipeRepository extends JpaRepository<Recipe, UUID> {
    // 不需要写任何代码，Hibernate 自动提供这些方法:
    // - save(recipe)           保存
    // - findById(id)           按 ID 查询
    // - findAll()              查询所有
    // - deleteById(id)         按 ID 删除
    // - count()                统计数量
}
```

**使用示例:**
```java
// 保存一个 recipe
Recipe recipe = new Recipe();
recipe.setTitle("Chicken Soup");
recipe.setTimeMinutes(30);
recipeRepository.save(recipe);  // Hibernate 自动生成并执行 INSERT SQL

// 查询所有 recipes
List<Recipe> all = recipeRepository.findAll();  // 自动执行 SELECT * FROM recipe
```

#### 3. Hibernate 自动生成的 SQL

**Java 代码:**
```java
Recipe recipe = Recipe.builder()
    .title("Chicken Soup")
    .timeMinutes(30)
    .build();
recipeRepository.save(recipe);
```

**Hibernate 自动生成并执行:**
```sql
INSERT INTO recipe (id, title, time_minutes, created_at) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Chicken Soup', 30, NOW());
```

### Hibernate vs 手写 SQL 对比

#### 传统 JDBC 方式 (手写 SQL)

```java
// ❌ 繁琐的方式
public void saveRecipe(Recipe recipe) {
    String sql = "INSERT INTO recipe (id, title, time_minutes) VALUES (?, ?, ?)";
    try (Connection conn = dataSource.getConnection();
         PreparedStatement stmt = conn.prepareStatement(sql)) {
        stmt.setObject(1, recipe.getId());
        stmt.setString(2, recipe.getTitle());
        stmt.setInt(3, recipe.getTimeMinutes());
        stmt.executeUpdate();
    } catch (SQLException e) {
        e.printStackTrace();
    }
}
```

#### Hibernate 方式

```java
// ✅ 简洁的方式
recipeRepository.save(recipe);
```

### Hibernate 的重要配置

在 `application.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update    # 自动更新表结构
```

**ddl-auto 的选项:**

| 值 | 含义 | 使用场景 |
|---|---|---|
| `create` | 启动时删除并重建所有表 | 开发环境，每次都要全新的数据库 |
| `create-drop` | 启动时创建，关闭时删除 | 单元测试 |
| `update` | 启动时更新表结构（不删除数据） | 开发环境 ⭐ |
| `validate` | 启动时验证表结构，不修改 | 生产环境 ⭐ |
| `none` | 什么都不做 | 完全手动管理 |

**我们的问题:**
- 之前使用 `validate`，但数据库和代码不匹配
- 改为 `update` 后，Hibernate 会自动调整表结构

### Hibernate 的事务管理

```java
@Transactional  // 告诉 Hibernate: 这个方法里的所有操作是一个事务
public void importRecipes() {
    Recipe r1 = new Recipe();
    recipeRepository.save(r1);  // 操作 1
    
    Recipe r2 = new Recipe();
    recipeRepository.save(r2);  // 操作 2
    
    // 如果任何操作失败，所有操作都会回滚
    // 如果全部成功，方法结束时自动提交
}
```

**事务的 ACID 特性:**
- **A**tomicity (原子性): 全部成功或全部失败
- **C**onsistency (一致性): 数据保持一致状态
- **I**solation (隔离性): 多个事务互不干扰
- **D**urability (持久性): 提交后数据永久保存

---

## 3. 如何测试导入 - 实用命令

### 完整的测试流程

#### 步骤 1: 检查 Docker 容器状态

```bash
# 查看所有容器
docker compose ps
```

**预期输出:**
```
NAME                             STATUS
camerafirst-fitness-postgres-1   Up (healthy)
camerafirst-fitness-redis-1      Up (healthy)
```

**如果容器没运行:**
```bash
# 启动容器
docker compose up -d postgres redis
```

#### 步骤 2: 检查数据库连接

```bash
# 测试数据库连接
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT 1;"
```

**预期输出:**
```
 ?column? 
----------
        1
(1 row)
```

#### 步骤 3: 检查应用健康状态

```bash
# 检查应用是否启动
curl -s http://localhost:8080/actuator/health
```

**预期输出:**
```json
{"status":"UP","groups":["liveness","readiness"]}
```

**如果应用没启动:**
```bash
# 启动应用
./start-app.sh
```

#### 步骤 4: 查看当前数据

```bash
# 查询 recipe 数量
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"

# 查询 video 数量
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM workout_video;"

# 查看最新的 5 条 recipes
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT id, title, time_minutes FROM recipe ORDER BY created_at DESC LIMIT 5;"
```

#### 步骤 5: 执行导入

```bash
# 导入 recipes
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated"

# 导入 videos
curl -X POST "http://localhost:8080/api/admin/import/videos/curated"
```

#### 步骤 6: 验证导入结果

```bash
# 再次查询数量，对比导入前后的变化
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"

# 查看按食材分布
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT 
     COALESCE(nutrition_summary->>'primaryIngredient', 'unknown') as ingredient,
     COUNT(*) as count
   FROM recipe 
   GROUP BY nutrition_summary->>'primaryIngredient'
   ORDER BY count DESC;"
```

### 常用数据库查询命令

#### 进入 PostgreSQL 交互式终端

```bash
# 进入 psql 交互模式
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp
```

**在 psql 中可以执行的命令:**

```sql
-- 查看所有表
\dt

-- 查看表结构
\d recipe
\d workout_video

-- 查询数据
SELECT * FROM recipe LIMIT 10;

-- 退出
\q
```

#### 一次性执行 SQL 命令

```bash
# 格式: docker compose exec -T postgres psql -U 用户名 -d 数据库名 -c "SQL命令"

# 示例 1: 统计数量
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT COUNT(*) FROM recipe;"

# 示例 2: 查询特定列
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT id, title FROM recipe WHERE time_minutes < 30;"

# 示例 3: 复杂查询 - 按时间分组
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT 
     CASE 
       WHEN time_minutes < 20 THEN '快手 (< 20 min)'
       WHEN time_minutes < 40 THEN '中等 (20-40 min)'
       ELSE '耗时 (> 40 min)'
     END as time_category,
     COUNT(*) as count
   FROM recipe
   GROUP BY time_category
   ORDER BY count DESC;"
```

### 应用日志查看命令

```bash
# 查看最新 100 行日志
tail -100 /tmp/fitness-app.log

# 实时跟踪日志（类似 tail -f）
tail -f /tmp/fitness-app.log

# 只看包含 "Imported recipe" 的日志
grep "Imported recipe" /tmp/fitness-app.log

# 只看错误和警告
grep -i "ERROR\|WARN" /tmp/fitness-app.log

# 查看特定时间段的日志（例如 20:00 到 20:10）
grep "2025-10-17T20:0[0-9]" /tmp/fitness-app.log

# 统计导入了多少个 recipes
grep "Imported recipe" /tmp/fitness-app.log | wc -l
```

### 性能测试命令

```bash
# 测试 API 响应时间
time curl -s "http://localhost:8080/api/content/recipes?page=0&size=20" > /dev/null

# 输出示例:
# real    0m0.234s    # 总时间 234ms
# user    0m0.010s
# sys     0m0.008s

# 测试并发请求（需要安装 apache-bench）
# 10 个并发，总共 100 个请求
ab -n 100 -c 10 http://localhost:8080/api/content/recipes?page=0&size=20
```

---

## 4. curl 命令详解

### curl 是什么？

**curl** = **C**lient **URL**

**作用**: 在命令行中发送 HTTP 请求（类似浏览器，但是文本界面）

**为什么要用 curl？**
- 在终端中快速测试 API
- 写脚本自动化测试
- 不需要打开浏览器或 Postman

### 基本语法

```bash
curl [选项] [URL]
```

### 常用选项详解

#### 1. GET 请求（默认）

```bash
# 最简单的用法 - GET 请求
curl http://localhost:8080/actuator/health

# 输出:
# {"status":"UP","groups":["liveness","readiness"]}
```

#### 2. POST 请求

```bash
# -X POST 或 --request POST
curl -X POST http://localhost:8080/api/admin/import/recipes/curated
```

#### 3. 发送 JSON 数据

```bash
# -H 设置 header，-d 设置 data（body）
curl -X POST http://localhost:8080/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Recipe", "timeMinutes": 30}'
```

#### 4. 保存响应到文件

```bash
# -o 指定输出文件名
curl -o response.json http://localhost:8080/api/content/recipes

# -O 使用URL中的文件名
curl -O http://example.com/file.pdf
```

#### 5. 静默模式（不显示进度条）

```bash
# -s 或 --silent
curl -s http://localhost:8080/actuator/health
```

#### 6. 显示 HTTP 响应头

```bash
# -i 显示响应头
curl -i http://localhost:8080/actuator/health

# 输出:
# HTTP/1.1 200 
# Content-Type: application/json
# Content-Length: 60
# 
# {"status":"UP"}
```

#### 7. 只显示 HTTP 状态码

```bash
# -w 自定义输出格式，-o /dev/null 丢弃响应体
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health

# 输出:
# 200
```

#### 8. 显示详细调试信息

```bash
# -v 或 --verbose
curl -v http://localhost:8080/actuator/health

# 输出:
# * Trying 127.0.0.1:8080...
# * Connected to localhost (127.0.0.1) port 8080 (#0)
# > GET /actuator/health HTTP/1.1
# > Host: localhost:8080
# ...
```

#### 9. 跟随重定向

```bash
# -L 或 --location
curl -L http://example.com
```

#### 10. 设置超时时间

```bash
# --connect-timeout 连接超时（秒）
# --max-time 总超时（秒）
curl --connect-timeout 5 --max-time 10 http://localhost:8080/api/recipes
```

### 实际应用示例

#### 示例 1: 测试健康检查

```bash
# 检查应用是否启动
curl -s http://localhost:8080/actuator/health | grep -q "UP" && echo "✅ App is healthy" || echo "❌ App is down"
```

#### 示例 2: 导入并记录响应

```bash
# 导入 recipes 并保存响应到文件
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated" \
  -o import-result.json

# 查看结果
cat import-result.json | jq '.'
```

#### 示例 3: 带认证的请求

```bash
# 使用 Basic Auth
curl -u username:password http://localhost:8080/api/admin/status

# 使用 Bearer Token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/recipes
```

#### 示例 4: 上传文件

```bash
# -F 表示 multipart/form-data
curl -X POST http://localhost:8080/api/upload \
  -F "file=@/path/to/file.jpg" \
  -F "description=My photo"
```

#### 示例 5: 测试 API 响应时间

```bash
# 显示各个阶段的耗时
curl -w "\nTime: %{time_total}s\nStatus: %{http_code}\n" \
  -o /dev/null -s \
  http://localhost:8080/api/content/recipes
```

### curl vs 其他工具对比

| 工具 | 优点 | 缺点 | 使用场景 |
|-----|------|------|---------|
| **curl** | 命令行，轻量，脚本友好 | 不直观 | 自动化测试，CI/CD |
| **Postman** | 图形界面，功能强大 | 需要安装，较重 | 手动测试，API 文档 |
| **HTTPie** | 比 curl 更友好的输出 | 需要额外安装 | 命令行测试 |
| **浏览器** | 最直观 | 只能 GET 请求 | 查看网页 |

### curl 进阶技巧

#### 1. 使用配置文件

创建 `curl-config.txt`:
```
url = "http://localhost:8080/api/recipes"
header = "Content-Type: application/json"
header = "Authorization: Bearer TOKEN"
```

使用:
```bash
curl -K curl-config.txt
```

#### 2. 批量请求

```bash
# 循环请求多个页面
for i in {0..10}; do
  curl -s "http://localhost:8080/api/content/recipes?page=$i&size=20"
done
```

#### 3. 与 jq 结合处理 JSON

```bash
# 只提取 count 字段
curl -s http://localhost:8080/api/content/recipes | jq '.totalElements'

# 美化输出
curl -s http://localhost:8080/actuator/health | jq '.'

# 提取数组中的特定字段
curl -s http://localhost:8080/api/content/recipes | jq '.content[].title'
```

---

## 5. 故障排除步骤

### 问题 1: 应用启动失败

#### 症状
```bash
curl http://localhost:8080/actuator/health
# curl: (7) Failed to connect to localhost port 8080: Connection refused
```

#### 排查步骤

1. **检查进程是否运行**
```bash
ps aux | grep java
# 如果没有输出，说明应用没运行
```

2. **查看启动日志**
```bash
tail -50 /tmp/fitness-app.log
# 查找 "ERROR" 或 "Exception"
```

3. **常见错误及解决方案**

**错误: 端口被占用**
```
Port 8080 was already in use
```
**解决:**
```bash
# 找到占用端口的进程
lsof -i :8080

# 杀死进程
kill -9 <PID>
```

**错误: 数据库连接失败**
```
Connection to localhost:5432 refused
```
**解决:**
```bash
# 检查 PostgreSQL 是否运行
docker compose ps postgres

# 如果没运行，启动它
docker compose up -d postgres
```

### 问题 2: 数据导入后数量不变

#### 症状
```bash
# 导入前
SELECT COUNT(*) FROM recipe;  -- 5

# 导入后
SELECT COUNT(*) FROM recipe;  -- 还是 5
```

#### 排查步骤

1. **检查 API 响应**
```bash
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated"
# {"curatedCount": 43, ...}  # 说明 API 执行了
```

2. **检查应用日志**
```bash
grep "Imported recipe" /tmp/fitness-app.log | wc -l
# 如果显示 43，说明代码执行了
```

3. **检查事务配置**
```bash
grep "@Transactional" src/main/java/com/fitnessapp/backend/recipe/RecipeCuratorService.java
# 确保注解在 public 或 protected 方法上
```

4. **检查数据库约束**
```bash
# 查看是否有唯一约束冲突
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c \
  "SELECT * FROM recipe WHERE title = 'Turkey Pot Pie';"
```

### 问题 3: API 配额耗尽

#### 症状
```
402 Payment Required: "Your daily points limit of 50 has been reached"
```

#### 解决方案

1. **等待配额重置**（每天 UTC 午夜）
```bash
# 检查当前 UTC 时间
date -u
# 计算还需要等多久到午夜
```

2. **检查已消耗的配额**
```bash
# 统计 API 调用次数
grep "complex search" /tmp/fitness-app.log | wc -l
```

3. **优化 API 使用**
- 减少食材种类（从 12 个减到 6 个）
- 增加过滤条件，减少返回结果
- 使用缓存避免重复请求

### 问题 4: Docker 容器无法启动

#### 症状
```
Cannot connect to the Docker daemon
```

#### 解决方案

```bash
# 检查 Docker Desktop 是否运行
docker ps
# 如果失败，说明 Docker 没运行

# 启动 Docker Desktop
open -a Docker

# 等待 Docker 启动（约 30 秒）
sleep 30

# 验证
docker ps
```

---

## 📝 总结

### 关键要点

1. **数据持久化**: 确保 `@Transactional` 在 public/protected 方法上
2. **Hibernate**: ORM 框架，自动处理 Java 对象和数据库的转换
3. **curl**: 命令行 HTTP 客户端，用于测试 API
4. **PostgreSQL 命令**: 使用 `docker compose exec` 直接查询数据库
5. **日志分析**: 通过 `grep`、`tail` 等命令分析应用日志

### 实用命令速查表

```bash
# 启动应用
./start-app.sh

# 检查健康状态
curl -s http://localhost:8080/actuator/health

# 导入 recipes
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated"

# 查询数据库
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"

# 查看日志
tail -f /tmp/fitness-app.log

# 停止应用
pkill -f 'gradlew bootRun'

# 重启 Docker 容器
docker compose restart postgres redis
```

---

Last Updated: 2025-10-17  
Author: GitHub Copilot  
Status: Ready for use
