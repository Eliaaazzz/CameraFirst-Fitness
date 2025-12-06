# 食物营养数据库表设计文档

> 版本：1.0.0  
> 日期：2025-12-06  
> 作者：AuraFitness 后端团队

---

## 一、设计目标

建立一套标准化的食物营养数据库，支持：
- 从 USDA FoodData Central 导入权威数据
- 自动计算任意重量食物的营养成分
- 支持多语言别名映射
- 支持食物状态（生/熟/烤/炸等）的精细化管理

---

## 二、核心表结构

### 2.1 食物定义表 `food`

| 字段名 | 类型 | 可空 | 默认值 | 说明 | 示例值 |
|--------|------|------|--------|------|--------|
| `id` | BIGINT | NO | AUTO | 主键 | 1 |
| `fdc_id` | VARCHAR(32) | YES | NULL | USDA FoodData Central ID | "171705" |
| `name_en` | VARCHAR(255) | NO | - | 英文标准名称 | "Chicken, breast" |
| `name_zh` | VARCHAR(255) | YES | NULL | 中文名称 | "鸡胸肉" |
| `category` | VARCHAR(32) | NO | 'OTHER' | 食物类别（枚举） | "POULTRY" |
| `state` | VARCHAR(32) | NO | 'RAW' | 烹饪状态（枚举） | "ROASTED" |
| `has_skin` | BOOLEAN | NO | FALSE | 是否带皮 | true |
| `has_bone` | BOOLEAN | NO | FALSE | 是否带骨 | false |
| `edible_ratio` | DECIMAL(4,3) | NO | 1.000 | 可食用比例 (0.001-1.000) | 0.650 |
| `source` | VARCHAR(32) | NO | 'USDA' | 数据来源 | "USDA" |
| `source_version` | VARCHAR(32) | YES | NULL | 数据源版本 | "SR28" |
| `is_verified` | BOOLEAN | NO | FALSE | 是否已人工校验 | true |
| `is_active` | BOOLEAN | NO | TRUE | 是否启用 | true |
| `created_at` | TIMESTAMP | NO | CURRENT | 创建时间 | 2025-12-06 10:00:00 |
| `updated_at` | TIMESTAMP | NO | CURRENT | 更新时间 | 2025-12-06 10:00:00 |

### 2.2 营养数据表 `food_nutrition`

| 字段名 | 类型 | 可空 | 默认值 | 说明 | 示例值 |
|--------|------|------|--------|------|--------|
| `id` | BIGINT | NO | AUTO | 主键 | 1 |
| `food_id` | BIGINT | NO | - | 外键关联 food.id | 1 |
| `basis` | VARCHAR(16) | NO | 'PER_100G' | 计量基准（枚举） | "PER_100G" |
| `calories` | DECIMAL(8,2) | NO | 0 | 热量 (kcal) | 165.00 |
| `protein` | DECIMAL(8,3) | NO | 0 | 蛋白质 (g) | 31.000 |
| `fat` | DECIMAL(8,3) | NO | 0 | 脂肪 (g) | 3.600 |
| `carbs` | DECIMAL(8,3) | NO | 0 | 碳水化合物 (g) | 0.000 |
| `fiber` | DECIMAL(8,3) | YES | NULL | 膳食纤维 (g) | 0.000 |
| `sugar` | DECIMAL(8,3) | YES | NULL | 糖 (g) | 0.000 |
| `sodium` | DECIMAL(8,3) | YES | NULL | 钠 (mg) | 74.000 |
| `saturated_fat` | DECIMAL(8,3) | YES | NULL | 饱和脂肪 (g) | 1.010 |
| `cholesterol` | DECIMAL(8,3) | YES | NULL | 胆固醇 (mg) | 85.000 |
| `is_calculated` | BOOLEAN | NO | FALSE | 是否为计算值 | false |
| `quality_score` | DECIMAL(3,2) | YES | NULL | 数据质量分 (0-1) | 0.95 |
| `created_at` | TIMESTAMP | NO | CURRENT | 创建时间 | 2025-12-06 10:00:00 |
| `updated_at` | TIMESTAMP | NO | CURRENT | 更新时间 | 2025-12-06 10:00:00 |

### 2.3 别名映射表 `food_alias`

