#!/usr/bin/env python3
"""
MM-Food-100K Recipe Importer for AuraFitness

This script imports high-quality fitness recipes from the Hugging Face
Codatta/MM-Food-100K dataset into PostgreSQL.

Requirements (pip install):
    pip install datasets psycopg2-binary pandas

Usage:
    python import_mm_food_recipes.py

Environment Variables:
    POSTGRES_HOST     - PostgreSQL host (default: localhost)
    POSTGRES_PORT     - PostgreSQL port (default: 5432)
    POSTGRES_DB       - Database name (default: fitness_mvp)
    POSTGRES_USER     - Database user (default: fitnessuser)
    POSTGRES_PASSWORD - Database password (default: dev_password)

Dataset Source: https://huggingface.co/datasets/Codatta/MM-Food-100K
"""

import os
import json
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

import psycopg2
from psycopg2.extras import execute_values, Json
from datasets import load_dataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

# Database connection settings (can be overridden via environment variables)
DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "fitness_mvp"),
    "user": os.getenv("POSTGRES_USER", "fitnessuser"),
    "password": os.getenv("POSTGRES_PASSWORD", "dev_password"),
}

# Number of recipes to import
IMPORT_LIMIT = 100

# Minimum quality thresholds
MIN_FOOD_PROBABILITY = 0.85
MIN_CAMERA_PROBABILITY = 0.60

# =============================================================================
# FITNESS INGREDIENT DEFINITIONS
# =============================================================================

# Common fitness ingredients grouped by category
FITNESS_INGREDIENTS = {
    # High-protein sources
    "protein": [
        "chicken", "turkey", "beef", "pork", "lamb", "fish", "salmon", "tuna",
        "shrimp", "crab", "lobster", "eggs", "egg whites", "tofu", "tempeh",
        "seitan", "greek yogurt", "cottage cheese", "whey", "protein",
    ],
    # Complex carbohydrates
    "carbs": [
        "rice", "brown rice", "quinoa", "oats", "oatmeal", "sweet potato",
        "potato", "pasta", "whole wheat", "bread", "barley", "bulgur",
        "couscous", "farro", "buckwheat", "corn", "beans", "lentils",
        "chickpeas", "black beans", "kidney beans",
    ],
    # Healthy fats
    "fats": [
        "avocado", "olive oil", "coconut oil", "nuts", "almonds", "walnuts",
        "cashews", "peanuts", "peanut butter", "almond butter", "seeds",
        "chia seeds", "flax seeds", "sunflower seeds", "pumpkin seeds",
    ],
    # Vegetables
    "vegetables": [
        "broccoli", "spinach", "kale", "asparagus", "brussels sprouts",
        "cauliflower", "zucchini", "bell pepper", "peppers", "tomato",
        "onion", "garlic", "mushroom", "carrots", "celery", "cucumber",
        "lettuce", "cabbage", "eggplant", "green beans", "peas",
    ],
    # Fruits
    "fruits": [
        "banana", "apple", "orange", "berries", "blueberries", "strawberries",
        "raspberries", "mango", "pineapple", "watermelon", "grapes", "kiwi",
        "grapefruit", "lemon", "lime", "peach", "pear",
    ],
    # Dairy & alternatives
    "dairy": [
        "milk", "cheese", "yogurt", "cream", "butter", "almond milk",
        "oat milk", "soy milk", "coconut milk",
    ],
}

# Flatten all fitness ingredients into a single set for quick lookup
ALL_FITNESS_INGREDIENTS = set()
for category_ingredients in FITNESS_INGREDIENTS.values():
    ALL_FITNESS_INGREDIENTS.update(ingredient.lower() for ingredient in category_ingredients)


# =============================================================================
# SQL SCHEMA
# =============================================================================

# The recipe table already exists in your database, but here's the schema
# for reference. This script inserts into the existing table.

