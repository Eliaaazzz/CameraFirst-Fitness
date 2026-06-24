-- Conversational memory for the AI Coach agent: one row per chat session.
CREATE TABLE IF NOT EXISTS chat_session (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    title       VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most-recent-sessions-for-a-user lookup.
CREATE INDEX IF NOT EXISTS idx_chat_session_user_updated
    ON chat_session (user_id, updated_at DESC);
