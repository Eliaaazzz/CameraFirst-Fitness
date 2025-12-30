-- ============================================================================
-- V31: Add Generated Columns for Recipe Nutrition
-- ============================================================================
-- This migration adds PostgreSQL GENERATED STORED columns for nutrition metrics.
-- These columns are automatically computed from the nutrition_summary JSONB column,
-- enabling efficient B-tree indexing and clean JPA queries.
--
-- Benefits:
-- 1. B-tree indexes on scalar columns (much faster than GIN on JSONB)
-- 2. Clean JPA method names: findByCaloriesBetween(), findByProteinGreaterThan()
-- 3. No runtime JSONB parsing - values computed once on INSERT/UPDATE
-- 4. Automatic sync - generated columns always match nutrition_summary
-- ============================================================================

-- Add generated columns for core nutrition metrics
-- These are GENERATED ALWAYS AS (expression) STORED columns

-- Calories (integer) - supports both flat and nested formats
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS calories INTEGER
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'calories')::integer,
            (nutrition_summary->'macros'->'calories'->>'amount')::integer
        )
    ) STORED;

-- Protein (numeric with 2 decimal places)
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS protein NUMERIC(8,2)
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'protein')::numeric,
            (nutrition_summary->'macros'->'protein'->>'amount')::numeric
        )
    ) STORED;

-- Carbs (numeric with 2 decimal places)
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS carbs NUMERIC(8,2)
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'carbs')::numeric,
            (nutrition_summary->'macros'->'carbs'->>'amount')::numeric
        )
    ) STORED;

-- Fat (numeric with 2 decimal places)
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS fat NUMERIC(8,2)
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'fat')::numeric,
            (nutrition_summary->'macros'->'fat'->>'amount')::numeric
        )
    ) STORED;

-- Sugar (numeric with 2 decimal places) - important for blood sugar control
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS sugar NUMERIC(8,2)
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'sugar')::numeric,
            (nutrition_summary->'macros'->'sugar'->>'amount')::numeric
        )
    ) STORED;

-- Fiber (numeric with 2 decimal places) - important for blood sugar control
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS fiber NUMERIC(8,2)
    GENERATED ALWAYS AS (
        COALESCE(
            (nutrition_summary->>'fiber')::numeric,
            (nutrition_summary->'macros'->'fiber'->>'amount')::numeric
        )
    ) STORED;

-- ============================================================================
-- Create B-tree indexes on generated columns
-- These replace the functional JSONB indexes with much more efficient B-trees
-- ============================================================================

-- Index for calorie range queries (fat_loss, maintenance goals)
CREATE INDEX IF NOT EXISTS idx_recipe_gen_calories ON recipe (calories)
    WHERE calories IS NOT NULL;

-- Index for protein queries (muscle building goal)
CREATE INDEX IF NOT EXISTS idx_recipe_gen_protein ON recipe (protein DESC NULLS LAST)
    WHERE protein IS NOT NULL;

-- Index for carbs queries (low-carb diets)
CREATE INDEX IF NOT EXISTS idx_recipe_gen_carbs ON recipe (carbs)
    WHERE carbs IS NOT NULL;

-- Index for fat queries
CREATE INDEX IF NOT EXISTS idx_recipe_gen_fat ON recipe (fat)
    WHERE fat IS NOT NULL;

-- Index for sugar queries (blood sugar control)
CREATE INDEX IF NOT EXISTS idx_recipe_gen_sugar ON recipe (sugar)
    WHERE sugar IS NOT NULL;

-- Index for fiber queries (blood sugar control, digestive health)
CREATE INDEX IF NOT EXISTS idx_recipe_gen_fiber ON recipe (fiber DESC NULLS LAST)
    WHERE fiber IS NOT NULL;

-- ============================================================================
-- Composite indexes for common query patterns
-- ============================================================================

-- For hybrid search: embedding + nutrition constraints
-- The WHERE clause matches the common filter pattern in ContentRecommendationService
CREATE INDEX IF NOT EXISTS idx_recipe_hybrid_search ON recipe (calories, protein)
    WHERE embedding IS NOT NULL AND image_url IS NOT NULL;

-- For fat loss goal: low calories + high protein
CREATE INDEX IF NOT EXISTS idx_recipe_fat_loss ON recipe (calories ASC, protein DESC NULLS LAST)
    WHERE image_url IS NOT NULL;

-- For muscle gain goal: high protein
CREATE INDEX IF NOT EXISTS idx_recipe_muscle_gain ON recipe (protein DESC NULLS LAST, calories)
    WHERE image_url IS NOT NULL;

-- For blood sugar control: low sugar + high fiber
CREATE INDEX IF NOT EXISTS idx_recipe_blood_sugar ON recipe (sugar ASC, fiber DESC NULLS LAST)
    WHERE image_url IS NOT NULL;

-- ============================================================================
-- Drop old functional JSONB indexes (if they exist) to avoid redundancy
-- ============================================================================

DROP INDEX IF EXISTS idx_recipe_calories;
DROP INDEX IF EXISTS idx_recipe_protein;
DROP INDEX IF EXISTS idx_recipe_carbs;
DROP INDEX IF EXISTS idx_recipe_fat;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'V31: Added generated nutrition columns and optimized indexes to recipe table';
END $$;
