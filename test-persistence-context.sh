#!/bin/bash

echo "=========================================="
echo "🔍 Persistence Context vs Database Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "Step 1: Check PostgreSQL database directly"
echo "-------------------------------------------"
echo -e "${BLUE}Running: SELECT COUNT(*) FROM recipe${NC}"
POSTGRES_RECIPE_COUNT=$(docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM recipe;" | tr -d ' ')
echo -e "${GREEN}PostgreSQL recipe count: $POSTGRES_RECIPE_COUNT${NC}"

echo ""
echo -e "${BLUE}Running: SELECT COUNT(*) FROM workout_video${NC}"
POSTGRES_WORKOUT_COUNT=$(docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -t -c "SELECT COUNT(*) FROM workout_video;" | tr -d ' ')
echo -e "${GREEN}PostgreSQL workout_video count: $POSTGRES_WORKOUT_COUNT${NC}"

echo ""
echo "Step 2: Check application health"
echo "-------------------------------------------"
HEALTH=$(curl -s http://localhost:8080/actuator/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"UP"'; then
    echo -e "${GREEN}✅ Application is UP${NC}"
else
    echo -e "${RED}❌ Application is NOT running${NC}"
    echo ""
    echo "Please start the application first:"
    echo "  export SPOONACULAR_API_KEY=\"c06acb6339d6428aa8715889da7ce962\""
    echo "  export YOUTUBE_API_KEY=\"AIzaSyCvugM8by8scvZcdLbGR9owMLt1HUTfPyY\""
    echo "  java -jar build/libs/fitness-app-0.0.1-SNAPSHOT.jar"
    exit 1
fi

echo ""
echo "Step 3: Test RecipeRepository.count() via endpoint"
echo "-------------------------------------------"
echo -e "${BLUE}Creating test endpoint to check Hibernate count...${NC}"

# Create a simple test by trying to retrieve recipes
echo "Testing recipe endpoint (will return empty array if count=0):"
RECIPE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/recipes/from-image \
  -F "metadata={\"ingredients\":[\"chicken\"]};type=application/json" 2>/dev/null)

if echo "$RECIPE_RESPONSE" | grep -q '"recipes"'; then
    RECIPE_COUNT=$(echo "$RECIPE_RESPONSE" | grep -o '"recipes":\[[^]]*\]' | grep -o '"title"' | wc -l | tr -d ' ')
    echo -e "${GREEN}API returned $RECIPE_COUNT recipes${NC}"
    echo "Response preview:"
    echo "$RECIPE_RESPONSE" | python3 -m json.tool 2>/dev/null | head -20
else
    echo -e "${RED}API error or unexpected response${NC}"
    echo "Response:"
    echo "$RECIPE_RESPONSE" | head -20
fi

echo ""
echo "Step 4: Test WorkoutRepository access"
echo "-------------------------------------------"
echo "Testing workout endpoint:"
WORKOUT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/workouts/from-image \
  -F "metadata={\"equipment\":\"dumbbells\",\"level\":\"beginner\",\"durationMinutes\":20};type=application/json" 2>/dev/null)

if echo "$WORKOUT_RESPONSE" | grep -q '"workouts"'; then
    WORKOUT_COUNT=$(echo "$WORKOUT_RESPONSE" | grep -o '"workouts":\[[^]]*\]' | grep -o '"title"' | wc -l | tr -d ' ')
    echo -e "${GREEN}API returned $WORKOUT_COUNT workouts${NC}"
    echo "Response preview:"
    echo "$WORKOUT_RESPONSE" | python3 -m json.tool 2>/dev/null | head -30
else
    echo -e "${RED}API error or unexpected response${NC}"
    echo "Response:"
    echo "$WORKOUT_RESPONSE" | head -20
fi

echo ""
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
echo ""
echo -e "${BLUE}Database (PostgreSQL direct):${NC}"
echo "  - Recipes: $POSTGRES_RECIPE_COUNT"
echo "  - Workouts: $POSTGRES_WORKOUT_COUNT"
echo ""
echo -e "${BLUE}Application (Hibernate/JPA):${NC}"
echo "  - Recipes returned: ${RECIPE_COUNT:-N/A}"
echo "  - Workouts returned: ${WORKOUT_COUNT:-N/A}"
echo ""

if [ "$POSTGRES_WORKOUT_COUNT" -gt 0 ] && [ "${WORKOUT_COUNT:-0}" -eq 0 ]; then
    echo -e "${RED}⚠️  MISMATCH DETECTED!${NC}"
    echo "   PostgreSQL has $POSTGRES_WORKOUT_COUNT workouts, but API returned ${WORKOUT_COUNT:-0}"
    echo ""
    echo "Possible causes:"
    echo "  1. Hibernate persistence context is out of sync"
    echo "  2. Transaction isolation issue"
    echo "  3. Schema mismatch (Hibernate looking at wrong schema)"
    echo "  4. Connection pool pointing to different database"
else
    echo -e "${GREEN}✅ Data access appears consistent${NC}"
fi

echo ""
