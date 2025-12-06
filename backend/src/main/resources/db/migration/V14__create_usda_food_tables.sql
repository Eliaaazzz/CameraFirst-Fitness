-- USDA food catalog tables (kept separate from existing food_nutrition)

CREATE TABLE IF NOT EXISTS usda_food (
    id BIGSERIAL PRIMARY KEY,
    fdc_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    food_state VARCHAR(50),
    data_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usda_food_nutrition (
    id BIGSERIAL PRIMARY KEY,
    food_id BIGINT NOT NULL UNIQUE REFERENCES usda_food(id) ON DELETE CASCADE,
    calories NUMERIC(10,2) NOT NULL,
    protein_g NUMERIC(10,2),
    fat_g NUMERIC(10,2),
    carbs_g NUMERIC(10,2),
    fiber_g NUMERIC(10,2),
    sugar_g NUMERIC(10,2),
    sodium_mg NUMERIC(10,2),
    saturated_fat_g NUMERIC(10,2),
    quality_score NUMERIC(3,2) DEFAULT 0.80
);

CREATE TABLE IF NOT EXISTS usda_food_alias (
    id BIGSERIAL PRIMARY KEY,
    food_id BIGINT NOT NULL REFERENCES usda_food(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (food_id, alias, language)
);

CREATE INDEX IF NOT EXISTS idx_usda_food_name ON usda_food(name);
CREATE INDEX IF NOT EXISTS idx_usda_food_category ON usda_food(category);
CREATE INDEX IF NOT EXISTS idx_usda_food_state ON usda_food(food_state);
CREATE INDEX IF NOT EXISTS idx_usda_food_alias_alias ON usda_food_alias(alias);
CREATE INDEX IF NOT EXISTS idx_usda_food_alias_language ON usda_food_alias(language);

-- Enable trigram search for fuzzy matching if available
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_usda_food_name_trgm ON usda_food USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usda_food_alias_trgm ON usda_food_alias USING GIN (alias gin_trgm_ops);
