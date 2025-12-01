-- Add fields to support image-based food recognition in meal_log

-- Add food_items JSONB column to store array of recognized foods
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS food_items JSONB;

-- Add image_url for storing meal photo
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add total nutrition fields (these will be calculated from food_items)
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS total_calories INTEGER;
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS total_protein NUMERIC(8,2);
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS total_carbs NUMERIC(8,2);
ALTER TABLE meal_log ADD COLUMN IF NOT EXISTS total_fat NUMERIC(8,2);

-- Add comment for documentation
COMMENT ON COLUMN meal_log.food_items IS 'JSONB array of food items: [{foodKey, displayName, grams, calories, protein, fat, carbs, confidence}]';
COMMENT ON COLUMN meal_log.image_url IS 'URL or path to the meal photo used for recognition';

-- Add index for querying by meal type and date
CREATE INDEX IF NOT EXISTS idx_meal_log_type_consumed_at ON meal_log(meal_type, consumed_at DESC);
