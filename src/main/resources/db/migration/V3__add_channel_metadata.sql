ALTER TABLE workout_video
    ADD COLUMN IF NOT EXISTS channel_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS channel_title TEXT,
    ADD COLUMN IF NOT EXISTS channel_subscriber_count BIGINT;
