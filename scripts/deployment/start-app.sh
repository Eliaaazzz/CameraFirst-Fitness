#!/bin/bash

# CameraFirst Fitness - Application Startup Script
# 2025-10-17

set -e

echo "🚀 Starting CameraFirst Fitness Application..."
echo ""

# Step 1: Stop any existing Java processes
echo "1️⃣ Stopping existing Java processes..."
pkill -9 java 2>/dev/null || true
sleep 2
echo "✅ Cleaned up old processes"
echo ""

# Step 2: Start Docker containers
echo "2️⃣ Starting Docker containers (PostgreSQL & Redis)..."
docker compose up -d postgres redis
sleep 3
echo "✅ Containers started"
echo ""

# Step 3: Verify database connection
echo "3️⃣ Verifying database connection..."
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi
echo ""

# Step 4: Check current data counts
echo "4️⃣ Checking current data counts..."
echo "📊 Recipes:"
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) as recipe_count FROM recipe;" 2>/dev/null | grep -A1 "recipe_count" | tail -1
echo ""
echo "📹 Videos:"
docker compose exec -T postgres psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) as video_count FROM workout_video;" 2>/dev/null | grep -A1 "video_count" | tail -1
echo ""

# Step 5: Check API keys from environment
echo "5️⃣ Checking API keys..."
if [ -z "$SPOONACULAR_API_KEY" ] || [ -z "$YOUTUBE_API_KEY" ]; then
    echo "⚠️  API keys not found in environment!"
    echo "   Please set the following environment variables:"
    echo "   export SPOONACULAR_API_KEY=your_key"
    echo "   export YOUTUBE_API_KEY=your_key"
    echo ""
    echo "   Or create a .env file in the project root."
    exit 1
fi
echo "✅ API keys configured"
echo ""

# Step 6: Clean build
echo "6️⃣ Running clean build..."
./gradlew clean > /dev/null 2>&1
echo "✅ Clean completed"
echo ""

# Step 7: Start Spring Boot application
echo "7️⃣ Starting Spring Boot application..."
echo "📝 Logs will be written to: /tmp/fitness-app.log"
echo ""

./gradlew bootRun > /tmp/fitness-app.log 2>&1 &
BOOT_PID=$!
echo "🔄 Application started with PID: $BOOT_PID"
echo ""

# Step 8: Wait for application to be ready
echo "8️⃣ Waiting for application to be ready..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
        echo "✅ Application is ready!"
        break
    fi
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ Application failed to start within ${MAX_WAIT} seconds"
    echo "📝 Check logs: tail -f /tmp/fitness-app.log"
    exit 1
fi

# Step 9: Verify health
echo ""
echo "9️⃣ Verifying application health..."
HEALTH_STATUS=$(curl -s http://localhost:8080/actuator/health | jq -r '.status' 2>/dev/null || echo "UNKNOWN")
if [ "$HEALTH_STATUS" = "UP" ]; then
    echo "✅ Health check passed: $HEALTH_STATUS"
else
    echo "⚠️  Health check returned: $HEALTH_STATUS"
fi
echo ""

# Final status
echo "═══════════════════════════════════════════════════"
echo "✨ Application is running!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📍 Health:    http://localhost:8080/actuator/health"
echo "📍 API Docs:  http://localhost:8080/swagger-ui.html"
echo "📍 Admin API: http://localhost:8080/api/admin"
echo ""
echo "📝 View logs: tail -f /tmp/fitness-app.log"
echo "🛑 Stop app:  pkill -f 'gradlew bootRun'"
echo ""
echo "🔑 API Keys:"
echo "   SPOONACULAR_API_KEY: ${SPOONACULAR_API_KEY:0:20}..."
echo "   YOUTUBE_API_KEY:     ${YOUTUBE_API_KEY:0:20}..."
echo ""
echo "Next steps:"
echo "  1. Run: ./test-import.sh"
echo "  2. Or manually test imports (see test-import.sh for commands)"
echo ""
