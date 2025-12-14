-- V23: Add pgvector extension and embedding column for semantic food search
-- This migration enables vector similarity search for more accurate food matching

-- Step 1: Enable the pgvector extension (requires superuser on first install)
-- If this fails, run manually: CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add embedding column to usda_food table
-- Using 1536 dimensions for OpenAI text-embedding-3-small compatibility
-- Can also work with text-embedding-ada-002 (1536) or text-embedding-3-large (3072)
ALTER TABLE usda_food
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Step 3: Add a column to track embedding generation status
ALTER TABLE usda_food
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Add searchable text column for embedding input
-- Combines name + description + category for semantic matching
ALTER TABLE usda_food
ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Step 5: Create HNSW index for fast approximate nearest neighbor search
-- HNSW (Hierarchical Navigable Small World) provides excellent query performance
-- m = 16: number of connections per layer (higher = more accurate, more memory)
-- ef_construction = 64: size of dynamic candidate list (higher = better quality, slower build)
CREATE INDEX IF NOT EXISTS idx_usda_food_embedding_hnsw
ON usda_food
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 6: Create a partial index for foods with embeddings (optimization)
CREATE INDEX IF NOT EXISTS idx_usda_food_has_embedding
ON usda_food (id)
WHERE embedding IS NOT NULL;

-- Step 7: Create GIN index on search_text for hybrid text search fallback
CREATE INDEX IF NOT EXISTS idx_usda_food_search_text_gin
ON usda_food
USING gin(to_tsvector('english', search_text));

-- Step 8: Populate search_text for existing records
UPDATE usda_food
SET search_text = COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, '')
WHERE search_text IS NULL;

-- Step 9: Create a trigger to auto-populate search_text on insert/update
CREATE OR REPLACE FUNCTION update_usda_food_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.category, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usda_food_search_text ON usda_food;

CREATE TRIGGER trg_usda_food_search_text
BEFORE INSERT OR UPDATE OF name, description, category
ON usda_food
FOR EACH ROW
EXECUTE FUNCTION update_usda_food_search_text();

-- Step 10: Add comments for documentation
COMMENT ON COLUMN usda_food.embedding IS 'Vector embedding (1536 dims) for semantic search, generated from search_text';
COMMENT ON COLUMN usda_food.embedding_generated_at IS 'Timestamp when embedding was last generated';
COMMENT ON COLUMN usda_food.search_text IS 'Combined text (name + description + category) used for embedding generation';
COMMENT ON INDEX idx_usda_food_embedding_hnsw IS 'HNSW index for fast cosine similarity search on embeddings';
