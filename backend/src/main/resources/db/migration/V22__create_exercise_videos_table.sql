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

-- Seed data for test coverage
INSERT INTO exercise_videos (id, exercise_slug, exercise_name, video_url, youtube_id, r2_key, platform, is_short, primary_category, secondary_category)
VALUES
    -- Beginner exercises for dumbbell tests (need diverse body parts for test)
    (gen_random_uuid(), 'dumbbell-bicep-curl', 'Dumbbell Bicep Curl', 'https://www.youtube.com/watch?v=DBL0005', 'DBL0005', 'exercises/dumbbell-bicep-curl.mp4', 'youtube', false, 'Arms', NULL),
    (gen_random_uuid(), 'dumbbell-chest-press', 'Dumbbell Chest Press', 'https://www.youtube.com/watch?v=DBL0006', 'DBL0006', 'exercises/dumbbell-chest-press.mp4', 'youtube', false, 'Chest', NULL),
    (gen_random_uuid(), 'dumbbell-squat', 'Dumbbell Squat', 'https://www.youtube.com/watch?v=DBL0007', 'DBL0007', 'exercises/dumbbell-squat.mp4', 'youtube', false, 'Legs', NULL),
    (gen_random_uuid(), 'dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'https://www.youtube.com/watch?v=DBL0008', 'DBL0008', 'exercises/dumbbell-shoulder-press.mp4', 'youtube', false, 'Shoulders', NULL),
    -- Intermediate exercises for mat tests (need diverse body parts for test)
    (gen_random_uuid(), 'mat-plank', 'Mat Plank Hold', 'https://www.youtube.com/watch?v=MAT0009', 'MAT0009', 'exercises/mat-plank.mp4', 'youtube', false, 'Core', NULL),
    (gen_random_uuid(), 'mat-glute-bridge', 'Mat Glute Bridge', 'https://www.youtube.com/watch?v=MAT0010', 'MAT0010', 'exercises/mat-glute-bridge.mp4', 'youtube', false, 'Glutes', NULL),
    (gen_random_uuid(), 'mat-leg-raises', 'Mat Leg Raises', 'https://www.youtube.com/watch?v=MAT0011', 'MAT0011', 'exercises/mat-leg-raises.mp4', 'youtube', false, 'Core', 'Legs'),
    (gen_random_uuid(), 'mat-back-extension', 'Mat Back Extension', 'https://www.youtube.com/watch?v=MAT0012', 'MAT0012', 'exercises/mat-back-extension.mp4', 'youtube', false, 'Back', NULL)
ON CONFLICT (youtube_id) DO NOTHING;
