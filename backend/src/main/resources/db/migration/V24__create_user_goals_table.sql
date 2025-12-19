-- V24: Create user_goals table for persisting AI-generated fitness goals
-- This stores the complete GeneratedGoals data that was previously only in AsyncStorage

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal type (fat_loss, muscle_gain, diabetes_control)
    goal_type VARCHAR(32) NOT NULL,

    -- Daily calories
    daily_calories_min INTEGER NOT NULL,
    daily_calories_target INTEGER NOT NULL,
    daily_calories_max INTEGER NOT NULL,
    daily_calories_rationale TEXT,

    -- Macros (grams)
    protein_g INTEGER NOT NULL,
    carbs_g INTEGER NOT NULL,
    fat_g INTEGER NOT NULL,
    macros_notes TEXT,

    -- Other daily targets
    sugar_limit_g INTEGER NOT NULL DEFAULT 25,
    fiber_target_g INTEGER NOT NULL DEFAULT 25,

    -- Weekly activity plan
    cardio_minutes_per_week INTEGER NOT NULL DEFAULT 150,
    strength_sessions_per_week INTEGER NOT NULL DEFAULT 3,
    steps_per_day_target INTEGER NOT NULL DEFAULT 8000,
    activity_notes TEXT,

    -- Milestones checklist stored as JSONB for flexibility
    milestones_checklist JSONB,

    -- Safety note
    safety_note TEXT,

    -- Input parameters used to generate the goal (for regeneration)
    input_sex VARCHAR(20),
    input_height_cm INTEGER,
    input_weight_kg INTEGER,
    input_age INTEGER,
    input_activity_level VARCHAR(20),

    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one active goal per user
    CONSTRAINT unique_active_goal_per_user UNIQUE (user_id, is_active)
        WHERE (is_active = TRUE)
);

-- Indexes for common queries
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_goals_user_active ON user_goals(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_goals_goal_type ON user_goals(goal_type);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_goals_updated_at
    BEFORE UPDATE ON user_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_goals_updated_at();

-- Comment on table
COMMENT ON TABLE user_goals IS 'Stores AI-generated fitness goals for users, including calories, macros, activity plans, and milestones';
