-- ============================================================================
-- V46: Remove Fake/Placeholder Recipes
-- ============================================================================
-- These recipe rows are known to be fake placeholder content and should not ship.
-- This migration deletes the recipes and relies on FK cascades to clean up:
-- - recipe_ingredient (ON DELETE CASCADE)
-- - user_saved_recipe (ON DELETE CASCADE)
-- meal_log.recipe_id is ON DELETE SET NULL (keeps the log entry).
-- ============================================================================

WITH target_recipes AS (
    SELECT id
    FROM recipe
    WHERE LOWER(BTRIM(title)) IN (
        'high-protein veggie omelette',
        'spinach mushroom egg white frittata',
        'avocado & egg toast',
        'baja fish tacos (grilled ver.)'
    )
)
DELETE FROM retrieval_result rr
USING target_recipes tr
WHERE rr.item_id = tr.id;

DELETE FROM recipe
WHERE LOWER(BTRIM(title)) IN (
    'high-protein veggie omelette',
    'spinach mushroom egg white frittata',
    'avocado & egg toast',
    'baja fish tacos (grilled ver.)'
);
