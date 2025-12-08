-- Create exercise_videos table to support ExerciseVideo entity
CREATE TABLE IF NOT EXISTS exercise_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_slug VARCHAR(255) NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    video_url TEXT NOT NULL,
    youtube_id VARCHAR(20) NOT NULL UNIQUE,
    r2_key VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(50) NOT NULL DEFAULT 'youtube',
    is_short BOOLEAN NOT NULL DEFAULT FALSE,
    primary_category VARCHAR(100) NOT NULL,
    secondary_category VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_videos_slug ON exercise_videos(exercise_slug);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_primary_category ON exercise_videos(primary_category);
CREATE INDEX IF NOT EXISTS idx_exercise_videos_youtube_id ON exercise_videos(youtube_id);
