-- ==========================================
-- V38: Import 16 Curated High-Quality Recipes
-- ==========================================
-- Features:
-- 1. Hand-picked recipes across 8 categories
-- 2. Complete ingredients with detailed notes
-- 3. Step-by-step instructions
-- 4. Accurate nutrition data (calories, protein, carbs, fat)
-- 5. Wikimedia Commons images for reliable CDN delivery
-- ==========================================

-- First, insert all unique ingredients
INSERT INTO ingredient (id, name)
SELECT gen_random_uuid(), name
FROM (
    VALUES
    -- Salad ingredients
    ('Grilled chicken breast'), ('Quinoa (cooked)'), ('Cucumber'), ('Cherry tomatoes'),
    ('Feta cheese'), ('Olive oil & lemon juice dressing'), ('Grilled shrimp'),
    ('Avocado'), ('Hard-boiled egg'), ('Mixed greens'), ('Red onion'),
    ('Low-fat yogurt dressing'),
    -- Chicken ingredients
    ('Chicken breast'), ('Olive oil'), ('Garlic'), ('Dried rosemary'), ('Dried thyme'),
    ('Lemon'), ('Chicken thighs (boneless)'), ('Honey'), ('Sriracha'), ('Soy sauce'),
    -- Smoothie ingredients
    ('Vanilla whey protein'), ('Frozen mixed berries'), ('Unsweetened almond milk'),
    ('Chia seeds'), ('Spinach'), ('Green apple'), ('Ginger'), ('Coconut water'),
    -- Pasta ingredients
    ('Whole wheat pasta'), ('Marinara sauce'), ('Plain Greek yogurt'), ('Fresh basil'),
    ('Shrimp'), ('Zucchini'), ('Butter'), ('Red pepper flakes'),
    -- Breakfast ingredients
    ('Rolled oats'), ('Milk'), ('Blueberries'), ('Egg whites'), ('Whole egg'),
    ('Mushrooms'), ('Salt'), ('Black pepper'),
    -- Soup ingredients
    ('Red lentils'), ('Vegetable broth'), ('Onion'), ('Turmeric powder'),
    ('Cooked chicken breast (shredded)'), ('Carrot'), ('Celery stalk'), ('Chicken broth'),
    -- Fish ingredients
    ('Salmon fillet'), ('Asparagus'), ('Sea salt'), ('White fish (tilapia)'),
    ('Corn tortillas'), ('Purple cabbage'), ('Lime juice'), ('Cumin'), ('Chili powder'),
    -- Vegetarian ingredients
    ('Firm tofu'), ('Cornstarch'), ('Teriyaki sauce'), ('Green onions'), ('Sesame seeds'),
    ('Sweet potato'), ('Black beans (cooked)'), ('Brown rice (cooked)'), ('Lettuce'),
    ('Tahini dressing')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM ingredient WHERE ingredient.name = v.name);

-- Create temporary table to map recipe IDs
CREATE TEMP TABLE curated_recipe_map (
    recipe_key VARCHAR(100) PRIMARY KEY,
    recipe_id UUID DEFAULT gen_random_uuid()
);

INSERT INTO curated_recipe_map (recipe_key) VALUES
('salad_mediterranean_quinoa_power_bowl'),
('salad_avocado_shrimp_cobb'),
('chicken_lemon_garlic_herb'),
('chicken_spicy_honey_glazed_thighs'),
('smoothie_berry_blast_protein_shake'),
('smoothie_green_aura_detox'),
('pasta_creamy_tomato_basil_healthy'),
('pasta_shrimp_scampi_zucchini_noodles'),
('breakfast_blueberry_almond_overnight_oats'),
('breakfast_spinach_mushroom_eggwhite_frittata'),
('soup_golden_lentil_soup'),
('soup_classic_chicken_veggie_broth'),
('fish_pan_seared_salmon_asparagus'),
('fish_baja_fish_tacos_grilled'),
('vegetarian_crispy_teriyaki_tofu'),
('vegetarian_sweet_potato_black_bean_buddha_bowl');

