-- Add password_hash column to users table for local (email/password) authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update auth_provider column comment to reflect LOCAL provider
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: LOCAL, GOOGLE, APPLE';
