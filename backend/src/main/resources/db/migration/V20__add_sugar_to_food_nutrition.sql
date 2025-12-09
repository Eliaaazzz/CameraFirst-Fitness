-- Add sugar field to food_nutrition for sugar cube visualization
ALTER TABLE food_nutrition ADD COLUMN IF NOT EXISTS sugar NUMERIC(8,2);

COMMENT ON COLUMN food_nutrition.sugar IS 'Sugar content per 100g for visualization';
