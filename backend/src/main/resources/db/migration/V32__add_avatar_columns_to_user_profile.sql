-- V32: Add avatar URL and file key to user profiles
-- Purpose: Store avatar image location for user profile pictures

-- Add avatar_url column to store the public URL of the avatar
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add avatar_file_key column to store the S3 object key for cleanup
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS avatar_file_key VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN user_profile.avatar_url IS 'Public URL of user avatar image (S3 or CDN)';
COMMENT ON COLUMN user_profile.avatar_file_key IS 'S3 object key for avatar cleanup (e.g., avatars/{userId}/{uuid}.jpg)';
