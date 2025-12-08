# USDA 数据状态解析规则文档

> 版本：1.0.0  
> 日期：2025-12-06  
> 作者：AuraFitness 后端团队

---

## 一、概述

USDA FoodData Central 的 `description` 字段包含丰富的食物状态信息，但格式不统一。本文档定义一套标准化的解析规则，从 description 中自动提取：

- 食物英文标准名 (`name_en`)
- 食物类别 (`category`)
- 烹饪状态 (`state`)
- 是否带皮 (`has_skin`)
- 是否带骨 (`has_bone`)
- 可食用比例 (`edible_ratio`)

---

## 二、USDA Description 格式分析

### 2.1 典型格式

```
[食物名], [部位], [状态1], [状态2], [附加描述]
```

**示例：**
```
Chicken, breast, meat only, cooked, roasted
Beef, ground, 80% lean meat / 20% fat, raw
Egg, whole, cooked, fried
Fish, salmon, Atlantic, wild, cooked, dry heat
Apple, raw, with skin
Rice, white, long-grain, regular, cooked
```

### 2.2 关键词位置规律

| 位置 | 内容类型 | 示例 |
|------|----------|------|
| 第1段 | 主食物名 | Chicken, Beef, Egg |
| 第2段 | 部位/类型 | breast, ground, whole |
| 第3~N段 | 状态修饰词 | raw, cooked, roasted, with skin |

---

## 三、烹饪状态关键词映射表

### 3.1 主要状态关键词

| 关键词 | 映射状态 | 优先级 | 说明 |
|--------|----------|--------|------|
| `raw` | RAW | 100 | 生的，未经任何烹饪 |
| `uncooked` | RAW | 99 | 同 raw |
| `fresh` | RAW | 98 | 通常指生鲜状态 |
| `cooked` | COOKED | 90 | 通用熟食状态 |
| `roasted` | ROASTED | 85 | 烤/烘焙（干热） |
| `baked` | ROASTED | 84 | 烘焙（归类为 ROASTED） |
| `grilled` | GRILLED | 83 | 明火炙烤 |
| `broiled` | GRILLED | 82 | 上火烤（归类为 GRILLED） |
| `barbecued` | GRILLED | 81 | 烧烤 |
| `fried` | FRIED | 80 | 煎/炒 |
| `pan-fried` | FRIED | 79 | 平底锅煎 |
| `stir-fried` | FRIED | 78 | 翻炒 |
| `sauteed` | FRIED | 77 | 嫩煎 |
| `deep-fried` | DEEP_FRIED | 75 | 油炸 |
| `breaded and fried` | DEEP_FRIED | 74 | 裹粉油炸 |
| `boiled` | BOILED | 70 | 水煮 |
| `poached` | BOILED | 69 | 水煮（低温） |
| `steamed` | STEAMED | 68 | 蒸 |
| `braised` | STEWED | 65 | 红烧/焖 |
| `stewed` | STEWED | 64 | 炖 |
| `simmered` | STEWED | 63 | 文火煮 |
| `smoked` | SMOKED | 60 | 烟熏 |
| `cured` | SMOKED | 59 | 腌制（常伴随烟熏） |
| `dried` | DRIED | 55 | 干燥 |
| `dehydrated` | DRIED | 54 | 脱水 |
| `canned` | CANNED | 50 | 罐装 |
| `frozen` | FROZEN | 45 | 冷冻 |
| `microwaved` | COOKED | 40 | 微波加热（归类为 COOKED） |

### 3.2 状态关键词优先级规则

当一条记录包含多个状态关键词时，选择**优先级最高**的作为主状态。

**示例：**
```
"Chicken, breast, cooked, roasted"
  - 包含: cooked (90), roasted (85)
  - 选择: roasted (更具体)
  - 结果: state = ROASTED
```

**优先级逻辑：**
- 优先级数值越高越优先
- 具体方法 > 通用描述（roasted > cooked）
- 油炸类 > 干热类 > 湿热类

---

## 四、皮/骨状态关键词映射表

### 4.1 皮（Skin）相关关键词

| 关键词 | has_skin | 说明 |
|--------|----------|------|
| `with skin` | TRUE | 带皮 |
| `skin on` | TRUE | 带皮 |
| `skin eaten` | TRUE | 皮可食用 |
| `without skin` | FALSE | 去皮 |
| `skinless` | FALSE | 无皮 |
| `skin not eaten` | FALSE | 皮不可食用 |
| `meat only` | FALSE | 仅肉部分（暗示去皮） |
| `meat and skin` | TRUE | 肉和皮 |
| `(无关键词)` | FALSE | 默认去皮 |

