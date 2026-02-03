-- =============================================================================
-- V43: Create weight_log table for tracking user weight over time
-- =============================================================================

CREATE TABLE IF NOT EXISTS weight_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight_kg       NUMERIC(6, 2) NOT NULL,
    log_date        DATE NOT NULL,
    body_fat_percentage NUMERIC(5, 2),
    muscle_mass_kg  NUMERIC(6, 2),
    note            VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure only one weight entry per user per day
    CONSTRAINT uk_weight_log_user_date UNIQUE (user_id, log_date)
);

-- Index for efficient queries by user and date range
CREATE INDEX IF NOT EXISTS idx_weight_log_user_date
    ON weight_log (user_id, log_date DESC);

-- Comment for documentation
COMMENT ON TABLE weight_log IS 'Time-series data for tracking user weight, body fat, and muscle mass over time';
COMMENT ON COLUMN weight_log.weight_kg IS 'User weight in kilograms';
COMMENT ON COLUMN weight_log.body_fat_percentage IS 'Optional body fat percentage';
COMMENT ON COLUMN weight_log.muscle_mass_kg IS 'Optional muscle mass in kilograms';
COMMENT ON COLUMN weight_log.note IS 'Optional note for the entry (e.g., "after cheat day")';
