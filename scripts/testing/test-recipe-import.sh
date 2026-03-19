#!/bin/bash

# Recipe Import Test Script
# This script tests the recipe import functionality after API quota reset

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/infrastructure/docker-compose.yml"
dc() {
    docker compose -f "$COMPOSE_FILE" "$@"
}

echo "🍽️  Testing Recipe Import..."
echo "================================"
echo ""

# Check if app is running
echo "📡 Checking application health..."
HEALTH=$(curl -s http://localhost:8080/actuator/health | jq -r '.status' 2>/dev/null)

if [ "$HEALTH" != "UP" ]; then
    echo "❌ Application is not running or not healthy"
    echo "Please start the application first with: ./start-app.sh"
    exit 1
fi

echo "✅ Application is healthy"
echo ""

# Check current recipe count
echo "📊 Current recipe count in database:"
dc exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) as recipe_count FROM recipe;" 2>/dev/null
echo ""

# Execute recipe import
echo "🚀 Starting recipe import..."
echo "This may take 30-60 seconds depending on API response time..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/admin/import/recipes/curated")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Import completed successfully!"
    echo ""
    echo "📈 Import Results:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    # Check updated recipe count
    echo "📊 Updated recipe count:"
    dc exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) as recipe_count FROM recipe;" 2>/dev/null
    echo ""
    
    # Show recipe distribution by ingredient
    echo "📊 Recipe distribution by primary ingredient:"
    dc exec -T postgres psql -U fitnessuser -d fitness_mvp -c "
        SELECT 
            COALESCE(nutrition_summary->>'primaryIngredient', 'unknown') as ingredient,
            COUNT(*) as count
        FROM recipe 
        GROUP BY nutrition_summary->>'primaryIngredient'
        ORDER BY count DESC;
    " 2>/dev/null
    
else
    echo "❌ Import failed with HTTP $HTTP_CODE"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
    if echo "$BODY" | grep -q "402"; then
        echo ""
        echo "💳 API quota exceeded. Please wait for quota reset."
    fi
fi

echo ""
echo "================================"
echo "Test completed at $(date)"
