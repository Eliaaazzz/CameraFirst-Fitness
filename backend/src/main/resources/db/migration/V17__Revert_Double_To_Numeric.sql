-- ============================================================================
-- V17: Revert DOUBLE PRECISION to NUMERIC for Financial Precision
-- ============================================================================
-- This migration reverts V11's changes to restore NUMERIC types for financial
-- and precise numerical data, maintaining high precision for monetary values.
--
-- Background:
-- - Java BigDecimal maps to PostgreSQL NUMERIC/DECIMAL
-- - NUMERIC provides exact precision required for financial data (e.g., USDC)
-- - DOUBLE PRECISION has floating-point rounding errors unsuitable for money
-- - Using BigDecimal ensures precision consistency between DB and application
-- ============================================================================

-- ============================================================================
-- 1. user_profile table - Restore NUMERIC for body metrics
-- ============================================================================
ALTER TABLE user_profile
    ALTER COLUMN weight_kg TYPE NUMERIC(6,2),
    ALTER COLUMN bmi TYPE NUMERIC(5,2),
    ALTER COLUMN body_fat_percentage TYPE NUMERIC(5,2);

COMMENT ON COLUMN user_profile.weight_kg IS 'User weight in kilograms (NUMERIC for BigDecimal precision)';
COMMENT ON COLUMN user_profile.bmi IS 'Body Mass Index (NUMERIC for BigDecimal precision)';
COMMENT ON COLUMN user_profile.body_fat_percentage IS 'Body fat percentage (NUMERIC for BigDecimal precision)';

-- ============================================================================
-- 2. meal_log table - Restore NUMERIC for nutrition tracking
-- ============================================================================
ALTER TABLE meal_log
    ALTER COLUMN protein_grams TYPE NUMERIC(6,2),
    ALTER COLUMN carbs_grams TYPE NUMERIC(6,2),
    ALTER COLUMN fat_grams TYPE NUMERIC(6,2);

COMMENT ON COLUMN meal_log.protein_grams IS 'Protein content in grams (NUMERIC for BigDecimal precision)';
COMMENT ON COLUMN meal_log.carbs_grams IS 'Carbohydrate content in grams (NUMERIC for BigDecimal precision)';
COMMENT ON COLUMN meal_log.fat_grams IS 'Fat content in grams (NUMERIC for BigDecimal precision)';

-- ============================================================================
-- 3. shopping_list table - Restore NUMERIC for cost tracking
-- ============================================================================
ALTER TABLE shopping_list
    ALTER COLUMN estimated_cost TYPE NUMERIC(10,2);

COMMENT ON COLUMN shopping_list.estimated_cost IS 'Estimated shopping cost (NUMERIC for BigDecimal precision)';

-- ============================================================================
-- 4. shopping_list_item table - Restore NUMERIC for quantities
-- ============================================================================
ALTER TABLE shopping_list_item
    ALTER COLUMN quantity TYPE NUMERIC(10,2);

COMMENT ON COLUMN shopping_list_item.quantity IS 'Ingredient quantity (NUMERIC for BigDecimal precision)';

-- ============================================================================
-- 5. food_nutrition table - Ensure NUMERIC consistency
-- ============================================================================
-- Note: V13 already created this table with NUMERIC, but we ensure consistency
ALTER TABLE food_nutrition
    ALTER COLUMN calories TYPE NUMERIC(8,2),
    ALTER COLUMN protein TYPE NUMERIC(8,2),
    ALTER COLUMN fat TYPE NUMERIC(8,2),
    ALTER COLUMN carbs TYPE NUMERIC(8,2),
    ALTER COLUMN fiber TYPE NUMERIC(8,2),
    ALTER COLUMN sodium TYPE NUMERIC(8,2);

-- ============================================================================
-- Update statistics after schema changes
-- ============================================================================
ANALYZE user_profile;
ANALYZE meal_log;
ANALYZE shopping_list;
ANALYZE shopping_list_item;
ANALYZE food_nutrition;

-- ============================================================================
-- Verification queries (for manual testing)
-- ============================================================================
-- Check column types:
-- SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_name IN ('user_profile', 'meal_log', 'shopping_list', 'shopping_list_item', 'food_nutrition')
-- AND column_name IN ('weight_kg', 'bmi', 'body_fat_percentage', 'protein_grams', 'carbs_grams', 'fat_grams',
--                     'estimated_cost', 'quantity', 'calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium')
-- ORDER BY table_name, column_name;
