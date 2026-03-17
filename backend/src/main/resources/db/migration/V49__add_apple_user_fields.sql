-- Add Apple Sign In fields for credential state tracking and refresh token support
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_refresh_token TEXT;

-- Index on apple_user_id for server-to-server notification lookups by Apple's `sub` claim
CREATE INDEX IF NOT EXISTS idx_users_apple_user_id ON users(apple_user_id) WHERE apple_user_id IS NOT NULL;
