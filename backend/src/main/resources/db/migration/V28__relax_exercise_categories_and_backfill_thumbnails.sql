-- V28: Relax exercise_videos category constraints and backfill thumbnails
-- Goal: allow real-world categories beyond the original narrow set and ensure
--       every exercise has a thumbnail URL (at least a YouTube fallback).

-- 1) Drop overly strict category CHECK constraints (names are auto-generated)
ALTER TABLE exercise_videos DROP CONSTRAINT IF EXISTS exercise_videos_primary_category_check;
ALTER TABLE exercise_videos DROP CONSTRAINT IF EXISTS exercise_videos_secondary_category_check;

-- 2) Add a more permissive CHECK that still prevents empty strings
--    Allowed set (case-insensitive):
--      chest, back, legs, shoulders, arms, core, glutes,
--      full_body/full body, cardio, upper, lower
ALTER TABLE exercise_videos
    ADD CONSTRAINT exercise_videos_primary_category_check
    CHECK (
        primary_category IS NOT NULL
        AND length(trim(primary_category)) > 0
        AND lower(primary_category) = ANY (
            ARRAY['chest','back','legs','shoulders','arms','core','glutes',
                  'full_body','full body','cardio','upper','lower']
        )
    );

ALTER TABLE exercise_videos
    ADD CONSTRAINT exercise_videos_secondary_category_check
    CHECK (
        secondary_category IS NULL
        OR (
            length(trim(secondary_category)) > 0
            AND lower(secondary_category) = ANY (
                ARRAY['chest','back','legs','shoulders','arms','core','glutes',
                      'full_body','full body','cardio','upper','lower']
            )
        )
    );

-- 3) Backfill thumbnail_url when missing, using YouTube default thumbnail
--    Applies only when platform='youtube' and youtube_id is present.
UPDATE exercise_videos
SET thumbnail_url = 'https://img.youtube.com/vi/' || youtube_id || '/hqdefault.jpg'
WHERE thumbnail_url IS NULL
  AND platform = 'youtube'
  AND youtube_id IS NOT NULL;
