-- Social graph: directed follow edges between users.
CREATE TABLE IF NOT EXISTS follows (
    id           UUID PRIMARY KEY,
    follower_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    followee_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_follow UNIQUE (follower_id, followee_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> followee_id)
);

-- "Who do I follow" and "who follows me" lookups.
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id, created_at DESC);