### 4.2 骨（Bone）相关关键词

| 关键词 | has_bone | 说明 |
|--------|----------|------|
| `bone-in` | TRUE | 带骨 |
| `with bone` | TRUE | 带骨 |
| `on the bone` | TRUE | 带骨 |
| `boneless` | FALSE | 去骨 |
| `without bone` | FALSE | 去骨 |
| `meat only` | FALSE | 仅肉部分（暗示去骨） |
| `(无关键词)` | FALSE | 默认去骨 |

---

## 五、食物类别自动分类规则

### 5.1 主食物名 → 类别映射表

| 主食物名关键词 | 类别 | 备注 |
|----------------|------|------|
| chicken, turkey, duck, goose, poultry | POULTRY | 禽肉类 |
| beef, pork, lamb, veal, mutton, venison, goat | RED_MEAT | 红肉类 |
| fish, salmon, tuna, cod, tilapia, shrimp, crab, lobster, clam, oyster, mussel, squid, octopus | SEAFOOD | 海鲜类 |
| milk, cheese, yogurt, cream, butter | DAIRY | 乳制品 |
| egg, eggs | EGG | 蛋类 |
| rice, wheat, oat, barley, corn, bread, pasta, noodle, flour, cereal | GRAIN | 谷物类 |
| carrot, broccoli, spinach, lettuce, tomato, onion, pepper, cabbage, celery, cucumber | VEGETABLE | 蔬菜类 |
| apple, banana, orange, grape, strawberry, mango, pineapple, watermelon, peach, pear | FRUIT | 水果类 |
| bean, lentil, chickpea, pea, soy, tofu | LEGUME | 豆类 |
| almond, walnut, cashew, peanut, pistachio, hazelnut, macadamia | NUT | 坚果类 |
| oil, olive oil, coconut oil, vegetable oil | OIL | 油脂类 |
| juice, coffee, tea, soda, water, beer, wine | BEVERAGE | 饮品类 |
| salt, sugar, sauce, vinegar, ketchup, mayonnaise, mustard | CONDIMENT | 调味品 |
| chips, candy, chocolate, cookie, cracker | SNACK | 零食类 |

### 5.2 分类优先级

```
1. 精确匹配主食物名（第一段）
2. 模糊匹配描述中的关键词
3. 如果无法分类，设为 OTHER
```

---

## 六、可食用比例 (edible_ratio) 默认值表

### 6.1 禽肉类 (POULTRY)

| 食物描述 | has_skin | has_bone | edible_ratio | 说明 |
|----------|----------|----------|--------------|------|
| Chicken, whole | TRUE | TRUE | 0.65 | 整只鸡约 35% 为骨骼和废弃物 |
| Chicken, whole | FALSE | TRUE | 0.60 | 去皮整只鸡 |
| Chicken, breast | FALSE | FALSE | 1.00 | 纯鸡胸肉 |
| Chicken, breast | TRUE | FALSE | 0.92 | 带皮鸡胸（皮约 8%） |
| Chicken, breast | FALSE | TRUE | 0.80 | 带骨鸡胸 |
| Chicken, thigh | FALSE | FALSE | 1.00 | 纯鸡腿肉 |
| Chicken, thigh | TRUE | TRUE | 0.70 | 带皮带骨鸡腿 |
| Chicken, wing | TRUE | TRUE | 0.45 | 鸡翅可食部分约 45% |
| Chicken, drumstick | TRUE | TRUE | 0.60 | 鸡腿棒 |
| Turkey, whole | TRUE | TRUE | 0.62 | 整只火鸡 |
| Duck, whole | TRUE | TRUE | 0.55 | 整只鸭（脂肪层厚） |

### 6.2 红肉类 (RED_MEAT)

| 食物描述 | has_bone | edible_ratio | 说明 |
|----------|----------|--------------|------|
| Beef, steak | FALSE | 1.00 | 牛排（纯肉） |
| Beef, ground | FALSE | 1.00 | 牛肉糜 |
| Beef, ribs | TRUE | 0.55 | 牛排骨 |
| Beef, T-bone | TRUE | 0.75 | T骨牛排 |
| Pork, chop | TRUE | 0.75 | 猪排（带骨） |
| Pork, chop | FALSE | 1.00 | 猪排（去骨） |
| Pork, ribs | TRUE | 0.50 | 猪肋排 |
| Lamb, chop | TRUE | 0.70 | 羊排 |
| Lamb, leg | TRUE | 0.75 | 羊腿 |

