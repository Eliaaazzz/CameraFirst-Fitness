-- ============================================================================
-- V51: Add text search indexes for exercise_videos
-- ============================================================================
-- The searchByKeyword query uses LIKE '%query%' on exercise_name,
-- exercise_slug, and primary_category. Without trigram indexes,
-- these are full table scans on every search request.
--
-- Expected improvement: 5-10x faster workout text search queries.
-- ============================================================================

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes for LIKE '%query%' pattern matching
CREATE INDEX IF NOT EXISTS idx_exercise_video_name_trgm
ON exercise_videos USING GIN (exercise_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_exercise_video_slug_trgm
ON exercise_videos USING GIN (exercise_slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_exercise_video_category_trgm
ON exercise_videos USING GIN (primary_category gin_trgm_ops);

-- B-tree index on primary_category for exact match queries (findByCategory)
CREATE INDEX IF NOT EXISTS idx_exercise_video_primary_category
ON exercise_videos (primary_category);

-- Trigram GIN index for recipe title LIKE search (searchByText)
CREATE INDEX IF NOT EXISTS idx_recipe_title_trgm
ON recipe USING GIN (title gin_trgm_ops);

-- Update statistics for query planner
ANALYZE exercise_videos;
ANALYZE recipe;
