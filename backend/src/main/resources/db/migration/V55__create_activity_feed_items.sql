-- Fan-out-on-write activity feed: one row per (follower, activity). owner_id is the feed owner.
CREATE TABLE IF NOT EXISTS activity_feed_items (
    id           UUID PRIMARY KEY,
    owner_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- feed owner (a follower of the actor)
    actor_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- who performed the activity
    verb         VARCHAR(32) NOT NULL,    -- LOGGED_MEAL, HIT_STREAK, ...
    object_type  VARCHAR(32),
    object_id    VARCHAR(64),
    summary      VARCHAR(280),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keyset pagination of a user's feed, newest first.
CREATE INDEX IF NOT EXISTS idx_feed_owner_created ON activity_feed_items (owner_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_feed_actor ON activity_feed_items (actor_id);
