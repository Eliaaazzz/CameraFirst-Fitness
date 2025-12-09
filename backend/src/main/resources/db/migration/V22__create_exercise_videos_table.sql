CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY,
    exercise_slug TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    video_url TEXT NOT NULL,
    youtube_id TEXT NOT NULL UNIQUE,
    r2_key TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL DEFAULT 'youtube',
    is_short BOOLEAN NOT NULL DEFAULT FALSE,
    primary_category TEXT NOT NULL,
    secondary_category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (primary_category IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes')),
    CHECK (secondary_category IS NULL OR secondary_category IN ('Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_videos_slug ON exercise_videos(exercise_slug);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_primary_category ON exercise_videos(primary_category);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_secondary_category ON exercise_videos(secondary_category);
