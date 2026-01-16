-- V41: Backfill missing thumbnail URLs for exercise videos
-- This fixes videos inserted in V39 and any future videos without thumbnails

-- Backfill thumbnail_url using YouTube default thumbnail
-- Applies to all videos with platform='youtube' that have a youtube_id but no thumbnail
UPDATE exercise_videos
SET thumbnail_url = 'https://i.ytimg.com/vi/' || youtube_id || '/hqdefault.jpg',
    updated_at = CURRENT_TIMESTAMP
WHERE thumbnail_url IS NULL
  AND platform = 'youtube'
  AND youtube_id IS NOT NULL;
