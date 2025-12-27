-- V30: Migrate user_saved_workout to reference exercise_videos
-- Preserve legacy saved workouts by backfilling exercise_videos when needed.

-- Backup current saved workouts for safety (one-time snapshot).
CREATE TABLE IF NOT EXISTS user_saved_workout_backup AS
SELECT * FROM user_saved_workout;

ALTER TABLE user_saved_workout
  DROP CONSTRAINT IF EXISTS user_saved_workout_workout_id_fkey;

-- Backfill missing exercise_videos rows for legacy saved workouts.
-- Use workout_video data to generate minimal required fields.
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
  created_at,
  updated_at,
  thumbnail_url
)
SELECT
  w.id,
  COALESCE(
    NULLIF(trim(BOTH '-' FROM regexp_replace(lower(w.title), '[^a-z0-9]+', '-', 'g')), ''),
    'workout-' || replace(w.id::text, '-', '')
  ) AS exercise_slug,
  w.title AS exercise_name,
  'https://www.youtube.com/watch?v=' || w.youtube_id AS video_url,
  w.youtube_id,
  'legacy/' || w.youtube_id || '.mp4' AS r2_key,
  'youtube' AS platform,
  (COALESCE(w.duration_minutes, 0) <= 2) AS is_short,
  COALESCE(NULLIF(w.body_part[1], ''), 'General') AS primary_category,
  NULLIF(w.body_part[2], '') AS secondary_category,
  w.created_at,
  NOW() AS updated_at,
  w.thumbnail_url
FROM (
  SELECT DISTINCT workout_id
  FROM user_saved_workout
) usw
JOIN workout_video w ON w.id = usw.workout_id
WHERE NOT EXISTS (
  SELECT 1
  FROM exercise_videos ev
  WHERE ev.youtube_id = w.youtube_id
     OR ev.id = w.id
);

-- Remap saved workouts to existing exercise_videos by youtube_id when IDs differ.
UPDATE user_saved_workout usw
SET workout_id = ev.id
FROM workout_video w
JOIN exercise_videos ev ON ev.youtube_id = w.youtube_id
WHERE usw.workout_id = w.id
  AND ev.id <> w.id;

ALTER TABLE user_saved_workout
  ADD CONSTRAINT user_saved_workout_workout_id_fkey
  FOREIGN KEY (workout_id) REFERENCES exercise_videos(id) ON DELETE CASCADE;
