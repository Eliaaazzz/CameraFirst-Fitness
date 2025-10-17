# 技术深度讲解：Curated Video Import 实现

## 目录
1. [核心架构设计](#核心架构设计)
2. [关键技术难点](#关键技术难点)
3. [Java 17+ 现代语法详解](#java-17-现代语法详解)
4. [Spring Boot 集成技巧](#spring-boot-集成技巧)
5. [性能优化策略](#性能优化策略)
6. [错误处理机制](#错误处理机制)

---

## 核心架构设计

### 三层架构模式

```
Controller (API Layer)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
```

**文件映射**:
```
ImportController.java      → REST API endpoints
YouTubeCuratorService.java → 核心业务逻辑
WorkoutVideoRepository.java → JPA 数据访问层
```

---

## 关键技术难点

### 难点 1: Java Record 的不可变数据传输

#### **代码示例**: `PlaylistImportRequest.java`

```java
@Builder
@Jacksonized
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PlaylistImportRequest(
        String playlistId,
        String alias,
        String equipment,
        List<String> equipmentList,
        String level,
        List<String> bodyParts,
        Integer targetCount,
        Integer maxDurationSeconds,
        Long minViewCount,
        Long minSubscriberCount) {
    
    @JsonIgnore
    public int maxDurationSecondsOrDefault() {
        return maxDurationSeconds != null && maxDurationSeconds > 0 
            ? maxDurationSeconds 
            : 300; // 5 minutes
    }
}
```

#### **技术要点**:

1. **Record 类型 (Java 14+)**
   ```java
   public record PlaylistImportRequest(...) { }
   ```
   - **自动生成**: constructor, getters, `equals()`, `hashCode()`, `toString()`
   - **不可变性**: 所有字段自动 `final`
   - **简洁**: 减少80%样板代码
   - **对比传统类**:
     ```java
     // 传统方式需要 ~50 行代码
     public class PlaylistImportRequest {
         private final String playlistId;
         private final String alias;
         // ... 10 个字段
         
         public PlaylistImportRequest(...) { } // 构造函数
         public String getPlaylistId() { return playlistId; } // 10 个 getter
         @Override public boolean equals(Object o) { ... } // equals
         @Override public int hashCode() { ... } // hashCode
         @Override public String toString() { ... } // toString
     }
     
     // Record 方式只需 1 行！
     public record PlaylistImportRequest(String playlistId, String alias, ...) { }
     ```

2. **@Builder + @Jacksonized (Lombok)**
   ```java
   @Builder
   @Jacksonized
   ```
   - `@Builder`: 生成建造者模式
   - `@Jacksonized`: 让 Jackson JSON 库能反序列化 Record
   - **用法示例**:
     ```java
     PlaylistImportRequest request = PlaylistImportRequest.builder()
         .playlistId("PLxxx")
         .level("beginner")
         .targetCount(10)
         .build();
     ```

3. **@JsonIgnore 方法扩展**
   ```java
   @JsonIgnore
   public int maxDurationSecondsOrDefault() {
       return maxDurationSeconds != null && maxDurationSeconds > 0 
           ? maxDurationSeconds 
           : 300;
   }
   ```
   - Record 允许添加自定义方法
   - `@JsonIgnore`: 防止方法被序列化为 JSON 字段
   - **三元运算符**: `condition ? valueIfTrue : valueIfFalse`
   - **空值处理**: 先检查 `!= null` 再检查逻辑条件

4. **@JsonInclude(JsonInclude.Include.NON_NULL)**
   ```java
   @JsonInclude(JsonInclude.Include.NON_NULL)
   ```
   - JSON 序列化时自动忽略 `null` 字段
   - 减少网络传输大小
   - **示例**:
     ```json
     // Without NON_NULL:
     {"playlistId": "PLxxx", "alias": null, "targetCount": null}
     
     // With NON_NULL:
     {"playlistId": "PLxxx"}
     ```

---

### 难点 2: 内部 Record 的嵌套定义

#### **代码示例**: `YouTubeCuratorService.java`

```java
@Service
public class YouTubeCuratorService {
    
    // 内部 Record - 私有数据结构
    private record CuratedVideoSpec(String videoId,
                                    String bodyPart,
                                    String equipment,
                                    String level) {
    }
    
    public Map<String, Object> importCuratedVideos() {
        // 使用 List.of() 创建不可变列表
        List<CuratedVideoSpec> videos = List.of(
            new CuratedVideoSpec("Umt-J7PIhfQ", "core", "bodyweight", "beginner"),
            new CuratedVideoSpec("nWnv2psVIOA", "core", "bodyweight", "beginner"),
            // ... 60 个视频
        );
        
        for (CuratedVideoSpec spec : videos) {
            // 使用 spec.videoId() 访问字段
            Optional<VideoMetadata> metadataOpt = 
                youTubeService.fetchVideoMetadata(spec.videoId());
        }
    }
}
```

#### **技术要点**:

1. **内部 Record**
   ```java
   private record CuratedVideoSpec(...) { }
   ```
   - **作用域**: 仅在 `YouTubeCuratorService` 内可见
   - **封装**: 不暴露给外部，避免API污染
   - **类型安全**: 编译时检查，比 `Map<String, String>` 更安全
   - **对比 Map 方式**:
     ```java
     // 不推荐：使用 Map，容易出错
     Map<String, String> spec = Map.of(
         "videoId", "Umt-J7PIhfQ",
         "bodyPart", "core"
     );
     String videoId = spec.get("videoId"); // 可能拼错 key
     
     // 推荐：使用 Record，IDE 自动补全
     CuratedVideoSpec spec = new CuratedVideoSpec("Umt-J7PIhfQ", "core", ...);
     String videoId = spec.videoId(); // 编译时检查
     ```

2. **List.of() 不可变集合 (Java 9+)**
   ```java
   List<CuratedVideoSpec> videos = List.of(
       new CuratedVideoSpec(...),
       new CuratedVideoSpec(...)
   );
   ```
   - **不可变**: 创建后无法 `add()` 或 `remove()`
   - **线程安全**: 多线程访问无需同步
   - **性能优化**: 比 `ArrayList` 更节省内存
   - **对比传统方式**:
     ```java
     // 传统方式（可变）
     List<String> list = new ArrayList<>();
     list.add("item1");
     list.add("item2");
     
     // 现代方式（不可变）
     List<String> list = List.of("item1", "item2");
     ```

3. **Record 字段访问**
   ```java
   spec.videoId()  // 自动生成的 getter
   spec.bodyPart() // 不是 getBodyPart()，而是直接方法名
   ```
   - Record 的 getter 没有 `get` 前缀
   - 更简洁，更符合函数式编程风格

---

### 难点 3: Optional 模式的空值安全处理

#### **代码示例**: 多层 Optional 链式调用

```java
public Map<String, Object> importCuratedVideos() {
    for (CuratedVideoSpec spec : videos) {
        try {
            // 1. 获取视频元数据（可能失败）
            Optional<VideoMetadata> metadataOpt = 
                youTubeService.fetchVideoMetadata(spec.videoId());
            
            // 2. 检查是否存在
            if (metadataOpt.isEmpty()) {
                rejected++;
                errors.add(spec.videoId() + ":metadata_missing");
                continue; // 跳过本次循环
            }
            
            // 3. 提取值（此时确保非空）
            VideoMetadata metadata = metadataOpt.get();
            
            // 4. 嵌套 Optional 调用
            Optional<ChannelMetadata> channelOpt = 
                resolveChannelMetadata(metadata.getChannelId(), channelCache);
            
            if (channelOpt.isEmpty()) {
                rejected++;
                continue;
            }
            
            ChannelMetadata channel = channelOpt.get();
            
            // 5. 使用提取的值
            WorkoutVideo video = persistVideo(metadata, channel, pseudoRequest);
            
        } catch (Exception e) {
            log.error("Failed to import video {}", spec.videoId(), e);
            rejected++;
        }
    }
}
```

#### **技术要点**:

1. **Optional<T> 空值安全容器**
   ```java
   Optional<VideoMetadata> metadataOpt = fetchVideoMetadata(videoId);
   ```
   - **避免 NullPointerException**: 强制开发者处理 null 情况
   - **类型安全**: `Optional<VideoMetadata>` 明确表示"可能没有值"
   - **对比传统方式**:
     ```java
     // 传统方式（容易出错）
     VideoMetadata metadata = fetchVideoMetadata(videoId); // 可能返回 null
     if (metadata != null) { // 容易忘记检查
         // 使用 metadata
     }
     
     // Optional 方式（强制处理）
     Optional<VideoMetadata> metadataOpt = fetchVideoMetadata(videoId);
     if (metadataOpt.isEmpty()) { // 明确处理空值
         return;
     }
     VideoMetadata metadata = metadataOpt.get(); // 安全提取
     ```

2. **isEmpty() vs isPresent() (Java 11+)**
   ```java
   if (metadataOpt.isEmpty()) {  // Java 11+ 推荐
       // 处理空值情况
   }
   
   // 等价于（Java 8 旧写法）
   if (!metadataOpt.isPresent()) {
       // 处理空值情况
   }
   ```
   - `isEmpty()` 更直观，语义更清晰

3. **Optional 高级用法 - 函数式风格**
   ```java
   // 本项目使用的传统风格
   if (metadataOpt.isEmpty()) {
       continue;
   }
   VideoMetadata metadata = metadataOpt.get();
   
   // 函数式风格（更简洁）
   metadataOpt.ifPresent(metadata -> {
       // 使用 metadata
   });
   
   // 链式调用（高级）
   metadataOpt
       .filter(m -> m.getDurationSeconds() <= 300) // 过滤
       .map(m -> convertToEntity(m))              // 转换
       .ifPresent(entity -> save(entity));        // 保存
   ```

4. **为什么不直接用 null？**
   ```java
   // 差劲做法
   VideoMetadata metadata = fetchVideo(id); // 返回 null
   metadata.getTitle(); // 💥 NullPointerException!
   
   // 好的做法
   Optional<VideoMetadata> opt = fetchVideo(id);
   if (opt.isPresent()) {
       opt.get().getTitle(); // ✅ 安全
   }
   ```

---

### 难点 4: ConcurrentHashMap 并发缓存

#### **代码示例**: 频道元数据缓存

```java
public Map<String, Object> importCuratedVideos() {
    // 1. 创建线程安全的缓存
    Map<String, ChannelMetadata> channelCache = new ConcurrentHashMap<>();
    
    for (CuratedVideoSpec spec : videos) {
        // 2. 使用缓存避免重复API调用
        Optional<ChannelMetadata> channelOpt = 
            resolveChannelMetadata(metadata.getChannelId(), channelCache);
    }
}

private Optional<ChannelMetadata> resolveChannelMetadata(
        String channelId,
        Map<String, ChannelMetadata> cache) {
    
    if (!StringUtils.hasText(channelId)) {
        return Optional.empty();
    }
    
    // 3. computeIfAbsent - 原子操作
    return Optional.ofNullable(
        cache.computeIfAbsent(channelId, this::fetchChannelMetadata)
    );
}

private ChannelMetadata fetchChannelMetadata(String channelId) {
    try {
        // 4. 真实的 YouTube API 调用（昂贵操作）
        ChannelListResponse response = youtube.channels()
            .list(List.of("snippet", "statistics"))
            .setId(Collections.singletonList(channelId))
            .setKey(properties.getApiKey())
            .execute();
        // ... 解析响应
    } catch (IOException e) {
        return null;
    }
}
```

#### **技术要点**:

1. **ConcurrentHashMap 线程安全**
   ```java
   Map<String, ChannelMetadata> channelCache = new ConcurrentHashMap<>();
   ```
   - **线程安全**: 多线程同时读写不会出错
   - **高性能**: 比 `synchronized` 的 HashMap 快得多
   - **分段锁**: 内部使用 16 个锁，降低竞争
   - **对比**:
     ```java
     // 不安全（多线程会出错）
     Map<String, String> cache = new HashMap<>();
     
     // 安全但慢（全局锁）
     Map<String, String> cache = Collections.synchronizedMap(new HashMap<>());
     
     // 安全且快（推荐）
     Map<String, String> cache = new ConcurrentHashMap<>();
     ```

2. **computeIfAbsent() 原子操作**
   ```java
   cache.computeIfAbsent(channelId, this::fetchChannelMetadata)
   ```
   - **原子性**: 检查+插入是一个不可分割的操作
   - **避免重复计算**: 如果 key 存在，直接返回；不存在才调用函数
   - **方法引用**: `this::fetchChannelMetadata` 等价于 `id -> fetchChannelMetadata(id)`
   - **工作流程**:
     ```java
     // 伪代码解释
     if (cache.containsKey(channelId)) {
         return cache.get(channelId); // 命中缓存
     } else {
         ChannelMetadata value = fetchChannelMetadata(channelId); // 调用 API
         cache.put(channelId, value); // 存入缓存
         return value;
     }
     ```
   - **性能提升示例**:
     ```
     场景: 60 个视频，来自 10 个频道
     
     无缓存: 60 次 API 调用 × 200ms = 12 秒
     有缓存: 10 次 API 调用 × 200ms = 2 秒
     
     提升: 6 倍速度！
     ```

3. **为什么用 ConcurrentHashMap？**
   - 本项目虽然是单线程，但为未来扩展准备
   - 如果后续改用并行流 `parallelStream()`，缓存依然安全
   - 成本低，收益高（性能差异可忽略）

---

### 难点 5: Stream API 函数式编程

#### **代码示例**: 数据转换与过滤

```java
// 1. 基础 Stream 转换
private static List<String> resolveEquipment(PlaylistImportRequest request) {
    if (CollectionUtils.isEmpty(request.equipmentList())) {
        if (StringUtils.hasText(request.equipment())) {
            return List.of(request.equipment().trim());
        }
        return List.of("bodyweight");
    }
    
    // Stream 链式操作
    return request.equipmentList().stream()
            .filter(StringUtils::hasText)      // 过滤空字符串
            .map(String::trim)                 // 去除空格
            .collect(Collectors.toList());     // 收集为 List
}

// 2. 复杂 Stream - 分组统计
public CuratedCoverageReport evaluateCuratedCoverage(int hoursBack) {
    List<WorkoutVideo> recent = workoutVideoRepository.findByLastValidatedAtAfter(cutoff);
    
    // 多重过滤
    List<WorkoutVideo> curated = recent.stream()
        .filter(video -> video.getChannelSubscriberCount() != null 
                      && video.getChannelSubscriberCount() >= 100_000L)
        .filter(video -> video.getDurationMinutes() != null 
                      && video.getDurationMinutes() <= 3)
        .filter(video -> video.getViewCount() != null 
                      && video.getViewCount() >= 50_000L)
        .filter(video -> StringUtils.hasText(video.getYoutubeId()))
        .toList(); // Java 16+ 简化写法
    
    // 分组计数
    Map<String, Long> levelCounts = curated.stream()
        .map(WorkoutVideo::getLevel)                   // 提取 level 字段
        .filter(StringUtils::hasText)                  // 过滤空值
        .map(level -> level.toLowerCase(Locale.ROOT))  // 转小写
        .collect(Collectors.groupingBy(               // 按 level 分组
            level -> level,                            // key: level 值
            Collectors.counting()                      // value: 计数
        ));
    
    // 结果示例: {"beginner": 20, "intermediate": 30, "advanced": 10}
}
```

#### **技术要点**:

1. **Stream 操作链**
   ```java
   list.stream()
       .filter(...)    // 中间操作 - 过滤
       .map(...)       // 中间操作 - 转换
       .collect(...)   // 终止操作 - 收集
   ```
   - **惰性求值**: 只有调用终止操作时才执行
   - **不可变**: 原集合不变，返回新集合
   - **可读性**: 声明式编程，描述"做什么"而非"怎么做"

2. **filter() 过滤操作**
   ```java
   .filter(StringUtils::hasText)  // 方法引用
   // 等价于
   .filter(str -> StringUtils.hasText(str))  // Lambda 表达式
   ```
   - **Predicate<T>**: 接受一个参数，返回 boolean
   - **用途**: 移除不符合条件的元素

3. **map() 转换操作**
   ```java
   .map(String::trim)             // 方法引用
   .map(WorkoutVideo::getLevel)   // 提取字段
   // 等价于
   .map(str -> str.trim())
   .map(video -> video.getLevel())
   ```
   - **Function<T, R>**: 接受类型 T，返回类型 R
   - **用途**: 元素类型转换，如 `Video -> String`

4. **collect() 收集器**
   ```java
   // 收集为 List
   .collect(Collectors.toList())
   
   // Java 16+ 简化写法
   .toList()
   
   // 分组计数
   .collect(Collectors.groupingBy(
       keyMapper,      // 如何提取 key
       valueMapper     // 如何聚合 value
   ))
   ```

5. **groupingBy() 分组统计**
   ```java
   Map<String, Long> levelCounts = videos.stream()
       .map(WorkoutVideo::getLevel)
       .collect(Collectors.groupingBy(
           level -> level,           // key: 原始值
           Collectors.counting()     // value: 出现次数
       ));
   
   // 输入: ["beginner", "beginner", "intermediate", "advanced", "beginner"]
   // 输出: {"beginner": 3, "intermediate": 1, "advanced": 1}
   ```

6. **方法引用 vs Lambda**
   ```java
   // 方法引用（简洁）
   .filter(StringUtils::hasText)
   .map(String::trim)
   
   // Lambda 表达式（灵活）
   .filter(str -> StringUtils.hasText(str))
   .map(str -> str.trim())
   
   // 何时用方法引用？
   // ✅ 方法只有一个参数，且直接传递给另一个方法
   // ❌ 需要额外逻辑或多个参数时用 Lambda
   ```

---

### 难点 6: Lombok 注解自动生成代码

#### **代码示例**: Service 类注解

```java
@Service                      // Spring 组件注解
@RequiredArgsConstructor      // Lombok 生成构造函数
@Slf4j                        // Lombok 生成日志对象
public class YouTubeCuratorService {
    
    // final 字段会被 @RequiredArgsConstructor 自动注入
    private final YouTube youtube;
    private final YouTubeService youTubeService;
    private final YouTubeProperties properties;
    private final WorkoutVideoRepository workoutVideoRepository;
    
    // Lombok 自动生成的构造函数（不可见）：
    // public YouTubeCuratorService(
    //     YouTube youtube,
    //     YouTubeService youTubeService,
    //     YouTubeProperties properties,
    //     WorkoutVideoRepository workoutVideoRepository
    // ) {
    //     this.youtube = youtube;
    //     this.youTubeService = youTubeService;
    //     this.properties = properties;
    //     this.workoutVideoRepository = workoutVideoRepository;
    // }
    
    public void someMethod() {
        // @Slf4j 自动生成的 log 对象
        log.info("Starting import process");
        log.error("Failed to import video {}", videoId, exception);
    }
}
```

#### **技术要点**:

1. **@Service (Spring)**
   ```java
   @Service
   public class YouTubeCuratorService { }
   ```
   - Spring 自动扫描并注册为 Bean
   - 可被其他类 `@Autowired` 注入
   - 等价于 `@Component` 但语义更明确（服务层）

2. **@RequiredArgsConstructor (Lombok)**
   ```java
   @RequiredArgsConstructor
   public class MyService {
       private final DependencyA depA; // final 字段
       private final DependencyB depB; // final 字段
       private String optionalField;   // 非 final 不注入
   }
   
   // Lombok 自动生成：
   // public MyService(DependencyA depA, DependencyB depB) {
   //     this.depA = depA;
   //     this.depB = depB;
   // }
   ```
   - 自动为所有 `final` 字段生成构造函数
   - 结合 Spring 实现依赖注入
   - **避免**:
     ```java
     // 不推荐：手动 @Autowired
     @Autowired
     private YouTube youtube;
     
     // 推荐：构造函数注入（final + @RequiredArgsConstructor）
     private final YouTube youtube;
     ```

3. **@Slf4j (Lombok)**
   ```java
   @Slf4j
   public class MyService {
       public void method() {
           log.debug("Debug message");
           log.info("Info message");
           log.warn("Warning message");
           log.error("Error message", exception);
       }
   }
   
   // Lombok 自动生成：
   // private static final org.slf4j.Logger log = 
   //     org.slf4j.LoggerFactory.getLogger(MyService.class);
   ```
   - 自动创建 `log` 对象
   - 支持占位符: `log.info("User {} logged in", username)`
   - 日志级别: DEBUG < INFO < WARN < ERROR

4. **为什么用 Lombok？**
   - **减少样板代码**: 90% 的 getter/setter/constructor 自动生成
   - **代码更简洁**: 100 行变 20 行
   - **易于维护**: 添加字段自动更新构造函数
   - **IDE 支持**: IntelliJ IDEA / Eclipse 完美支持

---

### 难点 7: Spring Dependency Injection (依赖注入)

#### **代码示例**: Controller → Service → Repository 注入链

```java
// 1. Controller 层
@RestController
@RequestMapping("/api/admin/import")
@RequiredArgsConstructor  // Lombok 自动注入
public class ImportController {
    
    // Spring 自动注入 Service
    private final YouTubeCuratorService youTubeCuratorService;
    
    @PostMapping("/videos/curated")
    public ResponseEntity<Map<String, Object>> importCuratedVideos() {
        // 调用 Service 层
        Map<String, Object> results = youTubeCuratorService.importCuratedVideos();
        return ResponseEntity.ok(results);
    }
}

// 2. Service 层
@Service
@RequiredArgsConstructor
public class YouTubeCuratorService {
    
    // Spring 自动注入其他 Service 和 Repository
    private final YouTube youtube;                      // Google API 客户端
    private final YouTubeService youTubeService;        // 自定义 Service
    private final WorkoutVideoRepository repository;    // JPA Repository
    
    public Map<String, Object> importCuratedVideos() {
        // 调用其他 Service
        Optional<VideoMetadata> metadata = youTubeService.fetchVideoMetadata(videoId);
        
        // 调用 Repository 保存数据
        WorkoutVideo video = repository.save(entity);
    }
}

// 3. Repository 层（JPA 接口）
@Repository
public interface WorkoutVideoRepository extends JpaRepository<WorkoutVideo, UUID> {
    Optional<WorkoutVideo> findByYoutubeId(String youtubeId);
    List<WorkoutVideo> findByLastValidatedAtAfter(OffsetDateTime cutoff);
}
```

#### **技术要点**:

1. **依赖注入流程**
   ```
   Spring 启动
       ↓
   扫描 @Component/@Service/@Repository 注解
       ↓
   创建 Bean 对象（单例）
       ↓
   分析构造函数参数
       ↓
   自动注入依赖
       ↓
   应用运行
   ```

2. **三种注入方式对比**
   ```java
   // 1. 构造函数注入（推荐 ✅）
   @RequiredArgsConstructor
   public class MyService {
       private final DependencyA depA;
   }
   
   // 2. 字段注入（不推荐 ❌）
   public class MyService {
       @Autowired
       private DependencyA depA; // 难以测试，隐藏依赖
   }
   
   // 3. Setter 注入（罕见）
   public class MyService {
       private DependencyA depA;
       
       @Autowired
       public void setDepA(DependencyA depA) {
           this.depA = depA;
       }
   }
   ```

3. **为什么构造函数注入最好？**
   - **不可变**: `final` 字段确保依赖不变
   - **易测试**: 可直接 `new MyService(mockDep)` 创建测试对象
   - **清晰依赖**: 构造函数参数一目了然
   - **编译检查**: 缺少依赖时编译报错

---

### 难点 8: JPA Repository 魔法方法

#### **代码示例**: 方法名自动生成 SQL

```java
@Repository
public interface WorkoutVideoRepository extends JpaRepository<WorkoutVideo, UUID> {
    
    // 1. 根据 YouTube ID 查找（自动生成 SQL）
    Optional<WorkoutVideo> findByYoutubeId(String youtubeId);
    // SQL: SELECT * FROM workout_video WHERE youtube_id = ?
    
    // 2. 根据时间范围查找
    List<WorkoutVideo> findByLastValidatedAtAfter(OffsetDateTime cutoff);
    // SQL: SELECT * FROM workout_video WHERE last_validated_at > ?
    
    // 3. 复合条件查询
    List<WorkoutVideo> findByLevelAndDurationMinutesLessThanEqual(
        String level, 
        Integer maxDuration
    );
    // SQL: SELECT * FROM workout_video 
    //      WHERE level = ? AND duration_minutes <= ?
}
```

#### **技术要点**:

1. **JpaRepository<T, ID> 泛型**
   ```java
   public interface WorkoutVideoRepository 
       extends JpaRepository<WorkoutVideo, UUID> {
       //                     ^实体类      ^主键类型
   }
   ```
   - 自动继承 CRUD 方法:
     ```java
     save(entity)           // INSERT or UPDATE
     findById(id)           // SELECT by PK
     findAll()              // SELECT *
     deleteById(id)         // DELETE
     count()                // COUNT(*)
     ```

2. **方法名查询（Query Derivation）**
   ```java
   findBy + 字段名 + 操作符
   
   findByYoutubeId              → WHERE youtube_id = ?
   findByLevelAndBodyPart       → WHERE level = ? AND body_part = ?
   findByDurationLessThan       → WHERE duration < ?
   findByTitleContaining        → WHERE title LIKE %?%
   findByLastValidatedAtAfter   → WHERE last_validated_at > ?
   ```
   
3. **支持的操作符**
   ```
   Is, Equals          → =
   LessThan, Before    → <
   GreaterThan, After  → >
   Between             → BETWEEN ? AND ?
   Like, Containing    → LIKE %?%
   In                  → IN (?)
   OrderBy             → ORDER BY
   ```

4. **返回类型**
   ```java
   Optional<WorkoutVideo> findByYoutubeId(String id);  // 最多 1 个
   List<WorkoutVideo> findByLevel(String level);      // 0 或多个
   WorkoutVideo findByYoutubeId(String id);           // 可能抛异常
   ```

5. **为什么不写 SQL？**
   ```java
   // 传统 JDBC（繁琐）
   String sql = "SELECT * FROM workout_video WHERE youtube_id = ?";
   PreparedStatement stmt = conn.prepareStatement(sql);
   stmt.setString(1, youtubeId);
   ResultSet rs = stmt.executeQuery();
   // ... 手动映射结果
   
   // JPA（简洁）
   Optional<WorkoutVideo> video = repository.findByYoutubeId(youtubeId);
   ```

---

## Spring Boot 集成技巧

### 1. REST API 响应格式

```java
@PostMapping("/videos/curated")
public ResponseEntity<Map<String, Object>> importCuratedVideos() {
    Map<String, Object> results = youTubeCuratorService.importCuratedVideos();
    return ResponseEntity.ok(results);
    // HTTP 200 + JSON body: {"importedCount": 54, ...}
}
```

**ResponseEntity 用法**:
- `ResponseEntity.ok(body)` → HTTP 200
- `ResponseEntity.status(404).body(error)` → HTTP 404
- `ResponseEntity.noContent().build()` → HTTP 204

### 2. @Valid 参数校验

```java
@PostMapping("/playlist")
public ResponseEntity<PlaylistImportResult> importPlaylist(
    @Valid @RequestBody PlaylistImportRequest request
) {
    // @Valid 自动校验 request 字段
    // 如果不合法，自动返回 HTTP 400
}
```

---

## 性能优化策略

### 1. 缓存机制
```java
Map<String, ChannelMetadata> channelCache = new ConcurrentHashMap<>();
// 60 个视频共享 10 个频道 → 减少 50 次 API 调用
```

### 2. 批量操作
```java
List<WorkoutVideo> videos = // 批量查询
repository.saveAll(videos);  // 批量保存（减少数据库往返）
```

### 3. 懒加载
```java
Optional<VideoMetadata> metadataOpt = fetchVideoMetadata(videoId);
// 只在需要时才调用 YouTube API
```

---

## 错误处理机制

### 1. Try-Catch 局部处理
```java
for (CuratedVideoSpec spec : videos) {
    try {
        // 可能失败的操作
        importVideo(spec);
    } catch (Exception e) {
        log.error("Failed to import {}", spec.videoId(), e);
        rejected++;
        errors.add(spec.videoId() + ":exception");
        // 继续处理下一个视频，不中断整个流程
    }
}
```

### 2. Optional 空值处理
```java
if (metadataOpt.isEmpty()) {
    rejected++;
    errors.add(videoId + ":metadata_missing");
    continue;
}
```

### 3. 质量检查
```java
private Optional<String> qualityIssue(VideoMetadata metadata) {
    if (metadata.getDurationSeconds() > 300) {
        return Optional.of("duration_too_long");
    }
    if (metadata.getViewCount() < 50_000) {
        return Optional.of("views_too_low");
    }
    return Optional.empty(); // 无问题
}
```

---

## 关键设计模式

### 1. Builder 模式
```java
PlaylistImportRequest request = PlaylistImportRequest.builder()
    .playlistId("PLxxx")
    .level("beginner")
    .targetCount(10)
    .build();
```

### 2. Repository 模式
```java
// 抽象数据访问
interface WorkoutVideoRepository extends JpaRepository<...> { }

// 业务层不关心数据库细节
WorkoutVideo video = repository.save(entity);
```

### 3. Service 层模式
```java
// Controller 只负责 HTTP 请求/响应
// Service 负责业务逻辑
// Repository 负责数据访问
```

---

## 总结：核心技术栈

| 技术 | 用途 | 难度 |
|------|------|------|
| Java Record | 不可变数据对象 | ⭐⭐ |
| Optional | 空值安全 | ⭐⭐ |
| Stream API | 函数式编程 | ⭐⭐⭐ |
| Lombok | 减少样板代码 | ⭐ |
| Spring DI | 依赖注入 | ⭐⭐ |
| JPA Repository | 数据访问 | ⭐⭐ |
| ConcurrentHashMap | 并发缓存 | ⭐⭐⭐ |

**学习建议**:
1. 先掌握 Record 和 Optional（基础）
2. 练习 Stream API（核心）
3. 理解 Spring 依赖注入（必备）
4. 深入 JPA 查询方法（实用）
5. 研究并发工具类（进阶）

---

**下一步**: 实战练习
- 尝试添加新的视频分类
- 实现视频更新定时任务
- 添加单元测试覆盖
- 优化查询性能（添加索引）
