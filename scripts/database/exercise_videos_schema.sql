-- ============================================================
-- AuraFitness Exercise Videos Schema
-- File: infrastructure/sql/exercise_videos_schema.sql
-- ============================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create exercise_videos table
CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_slug TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    video_url TEXT NOT NULL,
    youtube_id TEXT NOT NULL UNIQUE,
    r2_key TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'youtube',
    is_short BOOLEAN NOT NULL DEFAULT FALSE,
    primary_category TEXT NOT NULL,      -- Chest / Back / Legs / Shoulders / Arms / Core / Glutes
    secondary_category TEXT,             -- optional, same set as above
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exercise_videos_slug ON exercise_videos(exercise_slug);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_primary_category ON exercise_videos(primary_category);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_secondary_category ON exercise_videos(secondary_category);

-- Add constraint for valid categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_primary_category'
    ) THEN
        ALTER TABLE exercise_videos
        ADD CONSTRAINT chk_primary_category
        CHECK (primary_category IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_secondary_category'
    ) THEN
        ALTER TABLE exercise_videos
        ADD CONSTRAINT chk_secondary_category
        CHECK (secondary_category IS NULL OR secondary_category IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes'));
    END IF;
END $$;

-- ============================================================
-- Upsert Statement Template (for reference)
-- ============================================================
-- INSERT INTO exercise_videos (
--   exercise_slug,
--   exercise_name,
--   video_url,
--   youtube_id,
--   r2_key,
--   platform,
--   is_short,
--   primary_category,
--   secondary_category
-- ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
-- ON CONFLICT (youtube_id) DO UPDATE SET
--   exercise_slug       = EXCLUDED.exercise_slug,
--   exercise_name       = EXCLUDED.exercise_name,
--   video_url           = EXCLUDED.video_url,
--   r2_key              = EXCLUDED.r2_key,
--   platform            = EXCLUDED.platform,
--   is_short            = EXCLUDED.is_short,
--   primary_category    = EXCLUDED.primary_category,
--   secondary_category  = EXCLUDED.secondary_category,
--   updated_at          = NOW();
