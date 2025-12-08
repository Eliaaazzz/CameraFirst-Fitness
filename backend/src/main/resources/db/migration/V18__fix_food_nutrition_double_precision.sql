-- ============================================================================
-- V18: Fix food_nutrition and meal_log NUMERIC columns to DOUBLE PRECISION
-- ============================================================================
-- The food_nutrition table (V13) and meal_log total_ columns (V12) were
-- created with NUMERIC columns, but their entities use Double fields which
-- map to DOUBLE PRECISION. This migration fixes the type mismatch to ensure
-- schema validation passes.
-- ============================================================================

-- Fix food_nutrition table
ALTER TABLE food_nutrition
    ALTER COLUMN calories TYPE DOUBLE PRECISION,
    ALTER COLUMN protein TYPE DOUBLE PRECISION,
    ALTER COLUMN fat TYPE DOUBLE PRECISION,
    ALTER COLUMN carbs TYPE DOUBLE PRECISION,
    ALTER COLUMN fiber TYPE DOUBLE PRECISION,
    ALTER COLUMN sodium TYPE DOUBLE PRECISION;

COMMENT ON COLUMN food_nutrition.calories IS 'Calories per 100g (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN food_nutrition.protein IS 'Protein in grams per 100g (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN food_nutrition.fat IS 'Fat in grams per 100g (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN food_nutrition.carbs IS 'Carbohydrates in grams per 100g (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN food_nutrition.fiber IS 'Fiber in grams per 100g (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN food_nutrition.sodium IS 'Sodium in milligrams per 100g (DOUBLE PRECISION for Java Double compatibility)';

-- Fix meal_log total_ columns
ALTER TABLE meal_log
    ALTER COLUMN total_protein TYPE DOUBLE PRECISION,
    ALTER COLUMN total_carbs TYPE DOUBLE PRECISION,
    ALTER COLUMN total_fat TYPE DOUBLE PRECISION;

COMMENT ON COLUMN meal_log.total_protein IS 'Total protein in meal (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN meal_log.total_carbs IS 'Total carbs in meal (DOUBLE PRECISION for Java Double compatibility)';
COMMENT ON COLUMN meal_log.total_fat IS 'Total fat in meal (DOUBLE PRECISION for Java Double compatibility)';

-- Update statistics after schema changes
ANALYZE food_nutrition;
ANALYZE meal_log;
