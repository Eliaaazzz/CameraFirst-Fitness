-- Individual turns within a Coach chat session (user / model / tool messages).
CREATE TABLE IF NOT EXISTS chat_message (
    id           UUID PRIMARY KEY,
    session_id   UUID NOT NULL REFERENCES chat_session (id) ON DELETE CASCADE,
    role         VARCHAR(16) NOT NULL,           -- user | model | tool
    content      TEXT,
    tool_calls   TEXT,                           -- JSON array of tool invocations (audit/trace)
    token_count  INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Load a session's turns in chronological order.
CREATE INDEX IF NOT EXISTS idx_chat_message_session_created
    ON chat_message (session_id, created_at ASC);
