-- V27: Add thumbnail_url column to exercise_videos for storing S3/CDN URLs
-- This column stores the direct URL to the workout video thumbnail image

ALTER TABLE exercise_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN exercise_videos.thumbnail_url IS 'Direct URL to the video thumbnail image in S3/CDN';