### 6.3 海鲜类 (SEAFOOD)

| 食物描述 | edible_ratio | 说明 |
|----------|--------------|------|
| Fish, fillet | 1.00 | 鱼片（纯肉） |
| Fish, whole | 0.50 | 整条鱼（头尾骨约 50%） |
| Shrimp, peeled | 1.00 | 去壳虾仁 |
| Shrimp, whole | 0.50 | 带壳虾 |
| Crab, meat | 1.00 | 蟹肉 |
| Crab, whole | 0.25 | 整只螃蟹（壳重） |
| Lobster, meat | 1.00 | 龙虾肉 |
| Lobster, whole | 0.30 | 整只龙虾 |
| Clam, meat | 1.00 | 蛤肉 |
| Clam, in shell | 0.15 | 带壳蛤蜊 |
| Oyster, meat | 1.00 | 生蚝肉 |
| Oyster, in shell | 0.10 | 带壳生蚝 |

### 6.4 水果类 (FRUIT)

| 食物描述 | edible_ratio | 说明 |
|----------|--------------|------|
| Apple, with skin | 0.90 | 苹果（去核） |
| Apple, peeled | 0.85 | 去皮苹果 |
| Banana | 0.65 | 香蕉（去皮） |
| Orange | 0.70 | 橙子（去皮去籽） |
| Watermelon | 0.55 | 西瓜（去皮去籽） |
| Mango | 0.70 | 芒果（去皮去核） |
| Pineapple | 0.50 | 菠萝（去皮去心） |
| Grape | 0.95 | 葡萄（可能有籽） |
| Peach | 0.90 | 桃子（去核） |
| Avocado | 0.70 | 牛油果（去皮去核） |

### 6.5 蔬菜类 (VEGETABLE)

| 食物描述 | edible_ratio | 说明 |
|----------|--------------|------|
| Broccoli | 0.80 | 西兰花（去粗茎） |
| Cauliflower | 0.75 | 花菜 |
| Celery | 0.85 | 芹菜（去叶） |
| Corn, on cob | 0.45 | 玉米棒（去芯） |
| Corn, kernels | 1.00 | 玉米粒 |
| Artichoke | 0.40 | 洋蓟 |
| Asparagus | 0.85 | 芦笋（去根） |
| Most vegetables | 0.95 | 大部分蔬菜默认 |

### 6.6 坚果类 (NUT)

| 食物描述 | edible_ratio | 说明 |
|----------|--------------|------|
| Almond, shelled | 1.00 | 去壳杏仁 |
| Almond, in shell | 0.40 | 带壳杏仁 |
| Walnut, shelled | 1.00 | 去壳核桃 |
| Walnut, in shell | 0.45 | 带壳核桃 |
| Peanut, shelled | 1.00 | 去壳花生 |
| Peanut, in shell | 0.70 | 带壳花生 |
| Pistachio, shelled | 1.00 | 去壳开心果 |
| Pistachio, in shell | 0.50 | 带壳开心果 |
| Coconut, meat | 1.00 | 椰肉 |
| Coconut, whole | 0.35 | 整椰子 |

### 6.7 默认值规则

```java
// 默认 edible_ratio 决策树
if (has_bone && has_skin) {
    return 0.60;  // 带皮带骨
} else if (has_bone) {
    return 0.70;  // 仅带骨
} else if (has_skin) {
    return 0.90;  // 仅带皮
} else {
    return 1.00;  // 纯可食部分
}
```

---

## 七、Description 解析算法

### 7.1 解析流程图

```
┌─────────────────────────────────────────────────────────┐
│                   USDA Description                       │
│  "Chicken, breast, meat only, cooked, roasted"          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 1: 分词 (Split by ", ")                │
│  ["Chicken", "breast", "meat only", "cooked", "roasted"]│
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 2: 提取主食物名                         │
│  第一个词 = "Chicken"                                    │
│  name_en = "Chicken, breast"                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 3: 确定 Category                       │
│  "Chicken" → POULTRY                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 4: 解析烹饪状态                         │
│  找到: "cooked" (90), "roasted" (85)                    │
│  选择最具体: state = ROASTED                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 5: 解析皮/骨状态                        │
│  找到: "meat only" → has_skin=FALSE, has_bone=FALSE     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Step 6: 确定 edible_ratio                   │
│  查表: Chicken + breast + no_skin + no_bone = 1.00      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     最终结果                              │
│  {                                                       │
│    name_en: "Chicken, breast",                          │
│    category: POULTRY,                                   │
│    state: ROASTED,                                      │
│    has_skin: false,                                     │
│    has_bone: false,                                     │
│    edible_ratio: 1.00                                   │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Java 伪代码实现

```java
public class DescriptionParser {
    
