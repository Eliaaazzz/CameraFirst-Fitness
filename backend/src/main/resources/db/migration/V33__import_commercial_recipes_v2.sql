-- ==========================================
-- V33: Import 20 Commercial-Grade Recipes (V2.0)
-- ==========================================
-- Features:
-- 1. Complete ingredients with standardized units (g/ml)
-- 2. Detailed step-by-step instructions
-- 3. Accurate nutrition data
-- 4. Raw vs Cooked standardization

-- First, insert all unique ingredients into the ingredient table
INSERT INTO ingredient (id, name)
SELECT gen_random_uuid(), name
FROM (
    VALUES
    ('Rolled Oats'), ('Whey Protein'), ('Almond Milk'), ('Chia Seeds'), ('Mixed Berries'),
    ('Egg Whites'), ('Fresh Spinach'), ('Cherry Tomatoes'), ('Feta Cheese'), ('Salt'), ('Black Pepper'),
    ('Greek Yogurt (0% Fat)'), ('Banana'), ('Honey'), ('Walnuts'), ('Granola (Low Sugar)'),
    ('Whole Grain Bread'), ('Avocado'), ('Egg (Large)'), ('Lime Juice'),
    ('Eggs'), ('Cooking Spray'),
    ('Chicken Breast (Raw)'), ('Cooked Quinoa'), ('Broccoli'), ('Lemon Juice'), ('Garlic Minced'), ('Dried Mixed Herbs'),
    ('Cooked Brown Rice'), ('Black Beans (Canned/Drained)'), ('Corn (Canned/Drained)'), ('Salsa'), ('Taco Seasoning'),
    ('Ground Turkey (Lean)'), ('Kidney Beans (Canned/Drained)'), ('Canned Tomatoes'), ('Onion'), ('Chili Powder'),
    ('Zucchini'), ('Basil Pesto'),
    ('Lean Beef Steak'), ('Bell Pepper'), ('Snap Peas'), ('Soy Sauce'), ('Cooked White Rice'), ('Ginger Minced'),
    ('Sirloin Steak'), ('Sweet Potato'), ('Green Beans'), ('Olive Oil'),
    ('Ground Beef (Lean)'), ('Oyster Sauce'),
    ('Salmon Fillet'), ('Asparagus'),
    ('Shrimp (Raw)'), ('Cucumber'), ('Paprika'),
    ('Cod Fillet'),
    ('Canned Tuna (Drained)'), ('Greek Yogurt'), ('Celery'), ('Lettuce Leaves'), ('Dijon Mustard'),
    ('Firm Tofu'), ('Kale'), ('Nutritional Yeast'), ('Turmeric Powder'),
    ('Chickpeas (Canned/Drained)'), ('Coconut Milk (Light)'), ('Spinach'), ('Red Curry Paste'),
    ('Dried Lentils'), ('Carrot'), ('Vegetable Broth'),
    ('Low-Fat Cottage Cheese'), ('Peach (Sliced)')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM ingredient WHERE ingredient.name = v.name);

-- Create temporary table to map CSV recipe IDs to new UUIDs
CREATE TEMP TABLE recipe_id_map (
    csv_id INTEGER PRIMARY KEY,
    new_id UUID DEFAULT gen_random_uuid()
);

INSERT INTO recipe_id_map (csv_id) VALUES
(1), (2), (3), (4), (5), (6), (7), (8), (9), (10),
(11), (12), (13), (14), (15), (16), (17), (18), (19), (20);

-- Insert the 20 commercial-grade recipes
INSERT INTO recipe (id, title, image_url, time_minutes, difficulty, nutrition_summary, steps, target_goal, created_at)
SELECT
    m.new_id,
    r.title,
    r.image_url,
    r.time_minutes,
    r.difficulty,
    r.nutrition_summary,
    r.steps,
    r.target_goal,
    NOW()
