-- V13: Create food_nutrition table to store nutrition data per 100g
-- Replaces hardcoded NUTRITION_DATABASE map in NutritionEngineImpl

CREATE TABLE IF NOT EXISTS food_nutrition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_key VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    display_name_cn VARCHAR(200),
    calories NUMERIC(8,2) NOT NULL DEFAULT 0,
    protein NUMERIC(8,2) NOT NULL DEFAULT 0,
    fat NUMERIC(8,2) NOT NULL DEFAULT 0,
    carbs NUMERIC(8,2) NOT NULL DEFAULT 0,
    fiber NUMERIC(8,2) DEFAULT 0,
    sodium NUMERIC(8,2) DEFAULT 0,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by food_key
CREATE INDEX IF NOT EXISTS idx_food_nutrition_food_key ON food_nutrition(food_key);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_category ON food_nutrition(category);

-- Insert default nutrition data (per 100g)
INSERT INTO food_nutrition (food_key, display_name, display_name_cn, calories, protein, fat, carbs, category) VALUES
-- Rice and grains
('steamed_rice', 'Steamed Rice', '白米饭', 116.0, 2.6, 0.3, 25.6, 'grains'),
('fried_rice', 'Fried Rice', '炒饭', 186.0, 4.8, 7.2, 26.5, 'grains'),
('noodles', 'Noodles', '面条', 137.0, 4.5, 0.6, 28.5, 'grains'),
('brown_rice', 'Brown Rice', '糙米饭', 111.0, 2.6, 0.9, 23.0, 'grains'),
('congee', 'Rice Congee', '白粥', 46.0, 1.1, 0.1, 10.0, 'grains'),

-- Meat
('braised_pork', 'Braised Pork Belly', '红烧肉', 340.0, 14.0, 28.0, 5.0, 'meat'),
('chicken_breast', 'Chicken Breast', '鸡胸肉', 133.0, 28.0, 2.0, 0.0, 'meat'),
('beef', 'Beef', '牛肉', 125.0, 20.0, 4.5, 0.0, 'meat'),
('beef_stir_fry', 'Beef Stir Fry', '炒牛肉', 180.0, 18.0, 10.0, 3.0, 'meat'),
('pork_chop', 'Pork Chop', '猪排', 231.0, 25.0, 14.0, 0.0, 'meat'),
('roast_duck', 'Roast Duck', '烤鸭', 337.0, 19.0, 28.0, 0.0, 'meat'),
('kung_pao_chicken', 'Kung Pao Chicken', '宫保鸡丁', 186.0, 16.0, 10.0, 8.0, 'meat'),

-- Eggs
('boiled_egg', 'Boiled Egg', '水煮蛋', 155.0, 12.6, 10.6, 1.1, 'eggs'),
('fried_egg', 'Fried Egg', '煎蛋', 196.0, 13.6, 15.3, 1.1, 'eggs'),
('scrambled_egg', 'Scrambled Egg', '炒蛋', 168.0, 11.0, 12.2, 2.2, 'eggs'),
('tomato_egg', 'Tomato Egg', '番茄炒蛋', 95.0, 6.0, 6.5, 4.5, 'eggs'),
('steamed_egg', 'Steamed Egg', '蒸蛋', 84.0, 7.0, 5.5, 1.5, 'eggs'),

-- Vegetables
('stir_fried_vegetables', 'Stir Fried Vegetables', '炒青菜', 38.0, 2.3, 2.1, 3.2, 'vegetables'),
('broccoli', 'Broccoli', '西兰花', 34.0, 2.8, 0.4, 7.0, 'vegetables'),
('spinach', 'Spinach', '菠菜', 23.0, 2.9, 0.4, 3.6, 'vegetables'),
('cabbage', 'Cabbage', '卷心菜', 25.0, 1.3, 0.1, 5.8, 'vegetables'),
('cucumber', 'Cucumber', '黄瓜', 15.0, 0.7, 0.1, 3.6, 'vegetables'),
('tomato', 'Tomato', '番茄', 18.0, 0.9, 0.2, 3.9, 'vegetables'),
('carrot', 'Carrot', '胡萝卜', 41.0, 0.9, 0.2, 10.0, 'vegetables'),
('eggplant', 'Eggplant', '茄子', 25.0, 1.0, 0.2, 6.0, 'vegetables'),

-- Tofu and beans
('tofu', 'Tofu', '豆腐', 76.0, 8.1, 3.7, 4.2, 'tofu'),
('mapo_tofu', 'Mapo Tofu', '麻婆豆腐', 135.0, 8.5, 9.0, 5.5, 'tofu'),
('edamame', 'Edamame', '毛豆', 121.0, 11.0, 5.0, 9.0, 'tofu'),

-- Seafood
('steamed_fish', 'Steamed Fish', '清蒸鱼', 96.0, 20.0, 1.5, 0.0, 'seafood'),
('grilled_salmon', 'Grilled Salmon', '烤三文鱼', 208.0, 20.0, 13.0, 0.0, 'seafood'),
('shrimp', 'Shrimp', '虾', 99.0, 24.0, 0.3, 0.2, 'seafood'),
('fried_shrimp', 'Fried Shrimp', '炸虾', 242.0, 18.0, 11.0, 18.0, 'seafood'),

