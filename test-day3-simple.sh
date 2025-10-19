#!/bin/bash

echo "=================================================="
echo "🧪 Day 3 Simple Test - Workout Retrieval Only"
echo "=================================================="
echo ""

# Test with raw SQL query first to verify database connection
echo "📊 Step 1: Direct Database Query Test"
echo "Query: SELECT COUNT(*) FROM workout_video;"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM workout_video;"
echo ""

echo "📊 Step 2: Check equipment types in database"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT DISTINCT unnest(equipment) FROM workout_video;"
echo ""

echo "📊 Step 3: Test workout query with dumbbells"
docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT title, duration_minutes, level, equipment FROM workout_video WHERE 'dumbbells' = ANY(equipment) LIMIT 5;"
echo ""

echo "📊 Step 4: Check application health"
HEALTH=$(curl -s http://localhost:8080/actuator/health)
echo "Health check: $HEALTH"
echo ""

if echo "$HEALTH" | grep -q '"status":"UP"'; then
    echo "✅ Application is UP"
    echo ""
    
    echo "📊 Step 5: Test /api/v1/workouts/from-image endpoint"
    curl -v -X POST http://localhost:8080/api/v1/workouts/from-image \
      -F "metadata={\"equipment\":\"dumbbells\",\"level\":\"beginner\",\"durationMinutes\":20};type=application/json" \
      2>&1 | head -100
else
    echo "❌ Application is NOT UP"
    echo ""
    echo "Last 50 lines of application log:"
    tail -50 /tmp/fitness-direct.log
fi
