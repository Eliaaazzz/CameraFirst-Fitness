-- ============================================================================
-- V48: Remove User-Requested Recipes from Catalog
-- ============================================================================
-- Removes recipes explicitly requested to be deleted from the recipe database.
-- Cleanup notes:
-- - recipe_ingredient, user_saved_recipe: ON DELETE CASCADE via FK to recipe
-- - meal_log.recipe_id: ON DELETE SET NULL (keeps the meal log entry)
-- - retrieval_result.item_id: not FK-constrained, so delete explicitly
-- ============================================================================

WITH target_recipes AS (
    SELECT id
    FROM recipe
    WHERE LOWER(BTRIM(title)) IN (
        'pesto chicken zoodles',
        'lemon garlic chicken bowls',
        'spinach & egg white frittata',
        'baked cod with veggies',
        'creamy roasted pumpkin soup',
        'hearty lentil soup',
        'beef and quinoa power bowl'
    )
)
DELETE FROM retrieval_result rr
USING target_recipes tr
WHERE rr.item_id = tr.id;

DELETE FROM recipe
WHERE LOWER(BTRIM(title)) IN (
    'pesto chicken zoodles',
    'lemon garlic chicken bowls',
    'spinach & egg white frittata',
    'baked cod with veggies',
    'creamy roasted pumpkin soup',
    'hearty lentil soup',
    'beef and quinoa power bowl'
);
