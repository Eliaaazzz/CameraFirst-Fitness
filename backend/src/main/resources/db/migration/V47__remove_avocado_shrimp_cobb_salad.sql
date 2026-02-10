-- ============================================================================
-- V47: Remove Fake/Placeholder Recipe - Avocado Shrimp Cobb Salad
-- ============================================================================
-- Deletes the curated-but-fake recipe row from the catalog.
-- Cleanup notes:
-- - recipe_ingredient, user_saved_recipe: ON DELETE CASCADE via FK to recipe
-- - meal_log.recipe_id: ON DELETE SET NULL (keeps the log entry)
-- - retrieval_result.item_id: not an FK, so delete explicitly
-- ============================================================================

WITH target_recipes AS (
    SELECT id
    FROM recipe
    WHERE LOWER(BTRIM(title)) = 'avocado shrimp cobb salad'
)
DELETE FROM retrieval_result rr
USING target_recipes tr
WHERE rr.item_id = tr.id;

DELETE FROM recipe
WHERE LOWER(BTRIM(title)) = 'avocado shrimp cobb salad';
