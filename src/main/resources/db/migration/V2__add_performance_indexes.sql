-- V2: Add performance indexes for photo-based recommendations
-- Author: Assistant
-- Date: 2025-10-14

-- ==============================================================
-- Workout Video Indexes (for filtering)
-- ==============================================================

-- Filter by fitness level (beginner/intermediate/advanced)
CREATE INDEX idx_workout_level ON workout_video(level);

-- Filter by available time (15/20/30/45 minutes)
CREATE INDEX idx_workout_duration ON workout_video(duration_minutes);

-- ==============================================================
-- Recipe Indexes (for filtering)
-- ==============================================================

-- Filter by cooking difficulty (easy/medium/hard)
CREATE INDEX idx_recipe_difficulty ON recipe(difficulty);

-- Filter by cooking time
CREATE INDEX idx_recipe_time ON recipe(time_minutes);

-- ==============================================================
-- Ingredient Indexes (CRITICAL for photo matching)
-- ==============================================================

-- Fuzzy matching for photo-detected ingredient names
-- Enables similarity queries: WHERE name % 'tomato'
CREATE INDEX idx_ingredient_name_trgm ON ingredient USING GIN (name gin_trgm_ops);

-- ==============================================================
-- Recipe-Ingredient Indexes (CRITICAL for reverse lookups)
-- ==============================================================

-- Reverse lookup: ingredient -> recipes
-- Essential for "show me recipes with tomatoes"
CREATE INDEX idx_recipe_ingredient_ingredient ON recipe_ingredient(ingredient_id);

-- ==============================================================
-- Image Query Indexes (for analytics and history)
-- ==============================================================

-- Filter by query type (recipe vs workout)
CREATE INDEX idx_image_query_type ON image_query(type);

-- Paginate user query history chronologically
CREATE INDEX idx_image_query_created ON image_query(created_at DESC);

-- Search detected hints from image recognition
-- Enables JSONB containment: WHERE detected_hints @> '["tomato"]'
CREATE INDEX idx_image_query_hints ON image_query USING GIN (detected_hints);

-- ==============================================================
-- Retrieval Result Indexes (for item analytics)
-- ==============================================================

-- Reverse analytics: "Which queries recommended this recipe?"
-- Essential for A/B testing and content performance analysis
CREATE INDEX idx_retrieval_result_item ON retrieval_result(item_type, item_id);

-- ==============================================================
-- Feedback Indexes (for ratings and analytics)
-- ==============================================================

-- Calculate average ratings per item
CREATE INDEX idx_feedback_item ON feedback(item_type, item_id);

-- User feedback history
CREATE INDEX idx_feedback_user ON feedback(user_id);

-- Find highly-rated or low-rated content
CREATE INDEX idx_feedback_rating ON feedback(rating);
