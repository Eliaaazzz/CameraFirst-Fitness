-- ==========================================
-- V34: Remove old recipes, keep only 20 commercial-grade recipes
-- ==========================================
-- The 20 commercial-grade recipes were inserted at 2025-12-30 06:49:17
-- Delete all recipes created before that timestamp

-- First, delete recipe_ingredient entries for old recipes
DELETE FROM recipe_ingredient
WHERE recipe_id IN (
    SELECT id FROM recipe
    WHERE created_at < '2025-12-30 06:49:17+00'
);

-- Then delete the old recipes themselves
DELETE FROM recipe
WHERE created_at < '2025-12-30 06:49:17+00';

-- Also clean up any orphaned ingredients (not used by any recipe)
DELETE FROM ingredient
WHERE id NOT IN (
    SELECT DISTINCT ingredient_id FROM recipe_ingredient
);
