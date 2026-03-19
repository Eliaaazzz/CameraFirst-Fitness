-- ============================================================================
-- V50: Update Buddha Bowl timing and remove Green Aura Detox
-- ============================================================================
-- Changes requested:
-- - Set "Sweet Potato Black Bean Buddha Bowl" to 30 minutes
-- - Remove 'The "Green Aura" Detox' from the recipe catalog
-- Cleanup notes:
-- - recipe_ingredient, user_saved_recipe: ON DELETE CASCADE via FK to recipe
-- - meal_log.recipe_id: ON DELETE SET NULL (keeps the meal log entry)
-- - retrieval_result.item_id: not FK-constrained, so delete explicitly
-- ============================================================================

UPDATE recipe
SET time_minutes = 30
WHERE LOWER(BTRIM(title)) = 'sweet potato black bean buddha bowl';

WITH target_recipes AS (
    SELECT id
    FROM recipe
    WHERE LOWER(BTRIM(title)) = 'the "green aura" detox'
)
DELETE FROM retrieval_result rr
USING target_recipes tr
WHERE rr.item_id = tr.id;

DELETE FROM recipe
WHERE LOWER(BTRIM(title)) = 'the "green aura" detox';