| 字段名 | 类型 | 可空 | 默认值 | 说明 | 示例值 |
|--------|------|------|--------|------|--------|
| `id` | BIGINT | NO | AUTO | 主键 | 1 |
| `food_id` | BIGINT | NO | - | 外键关联 food.id | 1 |
| `alias` | VARCHAR(255) | NO | - | 别名文本 | "烤鸡胸" |
| `language` | VARCHAR(8) | NO | 'en' | 语言代码 | "zh" |
| `alias_type` | VARCHAR(32) | NO | 'COMMON' | 别名类型（枚举） | "COMMON" |
| `priority` | INT | NO | 0 | 匹配优先级（越大越优先） | 100 |
| `is_active` | BOOLEAN | NO | TRUE | 是否启用 | true |
| `created_at` | TIMESTAMP | NO | CURRENT | 创建时间 | 2025-12-06 10:00:00 |

---

## 三、枚举定义

### 3.1 食物类别 `FoodCategory`

| 枚举值 | 中文名称 | 典型食物 |
|--------|----------|----------|
| `POULTRY` | 禽肉类 | 鸡、鸭、鹅、火鸡 |
| `RED_MEAT` | 红肉类 | 牛、猪、羊 |
| `SEAFOOD` | 海鲜类 | 鱼、虾、蟹、贝类 |
| `DAIRY` | 乳制品 | 牛奶、奶酪、酸奶 |
| `EGG` | 蛋类 | 鸡蛋、鸭蛋、鹌鹑蛋 |
| `GRAIN` | 谷物类 | 米、面、燕麦、玉米 |
| `VEGETABLE` | 蔬菜类 | 叶菜、根茎、瓜果类蔬菜 |
| `FRUIT` | 水果类 | 苹果、香蕉、橙子 |
| `LEGUME` | 豆类 | 大豆、绿豆、豌豆 |
| `NUT` | 坚果类 | 核桃、杏仁、花生 |
| `OIL` | 油脂类 | 橄榄油、菜籽油、黄油 |
| `BEVERAGE` | 饮品类 | 果汁、咖啡、茶 |
| `CONDIMENT` | 调味品 | 酱油、醋、盐 |
| `SNACK` | 零食类 | 薯片、饼干、糖果 |
| `PREPARED` | 预制食品 | 罐头、冷冻食品 |
| `OTHER` | 其他 | 未分类食物 |

### 3.2 烹饪状态 `FoodState`

| 枚举值 | 英文含义 | 中文名称 | 热量变化趋势 |
|--------|----------|----------|--------------|
| `RAW` | Raw | 生的 | 基准 |
| `COOKED` | Cooked (general) | 熟的（通用） | +5~10% |
| `BOILED` | Boiled | 水煮 | 0~+5% |
| `STEAMED` | Steamed | 蒸 | 0~+5% |
| `ROASTED` | Roasted/Baked | 烤/烘焙 | +10~15% |
| `GRILLED` | Grilled | 炙烤 | +10~15% |
| `FRIED` | Fried | 煎/炒 | +15~30% |
| `DEEP_FRIED` | Deep-fried | 油炸 | +30~50% |
| `STEWED` | Stewed/Braised | 炖/焖 | +5~10% |
| `SMOKED` | Smoked | 烟熏 | +10~20% |
| `DRIED` | Dried/Dehydrated | 干燥 | +200~300% |
| `CANNED` | Canned | 罐装 | 约+10% |
| `FROZEN` | Frozen | 冷冻 | ≈0% |

### 3.3 计量基准 `NutritionBasis`

| 枚举值 | 说明 |
|--------|------|
| `PER_100G` | 每 100 克可食部分（默认标准） |
| `PER_SERVING` | 每份（需配合 serving_size 使用） |
| `PER_UNIT` | 每个/只/片（如：1个苹果） |

### 3.4 别名类型 `AliasType`

| 枚举值 | 说明 | 示例 |
|--------|------|------|
| `STANDARD` | 标准名称 | "Chicken breast" |
| `COMMON` | 常见叫法 | "鸡胸"、"鸡脯肉" |
| `BRAND` | 品牌名称 | "必胜客烤鸡翅" |
| `REGIONAL` | 地方叫法 | "白切鸡" (粤语) |
| `AI_DETECTED` | AI 识别名称 | "grilled chicken" |

---

## 四、建表 SQL（PostgreSQL）

