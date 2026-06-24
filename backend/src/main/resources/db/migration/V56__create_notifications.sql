-- Per-user notifications (new follower, etc.).
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,  -- recipient
    type        VARCHAR(32) NOT NULL,     -- NEW_FOLLOWER, ...
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,          -- who triggered it
    message     VARCHAR(280),
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);
