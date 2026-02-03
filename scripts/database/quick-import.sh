#!/bin/bash

echo "🚀 Quick Recipe Import Script"
echo "================================"

# Load API keys from environment or .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
    set -a; source "$PROJECT_ROOT/.env.local"; set +a
elif [ -f "$PROJECT_ROOT/.env" ]; then
    set -a; source "$PROJECT_ROOT/.env"; set +a
fi

# Validate API keys
if [ -z "$SPOONACULAR_API_KEY" ] || [ -z "$YOUTUBE_API_KEY" ]; then
    echo "❌ API keys not configured!"
    echo "   Please set SPOONACULAR_API_KEY and YOUTUBE_API_KEY in .env.local"
    exit 1
fi

# Stop any existing processes
echo "1️⃣ Stopping existing Java processes..."
pkill -f 'java.*FitnessApp|gradle' 2>/dev/null
sleep 3

# Start Docker if not running
echo "2️⃣ Checking Docker containers..."
docker compose up -d postgres redis
sleep 5

# Start the application in background with API keys
echo "3️⃣ Starting application with API keys..."
./gradlew bootRun > /tmp/fitness-app.log 2>&1 &
BOOT_PID=$!
echo "Application starting (PID: $BOOT_PID)..."

# Wait for application to be ready
echo "4️⃣ Waiting for application to start (this may take 60 seconds)..."
for i in {1..30}; do
    if curl -s http://localhost:8080/actuator/health | grep -q "UP"; then
        echo "✅ Application is ready!"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Check current recipe count
echo "5️⃣ Current recipe count:"
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"

# Execute import
echo "6️⃣ Starting recipe import..."
curl -X POST "http://localhost:8080/api/admin/import/recipes/curated"
echo ""

# Wait a bit for import to complete
echo "7️⃣ Waiting for import to complete (30 seconds)..."
sleep 30

# Check final recipe count
echo "8️⃣ Final recipe count:"
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM recipe;"

# Show distribution
echo "9️⃣ Recipe distribution by ingredient:"
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COALESCE(nutrition_summary->>'primaryIngredient', 'unknown') as ingredient, COUNT(*) FROM recipe GROUP BY ingredient ORDER BY count DESC;"

echo "✅ Import complete! Check the logs at /tmp/fitness-app.log for details."