```sql
-- ============================================================
-- 食物营养数据库 DDL
-- 兼容 PostgreSQL 14+
-- ============================================================

-- 删除已存在的表（开发环境使用）
DROP TABLE IF EXISTS food_alias CASCADE;
DROP TABLE IF EXISTS food_nutrition CASCADE;
DROP TABLE IF EXISTS food CASCADE;

-- 删除已存在的类型
DROP TYPE IF EXISTS food_category CASCADE;
DROP TYPE IF EXISTS food_state CASCADE;
DROP TYPE IF EXISTS nutrition_basis CASCADE;
DROP TYPE IF EXISTS alias_type CASCADE;

-- ============================================================
-- 创建枚举类型
-- ============================================================

CREATE TYPE food_category AS ENUM (
    'POULTRY', 'RED_MEAT', 'SEAFOOD', 'DAIRY', 'EGG',
    'GRAIN', 'VEGETABLE', 'FRUIT', 'LEGUME', 'NUT',
    'OIL', 'BEVERAGE', 'CONDIMENT', 'SNACK', 'PREPARED', 'OTHER'
);

CREATE TYPE food_state AS ENUM (
    'RAW', 'COOKED', 'BOILED', 'STEAMED', 'ROASTED',
    'GRILLED', 'FRIED', 'DEEP_FRIED', 'STEWED', 'SMOKED',
    'DRIED', 'CANNED', 'FROZEN'
);

CREATE TYPE nutrition_basis AS ENUM (
    'PER_100G', 'PER_SERVING', 'PER_UNIT'
);

CREATE TYPE alias_type AS ENUM (
    'STANDARD', 'COMMON', 'BRAND', 'REGIONAL', 'AI_DETECTED'
);

-- ============================================================
-- 食物定义表
-- ============================================================

CREATE TABLE food (
    id              BIGSERIAL PRIMARY KEY,
    fdc_id          VARCHAR(32) UNIQUE,
    name_en         VARCHAR(255) NOT NULL,
    name_zh         VARCHAR(255),
    category        food_category NOT NULL DEFAULT 'OTHER',
    state           food_state NOT NULL DEFAULT 'RAW',
    has_skin        BOOLEAN NOT NULL DEFAULT FALSE,
    has_bone        BOOLEAN NOT NULL DEFAULT FALSE,
    edible_ratio    DECIMAL(4,3) NOT NULL DEFAULT 1.000 
                    CHECK (edible_ratio > 0 AND edible_ratio <= 1),
    source          VARCHAR(32) NOT NULL DEFAULT 'USDA',
    source_version  VARCHAR(32),
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_food_category ON food(category);
CREATE INDEX idx_food_state ON food(state);
CREATE INDEX idx_food_name_en ON food(name_en);
CREATE INDEX idx_food_name_zh ON food(name_zh);
CREATE INDEX idx_food_active ON food(is_active);
CREATE INDEX idx_food_fdc_id ON food(fdc_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_updated_at
    BEFORE UPDATE ON food
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- 营养数据表
-- ============================================================

CREATE TABLE food_nutrition (
    id              BIGSERIAL PRIMARY KEY,
    food_id         BIGINT NOT NULL REFERENCES food(id) ON DELETE CASCADE,
    basis           nutrition_basis NOT NULL DEFAULT 'PER_100G',
    calories        DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (calories >= 0),
    protein         DECIMAL(8,3) NOT NULL DEFAULT 0 CHECK (protein >= 0),
    fat             DECIMAL(8,3) NOT NULL DEFAULT 0 CHECK (fat >= 0),
    carbs           DECIMAL(8,3) NOT NULL DEFAULT 0 CHECK (carbs >= 0),
    fiber           DECIMAL(8,3) CHECK (fiber >= 0),
    sugar           DECIMAL(8,3) CHECK (sugar >= 0),
    sodium          DECIMAL(8,3) CHECK (sodium >= 0),
    saturated_fat   DECIMAL(8,3) CHECK (saturated_fat >= 0),
    cholesterol     DECIMAL(8,3) CHECK (cholesterol >= 0),
    is_calculated   BOOLEAN NOT NULL DEFAULT FALSE,
    quality_score   DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 每个食物只能有一条 PER_100G 的记录
    CONSTRAINT unique_food_basis UNIQUE (food_id, basis)
);

-- 索引
CREATE INDEX idx_nutrition_food_id ON food_nutrition(food_id);
CREATE INDEX idx_nutrition_calories ON food_nutrition(calories);

CREATE TRIGGER food_nutrition_updated_at
    BEFORE UPDATE ON food_nutrition
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- 别名映射表
-- ============================================================

CREATE TABLE food_alias (
    id              BIGSERIAL PRIMARY KEY,
    food_id         BIGINT NOT NULL REFERENCES food(id) ON DELETE CASCADE,
    alias           VARCHAR(255) NOT NULL,
    language        VARCHAR(8) NOT NULL DEFAULT 'en',
    alias_type      alias_type NOT NULL DEFAULT 'COMMON',
    priority        INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 同一语言下别名唯一
    CONSTRAINT unique_alias_per_language UNIQUE (alias, language)
);

-- 索引
CREATE INDEX idx_alias_food_id ON food_alias(food_id);
CREATE INDEX idx_alias_text ON food_alias(alias);
CREATE INDEX idx_alias_language ON food_alias(language);
CREATE INDEX idx_alias_priority ON food_alias(priority DESC);

-- 全文搜索索引（PostgreSQL 特性）
CREATE INDEX idx_alias_fulltext ON food_alias USING gin(to_tsvector('english', alias));

-- ============================================================
-- 示例数据
-- ============================================================

-- 插入示例食物：烤鸡胸肉（去皮去骨）
INSERT INTO food (fdc_id, name_en, name_zh, category, state, has_skin, has_bone, edible_ratio, source, source_version, is_verified)
VALUES ('171077', 'Chicken, breast, roasted', '烤鸡胸肉', 'POULTRY', 'ROASTED', FALSE, FALSE, 1.000, 'USDA', 'SR28', TRUE);

-- 插入营养数据
INSERT INTO food_nutrition (food_id, basis, calories, protein, fat, carbs, fiber, sugar, sodium, saturated_fat, cholesterol, quality_score)
VALUES (1, 'PER_100G', 165.00, 31.000, 3.600, 0.000, 0.000, 0.000, 74.000, 1.010, 85.000, 0.98);

-- 插入别名
INSERT INTO food_alias (food_id, alias, language, alias_type, priority) VALUES
(1, 'Chicken breast', 'en', 'COMMON', 100),
(1, 'Roasted chicken breast', 'en', 'STANDARD', 90),
(1, '鸡胸肉', 'zh', 'COMMON', 100),
(1, '烤鸡胸', 'zh', 'COMMON', 90),
(1, '鸡脯肉', 'zh', 'REGIONAL', 80);

-- 插入示例食物：整只烤鸡（带骨带皮）
INSERT INTO food (fdc_id, name_en, name_zh, category, state, has_skin, has_bone, edible_ratio, source, source_version, is_verified)
VALUES ('171082', 'Chicken, whole, roasted', '烤全鸡', 'POULTRY', 'ROASTED', TRUE, TRUE, 0.650, 'USDA', 'SR28', TRUE);

INSERT INTO food_nutrition (food_id, basis, calories, protein, fat, carbs, sodium, saturated_fat, cholesterol, quality_score)
VALUES (2, 'PER_100G', 239.00, 25.000, 14.000, 0.000, 82.000, 3.900, 88.000, 0.95);

INSERT INTO food_alias (food_id, alias, language, alias_type, priority) VALUES
(2, 'Whole roasted chicken', 'en', 'STANDARD', 100),
(2, 'Rotisserie chicken', 'en', 'COMMON', 90),
(2, '烤鸡', 'zh', 'COMMON', 100),
(2, '烧鸡', 'zh', 'REGIONAL', 80);

-- ============================================================
-- 常用查询视图
-- ============================================================

-- 食物完整信息视图
CREATE VIEW v_food_complete AS
SELECT 
    f.id,
    f.fdc_id,
    f.name_en,
    f.name_zh,
    f.category::text AS category,
    f.state::text AS state,
    f.has_skin,
    f.has_bone,
    f.edible_ratio,
    fn.calories,
    fn.protein,
    fn.fat,
    fn.carbs,
    fn.fiber,
    fn.sugar,
    fn.sodium,
    fn.quality_score,
    f.is_verified,
    f.source,
    f.source_version
FROM food f
LEFT JOIN food_nutrition fn ON f.id = fn.food_id AND fn.basis = 'PER_100G'
WHERE f.is_active = TRUE;

-- 食物搜索视图（含别名）
CREATE VIEW v_food_searchable AS
SELECT 
    f.id AS food_id,
    f.name_en,
    f.name_zh,
    fa.alias,
    fa.language,
    fa.priority,
    f.category::text AS category,
    f.state::text AS state
FROM food f
LEFT JOIN food_alias fa ON f.id = fa.food_id AND fa.is_active = TRUE
WHERE f.is_active = TRUE;

COMMENT ON TABLE food IS '食物定义表 - 存储食物基础信息和属性';
COMMENT ON TABLE food_nutrition IS '营养数据表 - 存储每100g可食部分的营养成分';
COMMENT ON TABLE food_alias IS '别名映射表 - 支持多语言和多种叫法的搜索';
```