-- Soups
('wonton_soup', 'Wonton Soup', '馄饨汤', 72.0, 3.5, 2.0, 10.0, 'soup'),
('egg_drop_soup', 'Egg Drop Soup', '蛋花汤', 38.0, 2.5, 1.5, 3.5, 'soup'),
('miso_soup', 'Miso Soup', '味噌汤', 40.0, 3.0, 1.0, 5.0, 'soup'),

-- Dim sum
('dumpling', 'Dumpling', '饺子', 210.0, 8.0, 6.0, 30.0, 'dimsum'),
('steamed_bun', 'Steamed Bun', '包子', 223.0, 7.5, 3.0, 42.0, 'dimsum'),
('spring_roll', 'Spring Roll', '春卷', 231.0, 5.0, 10.0, 30.0, 'dimsum'),
('shumai', 'Shumai', '烧卖', 195.0, 9.0, 8.0, 22.0, 'dimsum'),

-- Fruits
('apple', 'Apple', '苹果', 52.0, 0.3, 0.2, 14.0, 'fruit'),
('banana', 'Banana', '香蕉', 89.0, 1.1, 0.3, 23.0, 'fruit'),
('orange', 'Orange', '橙子', 47.0, 0.9, 0.1, 12.0, 'fruit'),
('watermelon', 'Watermelon', '西瓜', 30.0, 0.6, 0.2, 8.0, 'fruit'),

-- Default fallback
('unknown', 'Unknown Food', '未知食物', 150.0, 8.0, 6.0, 15.0, 'other')
ON CONFLICT (food_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE food_nutrition IS 'Nutrition data per 100g for food recognition feature';

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create food_synonym table for NLP fuzzy matching
CREATE TABLE IF NOT EXISTS food_synonym (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    synonym VARCHAR(100) NOT NULL UNIQUE,
    canonical_food_key VARCHAR(100) NOT NULL REFERENCES food_nutrition(food_key) ON DELETE CASCADE,
    language VARCHAR(10), -- 'zh' for Chinese, 'en' for English
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast synonym lookup
CREATE INDEX IF NOT EXISTS idx_food_synonym_synonym ON food_synonym(synonym);
CREATE INDEX IF NOT EXISTS idx_food_synonym_canonical ON food_synonym(canonical_food_key);

-- Trigram index for fuzzy search
CREATE INDEX IF NOT EXISTS idx_food_synonym_trgm ON food_synonym USING GIN (synonym gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_key_trgm ON food_nutrition USING GIN (food_key gin_trgm_ops);

-- Insert common synonyms for fuzzy matching
INSERT INTO food_synonym (synonym, canonical_food_key, language) VALUES
-- Chinese synonyms for rice
('白饭', 'steamed_rice', 'zh'),
('米饭', 'steamed_rice', 'zh'),
('白米', 'steamed_rice', 'zh'),
('大米饭', 'steamed_rice', 'zh'),
('蛋炒饭', 'fried_rice', 'zh'),
('扬州炒饭', 'fried_rice', 'zh'),

-- English synonyms for rice
('white rice', 'steamed_rice', 'en'),
('plain rice', 'steamed_rice', 'en'),
('cooked rice', 'steamed_rice', 'en'),
('egg fried rice', 'fried_rice', 'en'),
('yangzhou fried rice', 'fried_rice', 'en'),

-- Chinese synonyms for noodles
('拉面', 'noodles', 'zh'),
('挂面', 'noodles', 'zh'),
('汤面', 'noodles', 'zh'),
('炒面', 'noodles', 'zh'),

-- Chinese synonyms for meat dishes
('东坡肉', 'braised_pork', 'zh'),
('五花肉', 'braised_pork', 'zh'),
('鸡肉', 'chicken_breast', 'zh'),
('牛排', 'beef', 'zh'),
('炒牛肉丝', 'beef_stir_fry', 'zh'),
('青椒牛肉', 'beef_stir_fry', 'zh'),

-- English synonyms
('pork belly', 'braised_pork', 'en'),
('chicken', 'chicken_breast', 'en'),
('steak', 'beef', 'en'),
('beef strips', 'beef_stir_fry', 'en'),

-- Chinese synonyms for eggs
('白煮蛋', 'boiled_egg', 'zh'),
('茶叶蛋', 'boiled_egg', 'zh'),
('荷包蛋', 'fried_egg', 'zh'),
('滑蛋', 'scrambled_egg', 'zh'),
('西红柿炒蛋', 'tomato_egg', 'zh'),

-- Chinese synonyms for vegetables
('炒菜', 'stir_fried_vegetables', 'zh'),
('青菜', 'stir_fried_vegetables', 'zh'),
('时蔬', 'stir_fried_vegetables', 'zh'),

-- Chinese synonyms for tofu
('嫩豆腐', 'tofu', 'zh'),
('老豆腐', 'tofu', 'zh'),
('豆干', 'tofu', 'zh'),

-- Chinese synonyms for dim sum
('水饺', 'dumpling', 'zh'),
('蒸饺', 'dumpling', 'zh'),
('锅贴', 'dumpling', 'zh'),
('馒头', 'steamed_bun', 'zh'),
('花卷', 'steamed_bun', 'zh'),
('炸春卷', 'spring_roll', 'zh')
ON CONFLICT (synonym) DO NOTHING;

-- Add comment
COMMENT ON TABLE food_synonym IS 'Synonyms for food_key to support NLP fuzzy matching';