FROM (
    VALUES
    (1, 'High-Protein Overnight Oats',
     'https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=800&q=80',
     5, 'Easy',
     '{"calories": 380, "protein": 28, "carbs": 45, "fat": 8, "fiber": 6, "sugar": 12}'::jsonb,
     '[{"step": 1, "instruction": "Mix oats, protein powder, and chia seeds in a jar."}, {"step": 2, "instruction": "Add almond milk and stir well."}, {"step": 3, "instruction": "Refrigerate overnight."}, {"step": 4, "instruction": "Top with berries before eating."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN']),

    (2, 'Spinach & Egg White Frittata',
     'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&w=800&q=80',
     25, 'Easy',
     '{"calories": 250, "protein": 30, "carbs": 5, "fat": 10, "fiber": 2, "sugar": 2}'::jsonb,
     '[{"step": 1, "instruction": "Whisk egg whites with salt and pepper."}, {"step": 2, "instruction": "Sauté spinach in a non-stick pan."}, {"step": 3, "instruction": "Pour egg whites over spinach."}, {"step": 4, "instruction": "Cover and cook until set."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE']),

    (3, 'Greek Yogurt Power Bowl',
     'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
     5, 'Easy',
     '{"calories": 350, "protein": 22, "carbs": 38, "fat": 11, "fiber": 4, "sugar": 20}'::jsonb,
     '[{"step": 1, "instruction": "Scoop yogurt into a bowl."}, {"step": 2, "instruction": "Top with granola, banana slices, and honey."}, {"step": 3, "instruction": "Sprinkle with crushed walnuts."}]'::jsonb,
     ARRAY['MAINTAIN', 'GAIN_MUSCLE']),

    (4, 'Avocado Toast with Poached Egg',
     'https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=800&q=80',
     10, 'Medium',
     '{"calories": 400, "protein": 18, "carbs": 35, "fat": 22, "fiber": 8, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Toast the whole grain bread."}, {"step": 2, "instruction": "Mash avocado with lime juice and spread on toast."}, {"step": 3, "instruction": "Poach the egg in simmering water for 3 minutes."}, {"step": 4, "instruction": "Place egg on toast and season."}]'::jsonb,
     ARRAY['MAINTAIN']),

    (5, 'Protein Banana Pancakes',
     'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
     20, 'Medium',
     '{"calories": 450, "protein": 35, "carbs": 50, "fat": 10, "fiber": 5, "sugar": 18}'::jsonb,
     '[{"step": 1, "instruction": "Mash banana and mix with eggs and protein powder."}, {"step": 2, "instruction": "Heat a pan with cooking spray."}, {"step": 3, "instruction": "Pour batter and cook 2 mins per side."}, {"step": 4, "instruction": "Serve with sugar-free syrup."}]'::jsonb,
     ARRAY['GAIN_MUSCLE']),

    (6, 'Lemon Herb Grilled Chicken',
     'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
     30, 'Medium',
     '{"calories": 420, "protein": 45, "carbs": 30, "fat": 12, "fiber": 5, "sugar": 2}'::jsonb,
     '[{"step": 1, "instruction": "Marinate chicken with lemon, garlic, and herbs."}, {"step": 2, "instruction": "Grill for 6-8 mins per side."}, {"step": 3, "instruction": "Serve with steamed quinoa and broccoli."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'LOSE_WEIGHT']),

    (7, 'Chicken Burrito Bowl',
     'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80',
     35, 'Medium',
     '{"calories": 550, "protein": 40, "carbs": 65, "fat": 15, "fiber": 10, "sugar": 4}'::jsonb,
     '[{"step": 1, "instruction": "Cook brown rice."}, {"step": 2, "instruction": "Grill chicken strips with taco seasoning."}, {"step": 3, "instruction": "Assemble bowl with rice, beans, corn, and chicken."}, {"step": 4, "instruction": "Top with salsa."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN']),

    (8, 'Turkey Chili',
     'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
     45, 'Medium',
     '{"calories": 380, "protein": 35, "carbs": 40, "fat": 10, "fiber": 12, "sugar": 8}'::jsonb,
     '[{"step": 1, "instruction": "Sauté onions and garlic."}, {"step": 2, "instruction": "Add ground turkey and brown."}, {"step": 3, "instruction": "Add tomatoes, beans, and chili powder."}, {"step": 4, "instruction": "Simmer for 20 minutes."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE']),

    (9, 'Pesto Chicken Zoodles',
     'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80',
     25, 'Easy',
     '{"calories": 350, "protein": 38, "carbs": 12, "fat": 18, "fiber": 3, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Spiralize zucchini into noodles."}, {"step": 2, "instruction": "Cook chicken pieces in a pan."}, {"step": 3, "instruction": "Add zucchini noodles and toss for 2 mins."}, {"step": 4, "instruction": "Stir in pesto sauce."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL']),

    (10, 'Lean Beef Stir-Fry',
     'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
     25, 'Medium',
     '{"calories": 480, "protein": 42, "carbs": 50, "fat": 14, "fiber": 4, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Slice beef thinly."}, {"step": 2, "instruction": "Stir-fry beef in hot wok for 2 mins."}, {"step": 3, "instruction": "Add peppers and snap peas."}, {"step": 4, "instruction": "Toss with soy sauce and ginger."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN']),

    (11, 'Steak & Sweet Potato',
     'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80',
     30, 'Medium',
     '{"calories": 520, "protein": 45, "carbs": 40, "fat": 20, "fiber": 6, "sugar": 8}'::jsonb,
     '[{"step": 1, "instruction": "Season steak with salt and pepper."}, {"step": 2, "instruction": "Roast sweet potato cubes in oven."}, {"step": 3, "instruction": "Sear steak in pan to desired doneness."}, {"step": 4, "instruction": "Serve with steamed green beans."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'STRENGTH']),

    (12, 'Beef & Broccoli Bowl',
     'https://images.unsplash.com/photo-1541544744-378c545f1bfa?auto=format&fit=crop&w=800&q=80',
     25, 'Easy',
     '{"calories": 410, "protein": 38, "carbs": 35, "fat": 15, "fiber": 5, "sugar": 4}'::jsonb,
     '[{"step": 1, "instruction": "Steam broccoli florets."}, {"step": 2, "instruction": "Brown ground beef with garlic and ginger."}, {"step": 3, "instruction": "Mix beef and broccoli with oyster sauce."}, {"step": 4, "instruction": "Serve over rice."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN']),

    (13, 'Salmon & Asparagus',
     'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
     20, 'Medium',
     '{"calories": 480, "protein": 35, "carbs": 10, "fat": 32, "fiber": 4, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Place salmon and asparagus on a baking sheet."}, {"step": 2, "instruction": "Drizzle with olive oil and lemon."}, {"step": 3, "instruction": "Bake at 200C for 12-15 mins."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL', 'MAINTAIN']),

    (14, 'Shrimp & Quinoa Bowl',
     'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80',
     25, 'Easy',
     '{"calories": 380, "protein": 30, "carbs": 45, "fat": 8, "fiber": 5, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Cook quinoa according to package."}, {"step": 2, "instruction": "Sauté shrimp with garlic and paprika."}, {"step": 3, "instruction": "Mix shrimp, quinoa, and chopped cucumber."}, {"step": 4, "instruction": "Dress with lime juice."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE']),

    (15, 'Baked Cod with Veggies',
     'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
     25, 'Easy',
     '{"calories": 300, "protein": 35, "carbs": 20, "fat": 5, "fiber": 4, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Season cod with herbs."}, {"step": 2, "instruction": "Place on baking tray with cherry tomatoes and zucchini."}, {"step": 3, "instruction": "Bake at 190C for 15 mins."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL']),

    (16, 'Tuna Salad Lettuce Wraps',
     'https://images.unsplash.com/photo-1547496502-ffa2264a36b5?auto=format&fit=crop&w=800&q=80',
     10, 'Easy',
     '{"calories": 280, "protein": 35, "carbs": 5, "fat": 12, "fiber": 2, "sugar": 2}'::jsonb,
     '[{"step": 1, "instruction": "Drain canned tuna."}, {"step": 2, "instruction": "Mix tuna with yogurt, mustard, and celery."}, {"step": 3, "instruction": "Scoop mixture into lettuce leaves."}, {"step": 4, "instruction": "Sprinkle with black pepper."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL']),

    (17, 'Tofu Scramble',
     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
     20, 'Easy',
     '{"calories": 310, "protein": 22, "carbs": 12, "fat": 18, "fiber": 4, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Crumble tofu."}, {"step": 2, "instruction": "Sauté with turmeric, nutritional yeast, and onions."}, {"step": 3, "instruction": "Add kale and cook until wilted."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL']),

    (18, 'Chickpea & Spinach Curry',
     'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
     30, 'Medium',
     '{"calories": 420, "protein": 18, "carbs": 60, "fat": 12, "fiber": 14, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Sauté onions and curry paste."}, {"step": 2, "instruction": "Add coconut milk and chickpeas."}, {"step": 3, "instruction": "Simmer for 15 mins."}, {"step": 4, "instruction": "Stir in spinach."}]'::jsonb,
     ARRAY['MAINTAIN']),

    (19, 'Lentil Soup',
     'https://images.unsplash.com/photo-1547592166-23acbe3a624b?auto=format&fit=crop&w=800&q=80',
     45, 'Medium',
     '{"calories": 350, "protein": 20, "carbs": 55, "fat": 4, "fiber": 16, "sugar": 8}'::jsonb,
     '[{"step": 1, "instruction": "Sauté carrots, celery, and onions."}, {"step": 2, "instruction": "Add lentils and vegetable broth."}, {"step": 3, "instruction": "Simmer for 30 mins until lentils are soft."}, {"step": 4, "instruction": "Blend partially for texture."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'MAINTAIN']),

    (20, 'Cottage Cheese & Fruit Bowl',
     'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80',
     3, 'Easy',
     '{"calories": 250, "protein": 28, "carbs": 25, "fat": 4, "fiber": 2, "sugar": 18}'::jsonb,
     '[{"step": 1, "instruction": "Serve cottage cheese in a bowl."}, {"step": 2, "instruction": "Top with sliced peaches or berries."}, {"step": 3, "instruction": "Drizzle slightly with honey."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN'])
) AS r(csv_id, title, image_url, time_minutes, difficulty, nutrition_summary, steps, target_goal)
JOIN recipe_id_map m ON m.csv_id = r.csv_id;