    // 状态关键词映射（优先级从高到低）
    private static final Map<String, FoodState> STATE_KEYWORDS = new LinkedHashMap<>() {{
        put("raw", FoodState.RAW);
        put("uncooked", FoodState.RAW);
        put("fresh", FoodState.RAW);
        put("roasted", FoodState.ROASTED);
        put("baked", FoodState.ROASTED);
        put("grilled", FoodState.GRILLED);
        put("broiled", FoodState.GRILLED);
        put("barbecued", FoodState.GRILLED);
        put("deep-fried", FoodState.DEEP_FRIED);
        put("breaded and fried", FoodState.DEEP_FRIED);
        put("fried", FoodState.FRIED);
        put("pan-fried", FoodState.FRIED);
        put("stir-fried", FoodState.FRIED);
        put("sauteed", FoodState.FRIED);
        put("boiled", FoodState.BOILED);
        put("poached", FoodState.BOILED);
        put("steamed", FoodState.STEAMED);
        put("braised", FoodState.STEWED);
        put("stewed", FoodState.STEWED);
        put("simmered", FoodState.STEWED);
        put("smoked", FoodState.SMOKED);
        put("cured", FoodState.SMOKED);
        put("dried", FoodState.DRIED);
        put("dehydrated", FoodState.DRIED);
        put("canned", FoodState.CANNED);
        put("frozen", FoodState.FROZEN);
        put("cooked", FoodState.COOKED);  // 通用，优先级最低
    }};
    
    // 类别关键词映射
    private static final Map<String, FoodCategory> CATEGORY_KEYWORDS = Map.ofEntries(
        entry("chicken", FoodCategory.POULTRY),
        entry("turkey", FoodCategory.POULTRY),
        entry("duck", FoodCategory.POULTRY),
        entry("beef", FoodCategory.RED_MEAT),
        entry("pork", FoodCategory.RED_MEAT),
        entry("lamb", FoodCategory.RED_MEAT),
        entry("fish", FoodCategory.SEAFOOD),
        entry("salmon", FoodCategory.SEAFOOD),
        entry("shrimp", FoodCategory.SEAFOOD),
        entry("egg", FoodCategory.EGG),
        entry("milk", FoodCategory.DAIRY),
        entry("cheese", FoodCategory.DAIRY),
        entry("rice", FoodCategory.GRAIN),
        entry("bread", FoodCategory.GRAIN),
        entry("apple", FoodCategory.FRUIT),
        entry("banana", FoodCategory.FRUIT),
        entry("carrot", FoodCategory.VEGETABLE),
        entry("broccoli", FoodCategory.VEGETABLE)
        // ... 更多映射
    );

    public ParsedFood parse(String description) {
        String lower = description.toLowerCase();
        String[] parts = description.split(",\\s*");
        
        ParsedFood result = new ParsedFood();
        
        // 1. 提取食物名（前两段）
        result.setNameEn(parts.length >= 2 
            ? parts[0] + ", " + parts[1] 
            : parts[0]);
        
        // 2. 确定类别
        result.setCategory(parseCategory(parts[0].toLowerCase()));
        
        // 3. 解析烹饪状态
        result.setState(parseState(lower));
        
        // 4. 解析皮/骨状态
        result.setHasSkin(parseSkinStatus(lower));
        result.setHasBone(parseBoneStatus(lower));
        
        // 5. 确定可食比例
        result.setEdibleRatio(calculateEdibleRatio(result));
        
        return result;
    }
    