-- Insert the 16 curated recipes
INSERT INTO recipe (id, title, image_url, time_minutes, difficulty, nutrition_summary, steps, target_goal, dietary_tags, created_at)
SELECT
    m.recipe_id,
    r.title,
    r.image_url,
    r.time_minutes,
    r.difficulty,
    r.nutrition_summary,
    r.steps,
    r.target_goal,
    r.dietary_tags,
    NOW()
FROM (
    VALUES
    -- ========== SALADS ==========
    ('salad_mediterranean_quinoa_power_bowl',
     'Mediterranean Quinoa Power Bowl',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Quinoa%20Salad%20%28140491457%29.jpeg',
     20, 'Easy',
     '{"calories": 450, "protein": 35, "carbs": 40, "fat": 18, "fiber": 6, "sugar": 4}'::jsonb,
     '[{"step": 1, "instruction": "Cook quinoa and let it cool."},
       {"step": 2, "instruction": "In a large bowl, combine cucumber, tomatoes, chicken, and quinoa."},
       {"step": 3, "instruction": "Drizzle with dressing and toss to combine."},
       {"step": 4, "instruction": "Top with crumbled feta cheese."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN'],
     ARRAY['high_protein', 'gluten_free']
    ),

    ('salad_avocado_shrimp_cobb',
     'Avocado Shrimp Cobb Salad',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Shrimp%20and%20Avocado%20Salad%20-%20131928068.jpg',
     15, 'Easy',
     '{"calories": 380, "protein": 28, "carbs": 12, "fat": 24, "fiber": 8, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Lay a bed of mixed greens."},
       {"step": 2, "instruction": "Neatly arrange the shrimp, avocado, halved egg, and onion on top."},
       {"step": 3, "instruction": "Drizzle with yogurt dressing before serving."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL'],
     ARRAY['high_protein', 'low_carb', 'gluten_free']
    ),

    -- ========== CHICKEN ==========
    ('chicken_lemon_garlic_herb',
     'Lemon Garlic Herb Chicken',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Chicken%20breast%20with%20lemon%20sauce%20%2817238222455%29.jpg',
     25, 'Easy',
     '{"calories": 280, "protein": 45, "carbs": 2, "fat": 10, "fiber": 0, "sugar": 1}'::jsonb,
     '[{"step": 1, "instruction": "Marinate chicken with all ingredients for 15 minutes."},
       {"step": 2, "instruction": "Heat a pan over medium heat; sear for 4-5 minutes per side until golden and cooked through."},
       {"step": 3, "instruction": "Rest for 5 minutes before slicing (to lock in juices)."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'LOSE_WEIGHT'],
     ARRAY['high_protein', 'low_carb', 'gluten_free', 'dairy_free']
    ),

    ('chicken_spicy_honey_glazed_thighs',
     'Spicy Honey Glazed Chicken Thighs',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Glazed%20chicken%20food.jpg',
     30, 'Medium',
     '{"calories": 420, "protein": 30, "carbs": 15, "fat": 26, "fiber": 0, "sugar": 12}'::jsonb,
     '[{"step": 1, "instruction": "Mix honey, sriracha, and soy sauce to make a glaze."},
       {"step": 2, "instruction": "Coat chicken thighs evenly with the glaze."},
       {"step": 3, "instruction": "Bake at 200°C (400°F) for 20-25 minutes, basting once halfway through."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN'],
     ARRAY['high_protein', 'dairy_free']
    ),

    -- ========== SMOOTHIES ==========
    ('smoothie_berry_blast_protein_shake',
     'Berry Blast Protein Shake',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Red%20berry%20smoothie%20in%20a%20jar%20%2823698836144%29.jpg',
     5, 'Easy',
     '{"calories": 320, "protein": 25, "carbs": 30, "fat": 8, "fiber": 5, "sugar": 15}'::jsonb,
     '[{"step": 1, "instruction": "Add all ingredients to a blender."},
       {"step": 2, "instruction": "Blend on high for 30 seconds until smooth."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN'],
     ARRAY['high_protein', 'gluten_free', 'vegetarian']
    ),

    ('smoothie_green_aura_detox',
     'The "Green Aura" Detox',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Green%20smoothie%20bowls%20with%20yogurt%20swirls%20%28Unsplash%20lI-rmmf3Yy4%29.jpg',
     5, 'Easy',
     '{"calories": 180, "protein": 4, "carbs": 35, "fat": 2, "fiber": 6, "sugar": 22}'::jsonb,
     '[{"step": 1, "instruction": "Chop the apple and cucumber."},
       {"step": 2, "instruction": "Blend all ingredients with a few ice cubes for a refreshing texture."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL'],
     ARRAY['low_calorie', 'vegan', 'gluten_free', 'dairy_free']
    ),

    -- ========== PASTA ==========
    ('pasta_creamy_tomato_basil_healthy',
     'Creamy Tomato Basil Pasta (Healthy Ver.)',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Pasta%20al%20Pomodoro%2001.jpg',
     25, 'Easy',
     '{"calories": 480, "protein": 18, "carbs": 75, "fat": 10, "fiber": 8, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Boil pasta until al dente."},
       {"step": 2, "instruction": "Heat marinara sauce in a pan, turn off heat, and stir in Greek yogurt (to prevent curdling)."},
       {"step": 3, "instruction": "Toss pasta in the sauce and top with fresh basil."}]'::jsonb,
     ARRAY['MAINTAIN'],
     ARRAY['vegetarian', 'high_fiber']
    ),

    ('pasta_shrimp_scampi_zucchini_noodles',
     'Shrimp Scampi with Zucchini Noodles',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Zucchini%20Pad%20Thai%20%28164359215%29.jpeg',
     20, 'Medium',
     '{"calories": 320, "protein": 30, "carbs": 10, "fat": 16, "fiber": 3, "sugar": 6}'::jsonb,
     '[{"step": 1, "instruction": "Melt butter in a pan and sauté garlic until fragrant."},
       {"step": 2, "instruction": "Add shrimp and cook until pink."},
       {"step": 3, "instruction": "Toss in zucchini noodles and stir-fry quickly for 1-2 minutes (do not overcook or it gets watery)."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'BLOOD_SUGAR_CONTROL'],
     ARRAY['high_protein', 'low_carb', 'gluten_free']
    ),

    -- ========== BREAKFAST ==========
    ('breakfast_blueberry_almond_overnight_oats',
     'Blueberry Almond Overnight Oats',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Protein%20overnight%20oats.jpg',
     10, 'Easy',
     '{"calories": 350, "protein": 12, "carbs": 50, "fat": 10, "fiber": 7, "sugar": 18}'::jsonb,
     '[{"step": 1, "instruction": "Mix oats, milk, chia seeds, and honey in a jar."},
       {"step": 2, "instruction": "Refrigerate overnight (at least 4 hours)."},
       {"step": 3, "instruction": "Top with fresh blueberries before eating."}]'::jsonb,
     ARRAY['MAINTAIN'],
     ARRAY['vegetarian', 'high_fiber']
    ),

    ('breakfast_spinach_mushroom_eggwhite_frittata',
     'Spinach Mushroom Egg White Frittata',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Spinach%20mushroom%20omelet%20%289206725327%29.jpg',
     20, 'Easy',
     '{"calories": 250, "protein": 30, "carbs": 5, "fat": 10, "fiber": 2, "sugar": 2}'::jsonb,
     '[{"step": 1, "instruction": "Sauté mushrooms and spinach in a non-stick pan."},
       {"step": 2, "instruction": "Pour in the beaten egg mixture."},
       {"step": 3, "instruction": "Cook on low heat until the bottom sets, then broil (or cover) until the top is set."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE'],
     ARRAY['high_protein', 'low_carb', 'gluten_free', 'vegetarian']
    ),

    -- ========== SOUPS ==========
    ('soup_golden_lentil_soup',
     'Golden Lentil Soup',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Linseneintopf.jpg',
     30, 'Easy',
     '{"calories": 300, "protein": 15, "carbs": 45, "fat": 5, "fiber": 12, "sugar": 4}'::jsonb,
     '[{"step": 1, "instruction": "Sauté onion in a pot."},
       {"step": 2, "instruction": "Add lentils, broth, and turmeric."},
       {"step": 3, "instruction": "Simmer for 20 minutes until lentils break down into a creamy soup."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'MAINTAIN'],
     ARRAY['vegan', 'high_fiber', 'gluten_free', 'dairy_free']
    ),

    ('soup_classic_chicken_veggie_broth',
     'Classic Chicken & Veggie Broth',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Ginger%20Chicken%20Soup%20with%20Vegetables%20-%2050408986928.jpg',
     25, 'Easy',
     '{"calories": 200, "protein": 25, "carbs": 10, "fat": 5, "fiber": 3, "sugar": 4}'::jsonb,
     '[{"step": 1, "instruction": "Bring broth to a boil; add carrots and celery and cook until tender."},
       {"step": 2, "instruction": "Add shredded chicken and heat through."},
       {"step": 3, "instruction": "Season with salt and pepper."}]'::jsonb,
     ARRAY['LOSE_WEIGHT', 'GAIN_MUSCLE'],
     ARRAY['high_protein', 'low_calorie', 'gluten_free', 'dairy_free']
    ),

    -- ========== FISH ==========
    ('fish_pan_seared_salmon_asparagus',
     'Pan-Seared Salmon with Asparagus',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Grilled%20salmon%20and%20asparagus%20on%20rice%20-%20Boston%2C%20Massachusetts.jpg',
     20, 'Medium',
     '{"calories": 450, "protein": 35, "carbs": 5, "fat": 30, "fiber": 3, "sugar": 2}'::jsonb,
     '[{"step": 1, "instruction": "Place salmon skin-side down in a hot pan; cook 4-5 mins until skin is crispy."},
       {"step": 2, "instruction": "Flip and cook 1-2 mins."},
       {"step": 3, "instruction": "Cook asparagus in the same pan with the salmon oils."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'BLOOD_SUGAR_CONTROL'],
     ARRAY['high_protein', 'low_carb', 'gluten_free', 'dairy_free']
    ),

    ('fish_baja_fish_tacos_grilled',
     'Baja Fish Tacos (Grilled Ver.)',
     'https://commons.wikimedia.org/wiki/Special:FilePath/fish%20tacos%20food%20cabbage%20tortillas.jpg',
     25, 'Medium',
     '{"calories": 350, "protein": 25, "carbs": 30, "fat": 12, "fiber": 5, "sugar": 3}'::jsonb,
     '[{"step": 1, "instruction": "Season fish with cumin and chili powder; grill until cooked."},
       {"step": 2, "instruction": "Flake the fish into chunks and place on warm tortillas."},
       {"step": 3, "instruction": "Top with cabbage and a squeeze of lime juice."}]'::jsonb,
     ARRAY['GAIN_MUSCLE', 'MAINTAIN'],
     ARRAY['high_protein', 'dairy_free']
    ),

    -- ========== VEGETARIAN ==========
    ('vegetarian_crispy_teriyaki_tofu',
     'Crispy Teriyaki Tofu',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Spicy%20Tofu%20Bento%20Bowl%20%284210037392%29.jpg',
     25, 'Medium',
     '{"calories": 320, "protein": 20, "carbs": 25, "fat": 15, "fiber": 3, "sugar": 10}'::jsonb,
     '[{"step": 1, "instruction": "Coat tofu cubes lightly in cornstarch."},
       {"step": 2, "instruction": "Pan-fry in a little oil until golden and crispy on all sides."},
       {"step": 3, "instruction": "Pour in teriyaki sauce and toss quickly to glaze; top with green onions."}]'::jsonb,
     ARRAY['MAINTAIN'],
     ARRAY['vegan', 'dairy_free']
    ),

    ('vegetarian_sweet_potato_black_bean_buddha_bowl',
     'Sweet Potato Black Bean Buddha Bowl',
     'https://commons.wikimedia.org/wiki/Special:FilePath/Tasty%20Buddha%20Bowl%20with%20Falafel%20and%20Sweet%20Potatoes%2C%20Chickpeas%2C%20Dried%20Cranberries%20and%20a%20Mix%20of%20Seeds%20-%2051477507415.jpg',
     35, 'Easy',
     '{"calories": 400, "protein": 15, "carbs": 65, "fat": 8, "fiber": 12, "sugar": 10}'::jsonb,
     '[{"step": 1, "instruction": "Place brown rice at the bottom of the bowl."},
       {"step": 2, "instruction": "Arrange sweet potato, black beans, and lettuce in sections."},
       {"step": 3, "instruction": "Drizzle with tahini dressing and mix before eating."}]'::jsonb,
     ARRAY['MAINTAIN', 'BLOOD_SUGAR_CONTROL'],
     ARRAY['vegan', 'high_fiber', 'gluten_free', 'dairy_free']
    )

) AS r(recipe_key, title, image_url, time_minutes, difficulty, nutrition_summary, steps, target_goal, dietary_tags)
JOIN curated_recipe_map m ON m.recipe_key = r.recipe_key;

