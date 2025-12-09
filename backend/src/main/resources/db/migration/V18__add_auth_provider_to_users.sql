-- Add auth_provider column to users table for OAuth support
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'API_KEY';

-- Add index for faster lookups by provider
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Comment for documentation
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: API_KEY, GOOGLE, APPLE';