    private FoodCategory parseCategory(String mainFood) {
        for (var entry : CATEGORY_KEYWORDS.entrySet()) {
            if (mainFood.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return FoodCategory.OTHER;
    }
    
    private FoodState parseState(String description) {
        // 按优先级顺序匹配（LinkedHashMap 保持插入顺序）
        for (var entry : STATE_KEYWORDS.entrySet()) {
            if (description.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return FoodState.RAW;  // 默认生的
    }
    
    private boolean parseSkinStatus(String description) {
        if (description.contains("with skin") || 
            description.contains("skin on") ||
            description.contains("meat and skin")) {
            return true;
        }
        if (description.contains("without skin") || 
            description.contains("skinless") ||
            description.contains("meat only")) {
            return false;
        }
        return false;  // 默认去皮
    }
    
    private boolean parseBoneStatus(String description) {
        if (description.contains("bone-in") || 
            description.contains("with bone") ||
            description.contains("on the bone")) {
            return true;
        }
        if (description.contains("boneless") || 
            description.contains("without bone") ||
            description.contains("meat only")) {
            return false;
        }
        return false;  // 默认去骨
    }
    
    private BigDecimal calculateEdibleRatio(ParsedFood food) {
        // 查找预设值
        BigDecimal preset = EdibleRatioLookup.find(
            food.getNameEn(), 
            food.getHasSkin(), 
            food.getHasBone()
        );
        if (preset != null) {
            return preset;
        }
        
        // 使用默认规则
        if (food.getHasBone() && food.getHasSkin()) {
            return new BigDecimal("0.60");
        } else if (food.getHasBone()) {
            return new BigDecimal("0.70");
        } else if (food.getHasSkin()) {
            return new BigDecimal("0.90");
        }
        return BigDecimal.ONE;
    }
}
```

---

## 八、解析结果验证规则

### 8.1 必须满足的条件

| 规则 | 说明 | 失败处理 |
|------|------|----------|
| name_en 不为空 | 必须有食物名称 | 标记为解析失败 |
| edible_ratio ∈ (0, 1] | 可食比例必须合理 | 设为 1.0 并标记警告 |
| category 必须有值 | 必须有类别 | 设为 OTHER |
| state 必须有值 | 必须有状态 | 设为 RAW |

### 8.2 警告条件

| 条件 | 警告信息 |
|------|----------|
| description 长度 < 5 | "Description too short, may be incomplete" |
| 未找到任何状态关键词 | "No cooking state detected, defaulting to RAW" |
| edible_ratio 使用默认值 | "Edible ratio not in preset table, using calculated value" |

---

## 九、测试用例

| # | Input Description | Expected Output |
|---|-------------------|-----------------|
| 1 | "Chicken, breast, meat only, cooked, roasted" | category=POULTRY, state=ROASTED, has_skin=false, has_bone=false, edible_ratio=1.00 |
| 2 | "Chicken, whole, roasted, meat and skin" | category=POULTRY, state=ROASTED, has_skin=true, has_bone=true, edible_ratio=0.65 |
| 3 | "Beef, ground, 80% lean meat / 20% fat, raw" | category=RED_MEAT, state=RAW, has_skin=false, has_bone=false, edible_ratio=1.00 |
| 4 | "Fish, salmon, Atlantic, wild, cooked, dry heat" | category=SEAFOOD, state=ROASTED, has_skin=false, has_bone=false, edible_ratio=1.00 |
| 5 | "Egg, whole, cooked, fried" | category=EGG, state=FRIED, has_skin=false, has_bone=false, edible_ratio=1.00 |
| 6 | "Shrimp, cooked, breaded and fried" | category=SEAFOOD, state=DEEP_FRIED, has_skin=false, has_bone=false, edible_ratio=1.00 |
| 7 | "Apple, raw, with skin" | category=FRUIT, state=RAW, has_skin=true, has_bone=false, edible_ratio=0.90 |
| 8 | "Chicken, wing, roasted" | category=POULTRY, state=ROASTED, has_skin=true, has_bone=true, edible_ratio=0.45 |
| 9 | "Pork, ribs, cooked, braised" | category=RED_MEAT, state=STEWED, has_skin=false, has_bone=true, edible_ratio=0.50 |
| 10 | "Rice, white, long-grain, regular, cooked" | category=GRAIN, state=COOKED, has_skin=false, has_bone=false, edible_ratio=1.00 |

---

## 十、附录：完整关键词参考表

### A. 所有状态关键词（按优先级排序）

```
1. raw, uncooked, fresh
2. roasted, baked, oven-roasted
3. grilled, broiled, barbecued, charbroiled
4. deep-fried, breaded and fried, batter-fried
5. fried, pan-fried, stir-fried, sauteed
6. boiled, poached, blanched
7. steamed
8. braised, stewed, simmered, slow-cooked
9. smoked, cured, jerky
10. dried, dehydrated, sun-dried, freeze-dried
11. canned, jarred
12. frozen
13. cooked (generic), prepared, ready-to-eat
14. microwaved, reheated
```

### B. 特殊描述处理

| 描述模式 | 处理方式 |
|----------|----------|
| "dry heat" | 归类为 ROASTED |
| "moist heat" | 归类为 BOILED 或 STEAMED |
| "fat added" | 标记 has_added_fat = true |
| "no salt added" | 标记 low_sodium = true |
| "NFS" (Not Further Specified) | 使用默认值 |
