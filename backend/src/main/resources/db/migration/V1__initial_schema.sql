CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    time_bucket INT NOT NULL DEFAULT 20,
    level VARCHAR(20) NOT NULL DEFAULT 'beginner',
    diet_tilt VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_video (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    level VARCHAR(20) NOT NULL,
    equipment TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    body_part TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    thumbnail_url TEXT,
    view_count BIGINT NOT NULL DEFAULT 0,
    last_validated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT,
    time_minutes INT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    nutrition_summary JSONB,
    steps JSONB NOT NULL DEFAULT '[]'::JSONB,
    swaps JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ingredient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE recipe_ingredient (
    recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredient(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2),
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE image_query (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    detected_hints JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE retrieval_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES image_query(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    rank INT NOT NULL,
    score NUMERIC(6,3),
    latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_retrieval_result_rank UNIQUE (query_id, rank)
);

CREATE TABLE user_saved_workout (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_id UUID NOT NULL REFERENCES workout_video(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, workout_id)
);

CREATE TABLE user_saved_recipe (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    item_type VARCHAR(20) NOT NULL,
    item_id UUID NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
-- Workout video indexes (for filtering and search)
CREATE INDEX idx_workout_equipment ON workout_video USING GIN (equipment);
CREATE INDEX idx_workout_body_part ON workout_video USING GIN (body_part);
CREATE INDEX idx_workout_title_trgm ON workout_video USING GIN (title gin_trgm_ops);
CREATE INDEX idx_workout_level ON workout_video(level);
CREATE INDEX idx_workout_duration ON workout_video(duration_minutes);

-- Recipe indexes (for filtering and search)
CREATE INDEX idx_recipe_steps_gin ON recipe USING GIN (steps);
CREATE INDEX idx_recipe_title_trgm ON recipe USING GIN (title gin_trgm_ops);
CREATE INDEX idx_recipe_difficulty ON recipe(difficulty);
CREATE INDEX idx_recipe_time ON recipe(time_minutes);

-- Ingredient indexes (for fuzzy matching photo detections)
CREATE INDEX idx_ingredient_name_trgm ON ingredient USING GIN (name gin_trgm_ops);

-- Recipe-ingredient indexes (for reverse lookups: ingredient -> recipes)
CREATE INDEX idx_recipe_ingredient_ingredient ON recipe_ingredient(ingredient_id);

-- Image query indexes (for user history and hint searches)
CREATE INDEX idx_image_query_user ON image_query(user_id);
CREATE INDEX idx_image_query_type ON image_query(type);
CREATE INDEX idx_image_query_created ON image_query(created_at DESC);
CREATE INDEX idx_image_query_hints ON image_query USING GIN (detected_hints);

-- Retrieval result indexes (for query result lookups)
CREATE INDEX idx_retrieval_result_query ON retrieval_result(query_id);
CREATE INDEX idx_retrieval_result_item ON retrieval_result(item_type, item_id);

-- Feedback indexes (for analytics)
CREATE INDEX idx_feedback_item ON feedback(item_type, item_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);

-- Sample data
INSERT INTO users (email, time_bucket, level, diet_tilt)
VALUES
    ('demo+beginner@fitnessapp.com', 20, 'beginner', 'lighter'),
    ('demo+intermediate@fitnessapp.com', 30, 'intermediate', 'high_protein');

INSERT INTO workout_video (youtube_id, title, duration_minutes, level, equipment, body_part, thumbnail_url, view_count)
VALUES
    ('dQw4w9WgXcQ', 'Full Body Energizer', 15, 'beginner', ARRAY['bodyweight'], ARRAY['full_body'], 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 1234567),
    ('HIIT0001', '15-Minute Tabata Blaze', 15, 'intermediate', ARRAY['bodyweight'], ARRAY['cardio','full_body'], 'https://img.youtube.com/vi/HIIT0001/hqdefault.jpg', 245000),
    ('DBL0002', 'Dumbbell Strength Circuit', 30, 'intermediate', ARRAY['dumbbells'], ARRAY['upper','core'], 'https://img.youtube.com/vi/DBL0002/hqdefault.jpg', 91000),
    ('MAT0003', 'Mat Core Stability Flow', 20, 'beginner', ARRAY['mat'], ARRAY['core'], 'https://img.youtube.com/vi/MAT0003/hqdefault.jpg', 45500),
    ('ADV0004', 'Advanced Power Builder', 45, 'advanced', ARRAY['barbell','resistance_bands'], ARRAY['lower','full_body'], 'https://img.youtube.com/vi/ADV0004/hqdefault.jpg', 7800),
    -- Additional beginner dumbbell workouts for test coverage
    ('DBL0005', 'Beginner Dumbbell Arms', 20, 'beginner', ARRAY['dumbbells'], ARRAY['upper','arms'], 'https://img.youtube.com/vi/DBL0005/hqdefault.jpg', 50000),
    ('DBL0006', 'Dumbbell Full Body Flow', 22, 'beginner', ARRAY['dumbbells'], ARRAY['full_body','legs'], 'https://img.youtube.com/vi/DBL0006/hqdefault.jpg', 48000),
    ('DBL0007', 'Light Dumbbell Cardio', 18, 'beginner', ARRAY['dumbbells'], ARRAY['cardio','core'], 'https://img.youtube.com/vi/DBL0007/hqdefault.jpg', 42000),
    ('DBL0008', 'Beginner Dumbbell Core', 15, 'beginner', ARRAY['dumbbells'], ARRAY['core','abs'], 'https://img.youtube.com/vi/DBL0008/hqdefault.jpg', 39000),
    -- Additional intermediate mat workouts for test coverage
    ('MAT0009', 'Intermediate Mat Pilates', 30, 'intermediate', ARRAY['mat'], ARRAY['core','full_body'], 'https://img.youtube.com/vi/MAT0009/hqdefault.jpg', 62000),
    ('MAT0010', 'Mat Core Power', 28, 'intermediate', ARRAY['mat'], ARRAY['core','abs'], 'https://img.youtube.com/vi/MAT0010/hqdefault.jpg', 55000),
    ('MAT0011', 'Advanced Mat Flows', 32, 'intermediate', ARRAY['mat'], ARRAY['core','flexibility'], 'https://img.youtube.com/vi/MAT0011/hqdefault.jpg', 47000),
    ('MAT0012', 'Intermediate Yoga Mat', 25, 'intermediate', ARRAY['mat'], ARRAY['full_body','core'], 'https://img.youtube.com/vi/MAT0012/hqdefault.jpg', 51000);

INSERT INTO recipe (title, image_url, time_minutes, difficulty, nutrition_summary, steps, swaps)
VALUES
    ('Lemon Garlic Chicken Bowls', 'https://example.com/images/lemon-garlic-chicken.jpg', 25, 'easy', '{"calories": 380, "protein_g": 32, "primaryIngredient": "chicken"}',
     '[{"step":1,"instruction":"Season chicken and sear"},{"step":2,"instruction":"Simmer with lemon garlic sauce"}]',
     '[{"swap":"Use cauliflower rice for lighter option"}]'),
    ('High-Protein Veggie Omelette', 'https://example.com/images/veggie-omelette.jpg', 15, 'easy', '{"calories": 290, "protein_g": 28}',
     '[{"step":1,"instruction":"Saute vegetables"},{"step":2,"instruction":"Pour eggs and cook"}]',
     '[{"swap":"Add feta for more flavor"}]'),
    ('Beef and Quinoa Power Bowl', 'https://example.com/images/beef-quinoa.jpg', 30, 'medium', '{"calories": 450, "protein_g": 35}',
     '[{"step":1,"instruction":"Brown beef"},{"step":2,"instruction":"Simmer with spices"},{"step":3,"instruction":"Serve over quinoa"}]',
     '[{"swap":"Replace beef with turkey"}]'),
    ('Quick Shrimp Stir Fry', 'https://example.com/images/shrimp-stirfry.jpg', 20, 'easy', '{"calories": 320, "protein_g": 27}',
     '[{"step":1,"instruction":"Stir fry vegetables"},{"step":2,"instruction":"Add shrimp and sauce"}]',
     '[{"swap":"Use tofu for vegetarian option"}]'),
    ('Hearty Lentil Soup', 'https://example.com/images/lentil-soup.jpg', 40, 'medium', '{"calories": 310, "protein_g": 22}',
     '[{"step":1,"instruction":"Saute aromatics"},{"step":2,"instruction":"Simmer lentils"},{"step":3,"instruction":"Finish with greens"}]',
     '[{"swap":"Blend half the soup for creamier texture"}]'),
    -- Additional chicken recipes for test coverage
    ('Honey Mustard Chicken', 'https://example.com/images/honey-mustard-chicken.jpg', 35, 'easy', '{"calories": 420, "protein_g": 38, "primaryIngredient": "chicken"}',
     '[{"step":1,"instruction":"Mix honey mustard glaze"},{"step":2,"instruction":"Bake chicken until golden"}]',
     '[{"swap":"Use Greek yogurt instead of mayo"}]'),
    ('Spicy Chicken Tacos', 'https://example.com/images/chicken-tacos.jpg', 30, 'easy', '{"calories": 390, "protein_g": 35, "primaryIngredient": "chicken"}',
     '[{"step":1,"instruction":"Season and cook chicken"},{"step":2,"instruction":"Assemble tacos with toppings"}]',
     '[{"swap":"Use lettuce wraps for low-carb option"}]'),
    -- Additional quick and easy recipes for test coverage
    ('Avocado Toast Deluxe', 'https://example.com/images/avocado-toast.jpg', 10, 'easy', '{"calories": 280, "protein_g": 12}',
     '[{"step":1,"instruction":"Toast bread"},{"step":2,"instruction":"Mash avocado and spread"},{"step":3,"instruction":"Top with egg"}]',
     '[{"swap":"Add smoked salmon for extra protein"}]'),
    ('Greek Yogurt Parfait', 'https://example.com/images/yogurt-parfait.jpg', 8, 'easy', '{"calories": 250, "protein_g": 18}',
     '[{"step":1,"instruction":"Layer yogurt"},{"step":2,"instruction":"Add fruits and granola"}]',
     '[{"swap":"Use honey instead of maple syrup"}]');

INSERT INTO ingredient (name)
VALUES
    ('chicken breast'),
    ('chicken'),  -- Generic "chicken" needed for recipe search - queries use exact ingredient name match
    ('lemon'),
    ('quinoa'),
    ('shrimp'),
    ('lentils'),
    ('spinach'),
    ('honey'),
    ('mustard'),
    ('avocado'),
    ('yogurt')
ON CONFLICT (name) DO NOTHING;

WITH ingredient_map(recipe_title, ingredient_name, quantity, unit) AS (
    VALUES
        ('Lemon Garlic Chicken Bowls', 'chicken breast', 2.00, 'lb'),
        -- Adding 'chicken' as ingredient for search compatibility: RecipeRepository.findByIngredientsContainingAny uses exact match
        -- so searches for "chicken" won't find "chicken breast" without this mapping
        ('Lemon Garlic Chicken Bowls', 'chicken', 2.00, 'lb'),
        ('Lemon Garlic Chicken Bowls', 'lemon', 1.00, 'ea'),
        ('High-Protein Veggie Omelette', 'spinach', 0.50, 'cup'),
        ('Beef and Quinoa Power Bowl', 'quinoa', 1.50, 'cup'),
        ('Quick Shrimp Stir Fry', 'shrimp', 1.00, 'lb'),
        ('Hearty Lentil Soup', 'lentils', 1.00, 'cup'),
        ('Honey Mustard Chicken', 'chicken breast', 1.50, 'lb'),
        ('Honey Mustard Chicken', 'chicken', 1.50, 'lb'),
        ('Honey Mustard Chicken', 'honey', 0.25, 'cup'),
        ('Honey Mustard Chicken', 'mustard', 0.25, 'cup'),
        ('Spicy Chicken Tacos', 'chicken breast', 1.00, 'lb'),
        ('Spicy Chicken Tacos', 'chicken', 1.00, 'lb'),
        ('Avocado Toast Deluxe', 'avocado', 2.00, 'ea'),
        ('Greek Yogurt Parfait', 'yogurt', 1.00, 'cup')
)
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT r.id, i.id, im.quantity, im.unit
FROM ingredient_map im
JOIN recipe r ON r.title = im.recipe_title
JOIN ingredient i ON i.name = im.ingredient_name;

WITH iq AS (
    INSERT INTO image_query (user_id, type, detected_hints)
    VALUES (
        (SELECT id FROM users WHERE email = 'demo+intermediate@fitnessapp.com'),
        'workout',
        '["dumbbells","strength"]'
    )
    RETURNING id
)
INSERT INTO retrieval_result (query_id, item_type, item_id, rank, score, latency_ms)
SELECT iq.id,
       'workout_video',
       (SELECT id FROM workout_video WHERE youtube_id = 'DBL0002'),
       1,
       0.953,
       180
FROM iq;

INSERT INTO user_saved_workout (user_id, workout_id)
SELECT u.id, w.id
FROM users u
JOIN workout_video w ON w.youtube_id IN ('dQw4w9WgXcQ', 'MAT0003')
WHERE u.email = 'demo+beginner@fitnessapp.com';

INSERT INTO user_saved_recipe (user_id, recipe_id)
SELECT u.id, r.id
FROM users u
JOIN recipe r ON r.title = 'Lemon Garlic Chicken Bowls'
WHERE u.email = 'demo+beginner@fitnessapp.com';

INSERT INTO feedback (user_id, item_type, item_id, rating, notes)
SELECT u.id, 'workout', w.id, 5, 'Great warm-up session!'
FROM users u
JOIN workout_video w ON w.youtube_id = 'dQw4w9WgXcQ'
WHERE u.email = 'demo+beginner@fitnessapp.com';
