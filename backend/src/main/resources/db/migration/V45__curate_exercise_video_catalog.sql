-- V45: Remove broken placeholder workout and backfill missing muscle-group coverage.
-- Ensures BUILD_MUSCLE recommendations can return chest/shoulders/legs/back content.

DELETE FROM exercise_videos
WHERE youtube_id = 'MAT0003'
   OR LOWER(exercise_name) = 'mat core stability flow';

INSERT INTO exercise_videos (
    id,
    exercise_slug,
    exercise_name,
    video_url,
    youtube_id,
    r2_key,
    platform,
    is_short,
    primary_category,
    secondary_category,
    thumbnail_url,
    target_goal,
    created_at,
    updated_at
)
VALUES
    (gen_random_uuid(), 'chest-press', 'Chest Press', 'https://www.youtube.com/shorts/2awX3rTGa1k', '2awX3rTGa1k', 'exercise-videos/2awX3rTGa1k', 'youtube', TRUE, 'Chest', 'Arms', 'https://i.ytimg.com/vi/2awX3rTGa1k/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'dumbbell-chest-press', 'Dumbbell Chest Press', 'https://www.youtube.com/shorts/Cj96ZZlmJRU', 'Cj96ZZlmJRU', 'exercise-videos/Cj96ZZlmJRU', 'youtube', TRUE, 'Chest', 'Arms', 'https://i.ytimg.com/vi/Cj96ZZlmJRU/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'shoulder-press', 'Shoulder Press', 'https://www.youtube.com/shorts/6v4nrRVySj0', '6v4nrRVySj0', 'exercise-videos/6v4nrRVySj0', 'youtube', TRUE, 'Shoulders', 'Arms', 'https://i.ytimg.com/vi/6v4nrRVySj0/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'lateral-raise', 'Lateral Raise', 'https://www.youtube.com/shorts/U2gMn8GXr2A', 'U2gMn8GXr2A', 'exercise-videos/U2gMn8GXr2A', 'youtube', TRUE, 'Shoulders', NULL, 'https://i.ytimg.com/vi/U2gMn8GXr2A/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'leg-extension', 'Leg Extension', 'https://www.youtube.com/shorts/ZgmufzNpEPk', 'ZgmufzNpEPk', 'exercise-videos/ZgmufzNpEPk', 'youtube', TRUE, 'Legs', NULL, 'https://i.ytimg.com/vi/ZgmufzNpEPk/hqdefault.jpg', ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'linear-leg-press', 'Linear Leg Press', 'https://www.youtube.com/shorts/BnacvXdaxq8', 'BnacvXdaxq8', 'exercise-videos/BnacvXdaxq8', 'youtube', TRUE, 'Legs', 'Glutes', 'https://i.ytimg.com/vi/BnacvXdaxq8/hqdefault.jpg', ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'seated-row', 'Seated Row', 'https://www.youtube.com/shorts/DHA7QGDa2qg', 'DHA7QGDa2qg', 'exercise-videos/DHA7QGDa2qg', 'youtube', TRUE, 'Back', 'Arms', 'https://i.ytimg.com/vi/DHA7QGDa2qg/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'dual-pulley-pulldown', 'Dual Pulley Pulldown', 'https://www.youtube.com/shorts/9GEzZkSHHYI', '9GEzZkSHHYI', 'exercise-videos/9GEzZkSHHYI', 'youtube', TRUE, 'Back', 'Arms', 'https://i.ytimg.com/vi/9GEzZkSHHYI/hqdefault.jpg', ARRAY['GAIN_MUSCLE', 'STRENGTH'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (youtube_id) DO UPDATE
SET
    exercise_slug = EXCLUDED.exercise_slug,
    exercise_name = EXCLUDED.exercise_name,
    video_url = EXCLUDED.video_url,
    r2_key = EXCLUDED.r2_key,
    platform = EXCLUDED.platform,
    is_short = EXCLUDED.is_short,
    primary_category = EXCLUDED.primary_category,
    secondary_category = EXCLUDED.secondary_category,
    thumbnail_url = COALESCE(exercise_videos.thumbnail_url, EXCLUDED.thumbnail_url),
    target_goal = COALESCE(exercise_videos.target_goal, EXCLUDED.target_goal),
    updated_at = CURRENT_TIMESTAMP;

UPDATE exercise_videos
SET
    thumbnail_url = 'https://i.ytimg.com/vi/' || youtube_id || '/hqdefault.jpg',
    updated_at = CURRENT_TIMESTAMP
WHERE platform = 'youtube'
  AND youtube_id IS NOT NULL
  AND (thumbnail_url IS NULL OR BTRIM(thumbnail_url) = '');

UPDATE exercise_videos
SET
    target_goal = ARRAY['GAIN_MUSCLE', 'STRENGTH'],
    updated_at = CURRENT_TIMESTAMP
WHERE primary_category IN ('Chest', 'Back', 'Shoulders')
  AND (target_goal IS NULL OR CARDINALITY(target_goal) = 0);

UPDATE exercise_videos
SET
    target_goal = ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'STRENGTH'],
    updated_at = CURRENT_TIMESTAMP
WHERE primary_category = 'Legs'
  AND (target_goal IS NULL OR CARDINALITY(target_goal) = 0);
