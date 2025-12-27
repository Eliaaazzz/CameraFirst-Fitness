-- Add target_goal column to workout_video, exercise_videos, and recipe tables for goal-based recommendations
-- This enables filtering content based on user fitness goals (LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN, STRENGTH)

-- Add target_goal to workout_video table
ALTER TABLE workout_video ADD COLUMN IF NOT EXISTS target_goal TEXT[];

-- Add target_goal to exercise_videos table (the main workout table used in the app)
ALTER TABLE exercise_videos ADD COLUMN IF NOT EXISTS target_goal TEXT[];

-- Add target_goal to recipe table
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS target_goal TEXT[];

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_workout_target_goal ON workout_video USING GIN (target_goal);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_target_goal ON exercise_videos USING GIN (target_goal);
CREATE INDEX IF NOT EXISTS idx_recipe_target_goal ON recipe USING GIN (target_goal);

-- Update existing workout videos with appropriate target goals based on their characteristics
-- High intensity, cardio workouts -> good for fat loss
UPDATE workout_video
SET target_goal = ARRAY['LOSE_WEIGHT', 'MAINTAIN']
WHERE 'cardio' = ANY(body_part) OR 'full_body' = ANY(body_part)
AND target_goal IS NULL;

-- Strength-focused workouts -> good for muscle gain and strength
UPDATE workout_video
SET target_goal = ARRAY['GAIN_MUSCLE', 'STRENGTH']
WHERE ('upper' = ANY(body_part) OR 'lower' = ANY(body_part) OR level = 'advanced')
AND ('dumbbells' = ANY(equipment) OR 'barbell' = ANY(equipment) OR 'resistance_bands' = ANY(equipment))
AND target_goal IS NULL;

-- Beginner full body -> good for maintenance
UPDATE workout_video
SET target_goal = ARRAY['MAINTAIN', 'LOSE_WEIGHT']
WHERE level = 'beginner' AND 'bodyweight' = ANY(equipment)
AND target_goal IS NULL;

-- Default: all goals if not already set
UPDATE workout_video
SET target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH']
WHERE target_goal IS NULL;

-- Update exercise_videos based on body part categories
-- Arms, Chest, Back, Shoulders -> good for muscle gain and strength
UPDATE exercise_videos
SET target_goal = ARRAY['GAIN_MUSCLE', 'STRENGTH']
WHERE primary_category IN ('Arms', 'Chest', 'Back', 'Shoulders')
AND target_goal IS NULL;

-- Legs, Glutes -> good for all goals (compound movements)
UPDATE exercise_videos
SET target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH']
WHERE primary_category IN ('Legs', 'Glutes')
AND target_goal IS NULL;

-- Core -> good for all goals
UPDATE exercise_videos
SET target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH']
WHERE primary_category = 'Core'
AND target_goal IS NULL;

-- Default for any remaining exercise_videos
UPDATE exercise_videos
SET target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH']
WHERE target_goal IS NULL;

-- Update existing recipes based on their nutrition profile
-- High protein recipes -> good for muscle gain and strength
UPDATE recipe
SET target_goal = ARRAY['GAIN_MUSCLE', 'STRENGTH']
WHERE nutrition_summary IS NOT NULL
AND (nutrition_summary->>'protein_g')::numeric >= 30
AND target_goal IS NULL;

-- Also check for 'protein' key (some recipes use different key names)
UPDATE recipe
SET target_goal = ARRAY['GAIN_MUSCLE', 'STRENGTH']
WHERE nutrition_summary IS NOT NULL
AND (nutrition_summary->>'protein')::numeric >= 30
AND target_goal IS NULL;

-- Low calorie recipes -> good for weight loss
UPDATE recipe
SET target_goal = ARRAY['LOSE_WEIGHT', 'MAINTAIN']
WHERE nutrition_summary IS NOT NULL
AND (nutrition_summary->>'calories')::numeric < 400
AND target_goal IS NULL;

-- Default: all goals if not already set
UPDATE recipe
SET target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH']
WHERE target_goal IS NULL;