CREATE_TABLE_SQL = """
-- Reference schema (table already exists in fitness_mvp database)
-- This is provided for documentation purposes only.

CREATE TABLE IF NOT EXISTS recipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT,
    time_minutes INTEGER NOT NULL DEFAULT 30,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
    nutrition_summary JSONB,
    steps JSONB,
    swaps JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_goal TEXT[],
    embedding vector(1536),
    search_text TEXT,
    embedding_generated_at TIMESTAMPTZ
);

-- Ingredient table for recipe ingredients
CREATE TABLE IF NOT EXISTS ingredient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE
);

-- Junction table for recipe-ingredient relationship
CREATE TABLE IF NOT EXISTS recipe_ingredient (
    recipe_id UUID REFERENCES recipe(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredient(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2),
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);
"""

# Insert statement for recipes
INSERT_RECIPE_SQL = """
INSERT INTO recipe (
    id, title, image_url, time_minutes, difficulty,
    nutrition_summary, steps, swaps, target_goal, search_text
) VALUES %s
ON CONFLICT (id) DO NOTHING
RETURNING id;
"""

# Insert statement for ingredients
INSERT_INGREDIENT_SQL = """
INSERT INTO ingredient (id, name)
VALUES (%s, %s)
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
"""

# Insert statement for recipe_ingredient junction
INSERT_RECIPE_INGREDIENT_SQL = """
INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
VALUES (%s, %s, %s, %s)
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
"""


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def parse_json_field(value: Any) -> Any:
    """Parse a JSON string field, handling various formats."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            # Try to fix common issues
            value = value.replace("'", '"')
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return None
    return None


def extract_nutrition(nutritional_profile: Any) -> Dict[str, Optional[float]]:
    """Extract nutrition data from the nutritional_profile field."""
    result = {
        "calories": None,
        "protein": None,
        "fat": None,
        "carbs": None,
        "sugar": None,
    }

    parsed = parse_json_field(nutritional_profile)
    if not parsed or not isinstance(parsed, dict):
        return result

    # Map dataset fields to our schema
    field_mapping = {
        "calories_kcal": "calories",
        "calories": "calories",
        "protein_g": "protein",
        "protein": "protein",
        "fat_g": "fat",
        "fat": "fat",
        "carbohydrate_g": "carbs",
        "carbs_g": "carbs",
        "carbs": "carbs",
        "sugar_g": "sugar",
        "sugar": "sugar",
    }

    for source_key, target_key in field_mapping.items():
        if source_key in parsed and result[target_key] is None:
            try:
                result[target_key] = float(parsed[source_key])
            except (ValueError, TypeError):
                pass

    return result


def parse_ingredients(ingredients_field: Any) -> List[str]:
    """Parse ingredients from various formats."""
    parsed = parse_json_field(ingredients_field)
    if not parsed:
        return []

    if isinstance(parsed, list):
        return [str(ing).strip().lower() for ing in parsed if ing]
    if isinstance(parsed, str):
        return [ing.strip().lower() for ing in parsed.split(",") if ing.strip()]

    return []


def parse_portion_sizes(portion_size_field: Any) -> Dict[str, str]:
    """Parse portion sizes into a dict mapping ingredient to quantity."""
    parsed = parse_json_field(portion_size_field)
    if not parsed or not isinstance(parsed, list):
        return {}

    portions = {}
    for item in parsed:
        if isinstance(item, str) and ":" in item:
            parts = item.split(":", 1)
            if len(parts) == 2:
                ingredient = parts[0].strip().lower()
                quantity = parts[1].strip()
                portions[ingredient] = quantity

    return portions


def calculate_fitness_score(ingredients: List[str]) -> int:
    """
    Calculate a fitness relevance score based on ingredients.
    Higher score = more fitness-relevant recipe.
    """
    score = 0
    ingredient_text = " ".join(ingredients).lower()

    # Score based on fitness ingredients present
    for fitness_ing in ALL_FITNESS_INGREDIENTS:
        if fitness_ing in ingredient_text:
            score += 1

    # Bonus for protein sources (most important for fitness)
    for protein in FITNESS_INGREDIENTS["protein"]:
        if protein.lower() in ingredient_text:
            score += 2

    # Bonus for vegetables
    for veg in FITNESS_INGREDIENTS["vegetables"]:
        if veg.lower() in ingredient_text:
            score += 1

    return score


def determine_target_goals(nutrition: Dict[str, Optional[float]], ingredients: List[str]) -> List[str]:
    """
    Determine fitness target goals based on nutrition profile.
    Goals: LOSE_WEIGHT, GAIN_MUSCLE, MAINTAIN, STRENGTH
    """
    goals = []

    calories = nutrition.get("calories") or 0
    protein = nutrition.get("protein") or 0
    carbs = nutrition.get("carbs") or 0
    fat = nutrition.get("fat") or 0

    # High protein recipes are good for muscle gain and strength
    if protein >= 25:
        goals.append("GAIN_MUSCLE")
        goals.append("STRENGTH")

    # Low calorie, high protein is good for weight loss
    if calories <= 400 and protein >= 15:
        goals.append("LOSE_WEIGHT")

    # Balanced macros for maintenance
    if 300 <= calories <= 600 and protein >= 15:
        goals.append("MAINTAIN")

    # Default to MAINTAIN if no other goals matched
    if not goals:
        goals.append("MAINTAIN")

    return list(set(goals))


def estimate_cooking_time(cooking_method: str, ingredients: List[str]) -> int:
    """Estimate cooking time based on method and ingredients."""
    method = (cooking_method or "").lower()

    # Quick methods
    if any(m in method for m in ["raw", "fresh", "no cook", "salad"]):
        return 10
    if any(m in method for m in ["stir-fry", "stir fry", "sauteing", "sauté"]):
        return 20
    if any(m in method for m in ["grill", "grilling", "pan-fry", "frying"]):
        return 25
    if any(m in method for m in ["baking", "roast", "oven"]):
        return 45
    if any(m in method for m in ["slow cook", "braising", "stewing"]):
        return 60
    if any(m in method for m in ["boiling", "steaming"]):
        return 20

    # Default based on ingredient count
    return min(15 + len(ingredients) * 3, 45)


def determine_difficulty(cooking_method: str, ingredients: List[str]) -> str:
    """Determine recipe difficulty based on method and ingredient count."""
    method = (cooking_method or "").lower()
    ing_count = len(ingredients)

    # Easy methods
    if any(m in method for m in ["raw", "fresh", "no cook", "salad", "smoothie"]):
        return "easy"

    # Complex methods
    if any(m in method for m in ["slow cook", "braising", "sous vide"]):
        return "hard"

    # Based on ingredient count
    if ing_count <= 5:
        return "easy"
    elif ing_count <= 10:
        return "medium"
    else:
        return "hard"


def generate_cooking_steps(dish_name: str, cooking_method: str, ingredients: List[str]) -> List[Dict]:
    """Generate basic cooking steps based on method and ingredients."""
    steps = []
    step_num = 1

    method = (cooking_method or "cooking").lower()

    # Step 1: Prep ingredients
    steps.append({
        "step": step_num,
        "instruction": f"Prepare all ingredients: {', '.join(ingredients[:5])}{'...' if len(ingredients) > 5 else ''}."
    })
    step_num += 1

    # Step 2: Method-specific preparation
    if "grill" in method:
        steps.append({"step": step_num, "instruction": "Preheat grill to medium-high heat."})
    elif "bak" in method or "oven" in method or "roast" in method:
        steps.append({"step": step_num, "instruction": "Preheat oven to 375°F (190°C)."})
    elif "fry" in method or "saut" in method:
        steps.append({"step": step_num, "instruction": "Heat oil in a large pan over medium-high heat."})
    elif "boil" in method or "steam" in method:
        steps.append({"step": step_num, "instruction": "Bring a pot of water to boil."})
    else:
        steps.append({"step": step_num, "instruction": "Prepare your cooking equipment."})
    step_num += 1

    # Step 3: Cook main ingredient
    steps.append({
        "step": step_num,
        "instruction": f"Cook the main ingredients using {method} method until done."
    })
    step_num += 1

    # Step 4: Season and finish
    steps.append({
        "step": step_num,
        "instruction": "Season to taste and serve hot."
    })

    return steps


def build_search_text(dish_name: str, ingredients: List[str], nutrition: Dict, cooking_method: str) -> str:
    """Build searchable text for embedding generation."""
    parts = [dish_name]

    # Add ingredients
    if ingredients:
        parts.append("Ingredients: " + ", ".join(ingredients[:10]))

    # Add nutrition highlights
    if nutrition.get("protein") and nutrition["protein"] >= 20:
        parts.append("high protein")
    if nutrition.get("calories") and nutrition["calories"] <= 400:
        parts.append("low calorie")

    # Add cooking method
    if cooking_method:
        parts.append(f"Cooking method: {cooking_method}")

    return " | ".join(parts)


# =============================================================================
# MAIN IMPORT LOGIC
# =============================================================================

def load_and_filter_dataset() -> List[Dict[str, Any]]:
    """Load the MM-Food-100K dataset and filter for fitness-relevant recipes."""
    logger.info("Loading Codatta/MM-Food-100K dataset from Hugging Face...")

    try:
        dataset = load_dataset("Codatta/MM-Food-100K", split="train")
        logger.info(f"Loaded {len(dataset)} total records from dataset")
    except Exception as e:
        logger.error(f"Failed to load dataset: {e}")
        raise

    # Filter and score recipes
    candidates = []

    for idx, record in enumerate(dataset):
        # Skip if missing required fields
        if not record.get("image_url"):
            continue
        if not record.get("nutritional_profile"):
            continue
        if not record.get("dish_name"):
            continue

        # Quality filters
        food_prob = record.get("food_prob", 0)
        camera_prob = record.get("camera_or_phone_prob", 0)

        if food_prob < MIN_FOOD_PROBABILITY:
            continue
        if camera_prob < MIN_CAMERA_PROBABILITY:
            continue

        # Parse ingredients
        ingredients = parse_ingredients(record.get("ingredients"))
        if len(ingredients) < 2:
            continue

        # Calculate fitness score
        fitness_score = calculate_fitness_score(ingredients)
        if fitness_score < 2:  # Must have at least 2 fitness ingredients
            continue

        # Parse nutrition
        nutrition = extract_nutrition(record.get("nutritional_profile"))
        if nutrition["calories"] is None or nutrition["protein"] is None:
            continue

        # Add to candidates
        candidates.append({
            "record": record,
            "ingredients": ingredients,
            "nutrition": nutrition,
            "fitness_score": fitness_score,
            "food_prob": food_prob,
        })

    logger.info(f"Found {len(candidates)} fitness-relevant candidates after filtering")

    # Sort by fitness score (highest first), then by food probability
    candidates.sort(key=lambda x: (-x["fitness_score"], -x["food_prob"]))

    # Take top N recipes
    selected = candidates[:IMPORT_LIMIT]
    logger.info(f"Selected top {len(selected)} recipes for import")

    return selected


def import_recipes(conn, recipes: List[Dict[str, Any]]) -> int:
    """Import recipes into the database."""
    cursor = conn.cursor()
    imported_count = 0

    for recipe_data in recipes:
        record = recipe_data["record"]
        ingredients = recipe_data["ingredients"]
        nutrition = recipe_data["nutrition"]

        try:
            recipe_id = uuid.uuid4()
            dish_name = record["dish_name"]
            cooking_method = record.get("cooking_method", "")

            # Build nutrition summary JSON
            nutrition_summary = {
                "macros": {
                    "calories": {"amount": nutrition["calories"], "unit": "kcal"},
                    "protein": {"amount": nutrition["protein"], "unit": "g"},
                    "carbs": {"amount": nutrition["carbs"], "unit": "g"} if nutrition["carbs"] else None,
                    "fat": {"amount": nutrition["fat"], "unit": "g"} if nutrition["fat"] else None,
                },
                "source": "MM-Food-100K",
                "food_type": record.get("food_type", ""),
                "cooking_method": cooking_method,
            }
            # Remove None values from macros
            nutrition_summary["macros"] = {
                k: v for k, v in nutrition_summary["macros"].items() if v is not None
            }

            # Generate steps
            steps = generate_cooking_steps(dish_name, cooking_method, ingredients)

            # Determine goals
            target_goals = determine_target_goals(nutrition, ingredients)

            # Build search text
            search_text = build_search_text(dish_name, ingredients, nutrition, cooking_method)

            # Estimate time and difficulty
            time_minutes = estimate_cooking_time(cooking_method, ingredients)
            difficulty = determine_difficulty(cooking_method, ingredients)

            # Insert recipe
            cursor.execute(
                """
                INSERT INTO recipe (
                    id, title, image_url, time_minutes, difficulty,
                    nutrition_summary, steps, swaps, target_goal, search_text
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
                """,
                (
                    str(recipe_id),
                    dish_name,
                    record["image_url"],
                    time_minutes,
                    difficulty,
                    Json(nutrition_summary),
                    Json(steps),
                    Json([]),  # Empty swaps array
                    target_goals,
                    search_text,
                )
            )

            result = cursor.fetchone()
            if result:
                # Insert ingredients
                for ing_name in ingredients[:10]:  # Limit to 10 ingredients
                    ing_name_clean = ing_name.strip()[:120]  # Max 120 chars
                    if not ing_name_clean:
                        continue

                    # Insert or get ingredient
                    cursor.execute(
                        """
                        INSERT INTO ingredient (id, name)
                        VALUES (%s, %s)
                        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                        RETURNING id
                        """,
                        (str(uuid.uuid4()), ing_name_clean)
                    )
                    ing_result = cursor.fetchone()
                    if ing_result:
                        ing_id = ing_result[0]

                        # Parse portion if available
                        portions = parse_portion_sizes(record.get("portion_size"))
                        portion = portions.get(ing_name_clean, "")
                        quantity = None
                        unit = None

                        if portion:
                            # Try to extract numeric quantity
                            import re
                            match = re.match(r"(\d+(?:\.\d+)?)\s*(\w+)?", portion)
                            if match:
                                try:
                                    quantity = float(match.group(1))
                                    unit = match.group(2) or "g"
                                except ValueError:
                                    pass

                        # Insert recipe-ingredient relationship
                        cursor.execute(
                            """
                            INSERT INTO recipe_ingredient (recipe_id, ingredient_id, quantity, unit)
                            VALUES (%s, %s, %s, %s)
                            ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
                            """,
                            (str(recipe_id), str(ing_id), quantity, unit)
                        )

                imported_count += 1
                logger.info(f"Imported: {dish_name} (score: {recipe_data['fitness_score']})")

        except Exception as e:
            logger.warning(f"Failed to import recipe '{record.get('dish_name')}': {e}")
            conn.rollback()
            continue

    conn.commit()
    return imported_count


def main():
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("MM-Food-100K Recipe Importer for AuraFitness")
    logger.info("=" * 60)

    # Load and filter dataset
    recipes = load_and_filter_dataset()

    if not recipes:
        logger.error("No suitable recipes found in dataset")
        return

    # Connect to database
    logger.info(f"Connecting to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        logger.info("Connected to database successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

    try:
        # Import recipes
        imported = import_recipes(conn, recipes)
        logger.info("=" * 60)
        logger.info(f"Import complete! Successfully imported {imported} recipes")
        logger.info("=" * 60)

        # Print summary
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM recipe")
        total = cursor.fetchone()[0]
        logger.info(f"Total recipes in database: {total}")

        # Show sample of imported recipes
        cursor.execute("""
            SELECT title, time_minutes, difficulty,
                   nutrition_summary->'macros'->'calories'->'amount' as calories,
                   nutrition_summary->'macros'->'protein'->'amount' as protein
            FROM recipe
            ORDER BY created_at DESC
            LIMIT 10
        """)

        logger.info("\nRecently imported recipes:")
        logger.info("-" * 60)
        for row in cursor.fetchall():
            logger.info(f"  {row[0][:40]:<40} | {row[1]:>3}min | {row[2]:<6} | {row[3]:>4} kcal | {row[4]:>3}g protein")

    finally:
        conn.close()
        logger.info("Database connection closed")


if __name__ == "__main__":
    main()
