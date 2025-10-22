#!/bin/bash

# Import Diverse Recipes - Targeting Different Proteins, Vegetables, and Cuisines
# This script imports recipes with varied ingredients for better coverage

set -e

echo "🍳 Starting Diverse Recipe Import..."
echo "Target: Import recipes with diverse proteins, vegetables, and cooking styles"
echo ""

API_BASE="http://localhost:8080/api"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check current recipe count
check_count() {
    echo "Checking current recipe count..."
    docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;" | grep -E '^\s*[0-9]+' | tr -d ' '
}

# Function to import recipes
import_recipes() {
    echo -e "${YELLOW}📥 Importing curated recipes from Spoonacular API${NC}"
    echo "   This will import ~90 recipes with diverse ingredients"
    echo "   Coverage: chicken, beef, salmon, tofu, pasta, eggs, vegetables, legumes, etc."
    echo ""
    
    response=$(curl -s -X POST "$API_BASE/admin/import/recipes/curated" -H "Content-Type: application/json")
    
    curated=$(echo "$response" | jq -r '.curated // 0')
    skipped=$(echo "$response" | jq -r '.skipped // 0')
    rejected=$(echo "$response" | jq -r '.rejected // 0')
    
    if [ "$curated" -gt 0 ]; then
        echo -e "${GREEN}✅ Successfully imported $curated recipes${NC}"
        echo "   (Skipped: $skipped duplicates, Rejected: $rejected low-quality)"
    else
        echo -e "${RED}❌ Failed to import recipes${NC}"
        echo "   Error: $response"
    fi
    echo ""
}

# Function to show ingredient distribution
show_ingredient_stats() {
    echo "═══════════════════════════════════════"
    echo "📊 Top 30 Ingredients in Database:"
    echo "═══════════════════════════════════════"
    docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "
        SELECT i.name, COUNT(*) as recipe_count 
        FROM ingredient i 
        JOIN recipe_ingredient ri ON i.id = ri.ingredient_id 
        GROUP BY i.name 
        ORDER BY recipe_count DESC 
        LIMIT 30;
    "
}

# Start import
echo "═══════════════════════════════════════"
echo "🔍 Pre-Import Status"
echo "═══════════════════════════════════════"
before_count=$(check_count)
echo "Current recipe count: $before_count"
echo ""

echo "═══════════════════════════════════════"
echo "🚀 Starting Import"
echo "═══════════════════════════════════════"
import_recipes

echo "═══════════════════════════════════════"
echo "✅ Post-Import Status"
echo "═══════════════════════════════════════"
after_count=$(check_count)
echo "New recipe count: $after_count"
new_recipes=$((after_count - before_count))
echo -e "${GREEN}📈 Added $new_recipes new recipes!${NC}"
echo ""

show_ingredient_stats

echo ""
echo "═══════════════════════════════════════"
echo "🎉 Recipe Import Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Diversity coverage includes:"
echo "  🍗 Proteins: chicken, beef, salmon, tofu, turkey, shrimp, pork, cod, tuna"
echo "  🥗 Vegetables: broccoli, spinach, kale, bell pepper, zucchini, cauliflower"
echo "  🌾 Grains: rice, quinoa, pasta, oats"
echo "  🫘 Legumes: lentils, black beans, chickpeas"
echo "  🥑 Healthy fats: avocado, greek yogurt"
echo ""
