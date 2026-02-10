-- ============================================================================
-- V44: Drop Unused Tables
-- ============================================================================
-- This migration removes tables that are no longer used in the application:
-- - USDA food tables (replaced by Gemini AI food recognition)
-- - Shopping list tables (feature not implemented)
-- - Pose analysis tables (feature deprecated)
-- - Workout video tables (replaced by exercise_videos)
-- - Feedback table (not used)
-- - Food synonym table (replaced by Gemini AI)
-- ============================================================================

-- ============================================================================
-- 1. Drop USDA food tables
-- ============================================================================
-- Drop indexes first
DROP INDEX IF EXISTS idx_usda_food_name;
DROP INDEX IF EXISTS idx_usda_food_category;
DROP INDEX IF EXISTS idx_usda_food_state;
DROP INDEX IF EXISTS idx_usda_food_alias_alias;
DROP INDEX IF EXISTS idx_usda_food_name_trgm;
DROP INDEX IF EXISTS idx_usda_food_alias_trgm;

-- Drop tables (order matters due to foreign key constraints)
DROP TABLE IF EXISTS usda_food_alias CASCADE;
DROP TABLE IF EXISTS usda_food_nutrition CASCADE;
DROP TABLE IF EXISTS usda_food CASCADE;

-- ============================================================================
-- 2. Drop Shopping List tables
-- ============================================================================
-- Drop triggers first
DROP TRIGGER IF EXISTS update_shopping_list_updated_at ON shopping_list;
DROP TRIGGER IF EXISTS update_shopping_list_completion ON shopping_list_item;

-- Drop functions
DROP FUNCTION IF EXISTS get_shopping_list_summary(UUID);
DROP FUNCTION IF EXISTS get_items_by_category(UUID);
DROP FUNCTION IF EXISTS check_shopping_list_completion();
-- Note: update_updated_at_column() may be used by other tables, keep it

-- Drop indexes
DROP INDEX IF EXISTS idx_shopping_list_user;
DROP INDEX IF EXISTS idx_shopping_list_created;
DROP INDEX IF EXISTS idx_shopping_list_item_list;
DROP INDEX IF EXISTS idx_shopping_list_item_category;

-- Drop tables
DROP TABLE IF EXISTS shopping_list_item CASCADE;
DROP TABLE IF EXISTS shopping_list CASCADE;

-- ============================================================================
-- 3. Drop Pose Analysis tables
-- ============================================================================
-- Drop indexes
DROP INDEX IF EXISTS idx_workout_session_user_id;
DROP INDEX IF EXISTS idx_workout_session_user_exercise;
DROP INDEX IF EXISTS idx_workout_session_started_at;
DROP INDEX IF EXISTS idx_workout_session_status;
DROP INDEX IF EXISTS idx_pose_analysis_session_id;
DROP INDEX IF EXISTS idx_pose_analysis_timestamp;

-- Drop tables
DROP TABLE IF EXISTS pose_analysis_result CASCADE;
DROP TABLE IF EXISTS workout_session CASCADE;

-- ============================================================================
-- 4. Drop Workout Video tables (replaced by exercise_videos)
-- ============================================================================
-- Drop indexes
DROP INDEX IF EXISTS idx_workout_equipment;
DROP INDEX IF EXISTS idx_workout_body_part;
DROP INDEX IF EXISTS idx_workout_title_trgm;
DROP INDEX IF EXISTS idx_workout_level;
DROP INDEX IF EXISTS idx_workout_duration;

-- Drop workout_video table
DROP TABLE IF EXISTS workout_video CASCADE;

-- ============================================================================
-- 5. Drop Feedback table
-- ============================================================================
-- Drop indexes
DROP INDEX IF EXISTS idx_feedback_item;
DROP INDEX IF EXISTS idx_feedback_user;
DROP INDEX IF EXISTS idx_feedback_rating;

-- Drop table
DROP TABLE IF EXISTS feedback CASCADE;

-- ============================================================================
-- 6. Drop Food Synonym table
-- ============================================================================
-- Drop indexes
DROP INDEX IF EXISTS idx_food_synonym_synonym;
DROP INDEX IF EXISTS idx_food_synonym_canonical;
DROP INDEX IF EXISTS idx_food_synonym_trgm;

-- Drop table
DROP TABLE IF EXISTS food_synonym CASCADE;

-- ============================================================================
-- Summary of dropped tables:
-- - usda_food, usda_food_nutrition, usda_food_alias
-- - shopping_list, shopping_list_item
-- - workout_session, pose_analysis_result
-- - workout_video
-- - feedback
-- - food_synonym
-- ============================================================================
