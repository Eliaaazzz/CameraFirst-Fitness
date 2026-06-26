-- V58: Grounded nutrition knowledge base for the Coach agent's RAG anti-hallucination layer.
-- Stores curated, *citable* nutrition/health facts. Answers to health questions are grounded in
-- (and must cite) rows retrieved from this table; if nothing relevant is retrieved the agent abstains
-- instead of hallucinating. Embeddings are Gemini text-embedding-004 (768-dim) so the whole RAG path
-- stays on the same provider as generation.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS nutrition_knowledge (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source      TEXT NOT NULL,                 -- authority, e.g. 'WHO', 'USDA DRI', 'ADA'
    title       TEXT NOT NULL,                 -- short claim title
    content     TEXT NOT NULL,                 -- the factual chunk used to ground + cite answers
    url         TEXT,                          -- citation link
    tags        TEXT,                          -- optional comma-separated topics
    embedding   vector(768),                   -- Gemini text-embedding-004
    embedding_generated_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast approximate nearest-neighbour retrieval (cosine).
CREATE INDEX IF NOT EXISTS idx_nutrition_knowledge_embedding_hnsw
ON nutrition_knowledge
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Partial index so retrieval only considers rows that have been embedded.
CREATE INDEX IF NOT EXISTS idx_nutrition_knowledge_has_embedding
ON nutrition_knowledge (id)
WHERE embedding IS NOT NULL;

-- Natural-key uniqueness so re-seeding is idempotent (source + title identifies a fact).
CREATE UNIQUE INDEX IF NOT EXISTS uq_nutrition_knowledge_source_title
ON nutrition_knowledge (source, title);
