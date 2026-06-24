-- Privacy: whether a user's activity (meals, streaks) is shared to followers' feeds and
-- whether they can be surfaced by the "friends eating similar" tool. Default opt-in.
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS share_activity BOOLEAN NOT NULL DEFAULT true;
