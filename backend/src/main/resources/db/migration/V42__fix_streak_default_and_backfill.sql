-- V42: Fix streak default value and backfill existing users
-- The original V40 set DEFAULT 0, but streak should start at 1

-- Update default for new users
ALTER TABLE users ALTER COLUMN current_streak SET DEFAULT 1;

-- Backfill existing users who have streak = 0 to streak = 1
-- (streak of 0 is invalid - minimum is 1 for "today")
UPDATE users
SET current_streak = 1
WHERE current_streak = 0;
