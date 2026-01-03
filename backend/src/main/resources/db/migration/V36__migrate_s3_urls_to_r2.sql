-- V36: Migrate S3 URLs to Cloudflare R2 custom domain
-- Purpose: Replace all AWS S3 URLs with R2 public domain (media.aurafitness.com)
--
-- This migration updates:
--   1. user_profile.avatar_url
--   2. recipe.image_url
--   3. exercise_videos.thumbnail_url
--
-- Old format: https://aurafitness-uploads.s3.ap-southeast-2.amazonaws.com/path/to/file.jpg
-- New format: https://media.aurafitness.com/path/to/file.jpg

-- Update user_profile avatar URLs
UPDATE user_profile
SET avatar_url = REGEXP_REPLACE(
    avatar_url,
    'https://aurafitness-uploads\.s3\.ap-southeast-2\.amazonaws\.com/',
    'https://media.aurafitness.com/'
)
WHERE avatar_url LIKE '%s3.ap-southeast-2.amazonaws.com%';

-- Update recipe image URLs
UPDATE recipe
SET image_url = REGEXP_REPLACE(
    image_url,
    'https://aurafitness-uploads\.s3\.ap-southeast-2\.amazonaws\.com/',
    'https://media.aurafitness.com/'
)
WHERE image_url LIKE '%s3.ap-southeast-2.amazonaws.com%';

-- Update exercise_videos thumbnail URLs
UPDATE exercise_videos
SET thumbnail_url = REGEXP_REPLACE(
    thumbnail_url,
    'https://aurafitness-uploads\.s3\.ap-southeast-2\.amazonaws\.com/',
    'https://media.aurafitness.com/'
)
WHERE thumbnail_url LIKE '%s3.ap-southeast-2.amazonaws.com%';
