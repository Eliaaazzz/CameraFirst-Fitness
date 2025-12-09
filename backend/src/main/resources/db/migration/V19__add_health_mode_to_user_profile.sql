-- Add health_mode to user_profile for diabetes/prevention tracking
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS health_mode VARCHAR(20) DEFAULT 'PREVENTION';

COMMENT ON COLUMN user_profile.health_mode IS 'Health tracking mode: DIABETES (net carbs), PREVENTION (sugar cubes)';
