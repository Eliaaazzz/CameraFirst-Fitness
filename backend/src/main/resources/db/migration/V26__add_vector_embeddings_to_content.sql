-- V26: Add pgvector embeddings to exercise_videos and recipe tables for semantic recommendation
-- This enables vector similarity search for personalized fitness content recommendations

-- Note: pgvector extension already enabled in V23

-- ============================================================================
-- EXERCISE_VIDEOS TABLE
-- ============================================================================

-- Step 1: Add embedding column (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 2: Add search_text for embedding generation
-- Combines exercise name, categories, and goals for rich semantic representation
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Step 3: Add timestamp for tracking embedding generation
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Create HNSW index for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) for normalized similarity
CREATE INDEX IF NOT EXISTS idx_exercise_videos_embedding_hnsw
ON exercise_videos
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 5: Partial index for videos with embeddings
CREATE INDEX IF NOT EXISTS idx_exercise_videos_has_embedding
ON exercise_videos (id)
WHERE embedding IS NOT NULL;

-- Step 6: Populate search_text for existing records
UPDATE exercise_videos
SET search_text = CONCAT_WS(' ',
    exercise_name,
    primary_category,
    secondary_category,
    CASE WHEN is_short THEN 'quick short workout' ELSE 'full workout exercise' END,
    ARRAY_TO_STRING(target_goal, ' ')
)
WHERE search_text IS NULL;

-- Step 7: Trigger to auto-update search_text
CREATE OR REPLACE FUNCTION update_exercise_videos_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := CONCAT_WS(' ',
        NEW.exercise_name,
        NEW.primary_category,
        NEW.secondary_category,
        CASE WHEN NEW.is_short THEN 'quick short workout' ELSE 'full workout exercise' END,
        ARRAY_TO_STRING(NEW.target_goal, ' ')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exercise_videos_search_text ON exercise_videos;

CREATE TRIGGER trg_exercise_videos_search_text
BEFORE INSERT OR UPDATE OF exercise_name, primary_category, secondary_category, is_short, target_goal
ON exercise_videos
FOR EACH ROW
EXECUTE FUNCTION update_exercise_videos_search_text();

-- ============================================================================
-- RECIPE TABLE
-- ============================================================================

-- Step 1: Add embedding column
ALTER TABLE recipe
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 2: Add search_text for embedding generation
-- Combines title, difficulty, nutritional highlights, and goals
ALTER TABLE recipe
ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Step 3: Add timestamp for tracking embedding generation
ALTER TABLE recipe
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Create HNSW index
CREATE INDEX IF NOT EXISTS idx_recipe_embedding_hnsw
ON recipe
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 5: Partial index for recipes with embeddings
CREATE INDEX IF NOT EXISTS idx_recipe_has_embedding
ON recipe (id)
WHERE embedding IS NOT NULL;

-- Step 6: Populate search_text for existing records
-- Include nutritional characteristics for better semantic matching
UPDATE recipe
SET search_text = CONCAT_WS(' ',
    title,
    difficulty,
    CASE
        WHEN (nutrition_summary->>'protein')::numeric >= 30 THEN 'high protein muscle building'
        WHEN (nutrition_summary->>'protein')::numeric >= 20 THEN 'good protein'
        ELSE ''
    END,
    CASE
        WHEN (nutrition_summary->>'calories')::numeric < 300 THEN 'low calorie diet weight loss'
        WHEN (nutrition_summary->>'calories')::numeric < 500 THEN 'moderate calorie'
        ELSE 'high calorie bulking'
    END,
    CASE
        WHEN (nutrition_summary->>'carbs')::numeric < 20 THEN 'low carb keto'
        ELSE ''
    END,
    ARRAY_TO_STRING(target_goal, ' ')
)
WHERE search_text IS NULL;

-- Step 7: Trigger to auto-update search_text
CREATE OR REPLACE FUNCTION update_recipe_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := CONCAT_WS(' ',
        NEW.title,
        NEW.difficulty,
        CASE
            WHEN (NEW.nutrition_summary->>'protein')::numeric >= 30 THEN 'high protein muscle building'
            WHEN (NEW.nutrition_summary->>'protein')::numeric >= 20 THEN 'good protein'
            ELSE ''
        END,
        CASE
            WHEN (NEW.nutrition_summary->>'calories')::numeric < 300 THEN 'low calorie diet weight loss'
            WHEN (NEW.nutrition_summary->>'calories')::numeric < 500 THEN 'moderate calorie'
            ELSE 'high calorie bulking'
        END,
        CASE
            WHEN (NEW.nutrition_summary->>'carbs')::numeric < 20 THEN 'low carb keto'
            ELSE ''
        END,
        ARRAY_TO_STRING(NEW.target_goal, ' ')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recipe_search_text ON recipe;

CREATE TRIGGER trg_recipe_search_text
BEFORE INSERT OR UPDATE OF title, difficulty, nutrition_summary, target_goal
ON recipe
FOR EACH ROW
EXECUTE FUNCTION update_recipe_search_text();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN exercise_videos.embedding IS 'Vector embedding (1536 dims) for semantic search, generated from search_text using OpenAI';
COMMENT ON COLUMN exercise_videos.search_text IS 'Combined text for embedding generation: exercise name, categories, duration type, goals';
COMMENT ON COLUMN exercise_videos.embedding_generated_at IS 'Timestamp when embedding was last generated';

COMMENT ON COLUMN recipe.embedding IS 'Vector embedding (1536 dims) for semantic search, generated from search_text using OpenAI';
COMMENT ON COLUMN recipe.search_text IS 'Combined text for embedding generation: title, difficulty, nutritional characteristics, goals';
COMMENT ON COLUMN recipe.embedding_generated_at IS 'Timestamp when embedding was last generated';
