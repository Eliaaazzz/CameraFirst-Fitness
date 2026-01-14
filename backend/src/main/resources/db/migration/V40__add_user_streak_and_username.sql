-- V40: Add username, streak tracking fields to users table
-- Supports Day Streak feature on dashboard

-- Add username column (nullable, user can set display name)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Add streak tracking columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Backfill username from email (extract part before @)
UPDATE users
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Add index for potential leaderboard queries by streak
CREATE INDEX IF NOT EXISTS idx_users_current_streak ON users(current_streak DESC);
