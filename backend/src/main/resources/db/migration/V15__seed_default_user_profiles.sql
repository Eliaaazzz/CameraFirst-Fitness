-- Seed default user profiles for demo users and default-user
-- This prevents EntityNotFoundException when nutrition APIs are called

-- First, create the default-user if it doesn't exist
INSERT INTO users (id, email, time_bucket, level, diet_tilt)
VALUES
    ('00000000-0000-0000-0000-000000000001'::UUID, 'default-user@fitnessapp.com', 20, 'beginner', 'lighter')
ON CONFLICT (id) DO NOTHING;

-- Seed user profiles for all demo users and default-user
-- These profiles provide default nutritional targets to prevent 500 errors
INSERT INTO user_profile (
    user_id, 
    height_cm, 
    weight_kg, 
    daily_calorie_target, 
    daily_protein_target, 
    daily_carbs_target, 
    daily_fat_target,
    fitness_goal,
    dietary_preference
)
SELECT 
    u.id,
    170,  -- Default height in cm
    70.0, -- Default weight in kg
    2000, -- Default daily calorie target
    130,  -- Default daily protein target (grams)
    220,  -- Default daily carbs target (grams)
    70,   -- Default daily fat target (grams)
    CASE 
        WHEN u.level = 'beginner' THEN 'MAINTAIN'
        WHEN u.level = 'intermediate' THEN 'GAIN_MUSCLE'
        ELSE 'LOSE_WEIGHT'
    END,
    CASE 
        WHEN u.diet_tilt = 'lighter' THEN 'NONE'
        WHEN u.diet_tilt = 'high_protein' THEN 'NONE'
        ELSE 'NONE'
    END
FROM users u
WHERE u.email IN (
    'demo+beginner@fitnessapp.com',
    'demo+intermediate@fitnessapp.com',
    'default-user@fitnessapp.com'
)
ON CONFLICT (user_id) DO UPDATE SET
    daily_calorie_target = EXCLUDED.daily_calorie_target,
    daily_protein_target = EXCLUDED.daily_protein_target,
    daily_carbs_target = EXCLUDED.daily_carbs_target,
    daily_fat_target = EXCLUDED.daily_fat_target,
    fitness_goal = EXCLUDED.fitness_goal,
    dietary_preference = EXCLUDED.dietary_preference,
    updated_at = NOW();