-- ==========================================
-- Insert recipe ingredients
-- ==========================================

-- Mediterranean Quinoa Power Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Grilled chicken breast', 150, 'g'),
    ('Quinoa (cooked)', 120, 'g'),
    ('Cucumber', 50, 'g'),
    ('Cherry tomatoes', 80, 'g'),
    ('Feta cheese', 30, 'g'),
    ('Olive oil & lemon juice dressing', 15, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'salad_mediterranean_quinoa_power_bowl';

-- Avocado Shrimp Cobb Salad
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Grilled shrimp', 150, 'g'),
    ('Avocado', 75, 'g'),
    ('Hard-boiled egg', 50, 'g'),
    ('Mixed greens', 60, 'g'),
    ('Red onion', 20, 'g'),
    ('Low-fat yogurt dressing', 30, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'salad_avocado_shrimp_cobb';

-- Lemon Garlic Herb Chicken
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Chicken breast', 200, 'g'),
    ('Olive oil', 15, 'ml'),
    ('Garlic', 10, 'g'),
    ('Dried rosemary', 2, 'g'),
    ('Lemon', 30, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'chicken_lemon_garlic_herb';

-- Spicy Honey Glazed Chicken Thighs
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Chicken thighs (boneless)', 200, 'g'),
    ('Honey', 15, 'g'),
    ('Sriracha', 15, 'g'),
    ('Soy sauce', 15, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'chicken_spicy_honey_glazed_thighs';

-- Berry Blast Protein Shake
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Vanilla whey protein', 30, 'g'),
    ('Frozen mixed berries', 150, 'g'),
    ('Unsweetened almond milk', 240, 'ml'),
    ('Chia seeds', 10, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'smoothie_berry_blast_protein_shake';

-- Green Aura Detox
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Spinach', 30, 'g'),
    ('Green apple', 150, 'g'),
    ('Cucumber', 75, 'g'),
    ('Ginger', 5, 'g'),
    ('Coconut water', 240, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'smoothie_green_aura_detox';

-- Creamy Tomato Basil Pasta
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Whole wheat pasta', 80, 'g'),
    ('Marinara sauce', 120, 'ml'),
    ('Plain Greek yogurt', 30, 'g'),
    ('Fresh basil', 5, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'pasta_creamy_tomato_basil_healthy';

-- Shrimp Scampi with Zucchini Noodles
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Shrimp', 150, 'g'),
    ('Zucchini', 200, 'g'),
    ('Butter', 15, 'g'),
    ('Garlic', 15, 'g'),
    ('Red pepper flakes', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'pasta_shrimp_scampi_zucchini_noodles';

-- Blueberry Almond Overnight Oats
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Rolled oats', 50, 'g'),
    ('Milk', 120, 'ml'),
    ('Chia seeds', 10, 'g'),
    ('Honey', 15, 'g'),
    ('Blueberries', 50, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'breakfast_blueberry_almond_overnight_oats';

-- Spinach Mushroom Egg White Frittata
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Egg whites', 160, 'g'),
    ('Whole egg', 50, 'g'),
    ('Spinach', 60, 'g'),
    ('Mushrooms', 75, 'g'),
    ('Salt', 2, 'g'),
    ('Black pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'breakfast_spinach_mushroom_eggwhite_frittata';

-- Golden Lentil Soup
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Red lentils', 100, 'g'),
    ('Vegetable broth', 500, 'ml'),
    ('Onion', 80, 'g'),
    ('Turmeric powder', 3, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'soup_golden_lentil_soup';

-- Classic Chicken & Veggie Broth
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Cooked chicken breast (shredded)', 150, 'g'),
    ('Carrot', 80, 'g'),
    ('Celery stalk', 40, 'g'),
    ('Chicken broth', 500, 'ml'),
    ('Salt', 2, 'g'),
    ('Black pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'soup_classic_chicken_veggie_broth';

-- Pan-Seared Salmon with Asparagus
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Salmon fillet', 180, 'g'),
    ('Asparagus', 100, 'g'),
    ('Lemon', 15, 'g'),
    ('Sea salt', 2, 'g'),
    ('Black pepper', 1, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'fish_pan_seared_salmon_asparagus';

-- Baja Fish Tacos
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('White fish (tilapia)', 150, 'g'),
    ('Corn tortillas', 60, 'g'),
    ('Purple cabbage', 50, 'g'),
    ('Lime juice', 15, 'ml'),
    ('Cumin', 2, 'g'),
    ('Chili powder', 2, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'fish_baja_fish_tacos_grilled';

-- Crispy Teriyaki Tofu
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Firm tofu', 200, 'g'),
    ('Cornstarch', 15, 'g'),
    ('Teriyaki sauce', 30, 'ml'),
    ('Green onions', 10, 'g'),
    ('Sesame seeds', 5, 'g')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'vegetarian_crispy_teriyaki_tofu';

-- Sweet Potato Black Bean Buddha Bowl
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
SELECT m.recipe_id, i.id, v.quantity, v.unit
FROM curated_recipe_map m
CROSS JOIN (
    VALUES
    ('Sweet potato', 150, 'g'),
    ('Black beans (cooked)', 100, 'g'),
    ('Brown rice (cooked)', 150, 'g'),
    ('Lettuce', 40, 'g'),
    ('Tahini dressing', 30, 'ml')
) AS v(name, quantity, unit)
JOIN ingredient i ON i.name = v.name
WHERE m.recipe_key = 'vegetarian_sweet_potato_black_bean_buddha_bowl';

-- Clean up temp table
DROP TABLE curated_recipe_map;

-- Log completion
DO $$
DECLARE
    recipe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recipe_count FROM recipe WHERE title IN (
        'Mediterranean Quinoa Power Bowl',
        'Avocado Shrimp Cobb Salad',
        'Lemon Garlic Herb Chicken',
        'Spicy Honey Glazed Chicken Thighs',
        'Berry Blast Protein Shake',
        'The "Green Aura" Detox',
        'Creamy Tomato Basil Pasta (Healthy Ver.)',
        'Shrimp Scampi with Zucchini Noodles',
        'Blueberry Almond Overnight Oats',
        'Spinach Mushroom Egg White Frittata',
        'Golden Lentil Soup',
        'Classic Chicken & Veggie Broth',
        'Pan-Seared Salmon with Asparagus',
        'Baja Fish Tacos (Grilled Ver.)',
        'Crispy Teriyaki Tofu',
        'Sweet Potato Black Bean Buddha Bowl'
    );
    RAISE NOTICE 'V38: Imported % curated recipes with ingredients', recipe_count;
END $$;