---

## 五、表关系 ER 图

```
┌─────────────────────────────────────────────────────────────┐
│                          food                                │
├─────────────────────────────────────────────────────────────┤
│ PK id              BIGINT                                    │
│    fdc_id          VARCHAR(32)     -- USDA 原始 ID           │
│    name_en         VARCHAR(255)    -- 英文名                  │
│    name_zh         VARCHAR(255)    -- 中文名                  │
│    category        ENUM            -- 食物类别                │
│    state           ENUM            -- 烹饪状态                │
│    has_skin        BOOLEAN         -- 是否带皮                │
│    has_bone        BOOLEAN         -- 是否带骨                │
│    edible_ratio    DECIMAL(4,3)    -- 可食比例                │
│    source          VARCHAR(32)     -- 数据来源                │
│    source_version  VARCHAR(32)     -- 数据版本                │
│    is_verified     BOOLEAN         -- 是否校验                │
│    is_active       BOOLEAN         -- 是否启用                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     food_nutrition                           │
├─────────────────────────────────────────────────────────────┤
│ PK id              BIGINT                                    │
│ FK food_id         BIGINT          -- 关联 food.id           │
│    basis           ENUM            -- 计量基准 (PER_100G)     │
│    calories        DECIMAL(8,2)    -- 热量 kcal              │
│    protein         DECIMAL(8,3)    -- 蛋白质 g               │
│    fat             DECIMAL(8,3)    -- 脂肪 g                 │
│    carbs           DECIMAL(8,3)    -- 碳水 g                 │
│    fiber           DECIMAL(8,3)    -- 纤维 g                 │
│    sugar           DECIMAL(8,3)    -- 糖 g                   │
│    sodium          DECIMAL(8,3)    -- 钠 mg                  │
│    quality_score   DECIMAL(3,2)    -- 质量分 0-1             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       food_alias                             │
├─────────────────────────────────────────────────────────────┤
│ PK id              BIGINT                                    │
│ FK food_id         BIGINT          -- 关联 food.id           │
│    alias           VARCHAR(255)    -- 别名文本                │
│    language        VARCHAR(8)      -- 语言 en/zh             │
│    alias_type      ENUM            -- 别名类型                │
│    priority        INT             -- 匹配优先级              │
│    is_active       BOOLEAN         -- 是否启用                │
└─────────────────────────────────────────────────────────────┘
         food : food_alias = 1 : N
```

---

## 六、设计说明

### 6.1 为什么使用 `edible_ratio`？

用户输入的重量通常是"总重量"（如一整只鸡 900g），但营养数据是基于"可食部分"计算的。

**计算公式：**
```
实际摄入营养 = (总重量 × edible_ratio) × (营养值 / 100)
```

**示例：**
- 烤全鸡 900g，edible_ratio = 0.65
- 可食部分 = 900 × 0.65 = 585g
- 蛋白质摄入 = 585 × (25g / 100g) = 146.25g

### 6.2 为什么分离 `food` 和 `food_nutrition`？

1. **扩展性**：未来可能增加 `PER_SERVING`、`PER_UNIT` 等计量方式
2. **版本管理**：营养数据可能更新，便于保留历史版本
3. **数据质量**：便于对营养数据单独进行 QA 检查

### 6.3 别名表的用途

- **搜索匹配**：用户输入"鸡胸"能找到"Chicken breast"
- **AI 识别**：将 Gemini 返回的食物名映射到标准食物
- **多语言**：支持中英文及方言搜索