-- Insert recipe ingredients
-- Recipe 1: High-Protein Overnight Oats
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Rolled Oats', 50, 'g'),
    ('Whey Protein', 30, 'g'),
    ('Almond Milk', 200, 'ml'),
    ('Chia Seeds', 10, 'g'),
    ('Mixed Berries', 50, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 1;

-- Recipe 2: Spinach & Egg White Frittata
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Egg Whites', 200, 'g'),
    ('Fresh Spinach', 100, 'g'),
    ('Cherry Tomatoes', 50, 'g'),
    ('Feta Cheese', 20, 'g'),
    ('Salt', 1, 'g'),
    ('Black Pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 2;

-- Recipe 3: Greek Yogurt Power Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Greek Yogurt (0% Fat)', 200, 'g'),
    ('Banana', 100, 'g'),
    ('Honey', 15, 'g'),
    ('Walnuts', 10, 'g'),
    ('Granola (Low Sugar)', 30, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 3;

-- Recipe 4: Avocado Toast with Poached Egg
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Whole Grain Bread', 70, 'g'),
    ('Avocado', 80, 'g'),
    ('Egg (Large)', 50, 'g'),
    ('Lime Juice', 5, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 4;

-- Recipe 5: Protein Banana Pancakes
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Banana', 120, 'g'),
    ('Eggs', 100, 'g'),
    ('Whey Protein', 30, 'g'),
    ('Rolled Oats', 30, 'g'),
    ('Cooking Spray', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 5;

-- Recipe 6: Lemon Herb Grilled Chicken
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Chicken Breast (Raw)', 200, 'g'),
    ('Cooked Quinoa', 150, 'g'),
    ('Broccoli', 100, 'g'),
    ('Lemon Juice', 15, 'ml'),
    ('Garlic Minced', 5, 'g'),
    ('Dried Mixed Herbs', 2, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 6;

-- Recipe 7: Chicken Burrito Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Chicken Breast (Raw)', 150, 'g'),
    ('Cooked Brown Rice', 150, 'g'),
    ('Black Beans (Canned/Drained)', 50, 'g'),
    ('Corn (Canned/Drained)', 50, 'g'),
    ('Salsa', 30, 'g'),
    ('Taco Seasoning', 5, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 7;

-- Recipe 8: Turkey Chili
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Ground Turkey (Lean)', 150, 'g'),
    ('Kidney Beans (Canned/Drained)', 100, 'g'),
    ('Canned Tomatoes', 200, 'g'),
    ('Onion', 50, 'g'),
    ('Garlic Minced', 5, 'g'),
    ('Chili Powder', 3, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 8;

-- Recipe 9: Pesto Chicken Zoodles
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Chicken Breast (Raw)', 150, 'g'),
    ('Zucchini', 200, 'g'),
    ('Basil Pesto', 30, 'g'),
    ('Cherry Tomatoes', 50, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 9;

-- Recipe 10: Lean Beef Stir-Fry
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Lean Beef Steak', 150, 'g'),
    ('Bell Pepper', 100, 'g'),
    ('Snap Peas', 50, 'g'),
    ('Soy Sauce', 15, 'ml'),
    ('Cooked White Rice', 150, 'g'),
    ('Ginger Minced', 5, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 10;

-- Recipe 11: Steak & Sweet Potato
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Sirloin Steak', 180, 'g'),
    ('Sweet Potato', 150, 'g'),
    ('Green Beans', 100, 'g'),
    ('Olive Oil', 5, 'ml'),
    ('Salt', 1, 'g'),
    ('Black Pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 11;

-- Recipe 12: Beef & Broccoli Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Ground Beef (Lean)', 150, 'g'),
    ('Broccoli', 150, 'g'),
    ('Oyster Sauce', 15, 'ml'),
    ('Cooked White Rice', 100, 'g'),
    ('Garlic Minced', 5, 'g'),
    ('Ginger Minced', 5, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 12;

-- Recipe 13: Salmon & Asparagus
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Salmon Fillet', 180, 'g'),
    ('Asparagus', 100, 'g'),
    ('Lemon Juice', 10, 'ml'),
    ('Olive Oil', 10, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 13;

-- Recipe 14: Shrimp & Quinoa Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Shrimp (Raw)', 150, 'g'),
    ('Cooked Quinoa', 150, 'g'),
    ('Cucumber', 80, 'g'),
    ('Garlic Minced', 5, 'g'),
    ('Paprika', 2, 'g'),
    ('Lime Juice', 10, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 14;

-- Recipe 15: Baked Cod with Veggies
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Cod Fillet', 180, 'g'),
    ('Cherry Tomatoes', 100, 'g'),
    ('Zucchini', 150, 'g'),
    ('Dried Mixed Herbs', 2, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 15;

-- Recipe 16: Tuna Salad Lettuce Wraps
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Canned Tuna (Drained)', 120, 'g'),
    ('Greek Yogurt', 30, 'g'),
    ('Celery', 40, 'g'),
    ('Lettuce Leaves', 40, 'g'),
    ('Dijon Mustard', 5, 'g'),
    ('Black Pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 16;

-- Recipe 17: Tofu Scramble
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Firm Tofu', 200, 'g'),
    ('Kale', 50, 'g'),
    ('Onion', 40, 'g'),
    ('Nutritional Yeast', 10, 'g'),
    ('Turmeric Powder', 2, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 17;

-- Recipe 18: Chickpea & Spinach Curry
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Chickpeas (Canned/Drained)', 200, 'g'),
    ('Coconut Milk (Light)', 100, 'ml'),
    ('Spinach', 50, 'g'),
    ('Red Curry Paste', 15, 'g'),
    ('Onion', 50, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 18;

-- Recipe 19: Lentil Soup
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Dried Lentils', 100, 'g'),
    ('Carrot', 80, 'g'),
    ('Celery', 40, 'g'),
    ('Onion', 50, 'g'),
    ('Vegetable Broth', 500, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 19;

-- Recipe 20: Cottage Cheese & Fruit Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.new_id, i.id, v.quantity, v.unit
FROM recipe_id_map m
CROSS JOIN (
    VALUES
    ('Low-Fat Cottage Cheese', 200, 'g'),
    ('Peach (Sliced)', 100, 'g'),
    ('Honey', 5, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.csv_id = 20;

-- Clean up temp table
DROP TABLE recipe_id_map;
