#!/bin/bash

# Import Diverse Workout Videos - Using Curated Searches
# This script uses YouTube search API to find videos covering all major muscle groups

set -e

echo "🏋️ Starting Diverse Workout Import..."
echo "Target: Import videos for all major muscle groups using curated searches"
echo ""

API_BASE="http://localhost:8080/api"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check current workout count
check_count() {
    echo "Checking current workout count..."
    docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "SELECT COUNT(*) FROM workout_video;" 2>/dev/null | grep -E '^\s*[0-9]+' | tr -d ' '
}

# Function to import curated videos (uses search queries)
import_curated_videos() {
    echo -e "${YELLOW}📥 Importing curated workout videos using YouTube Search API${NC}"
    echo "   This will search for videos covering:"
    echo "   - Chest workouts"
    echo "   - Shoulder workouts"
    echo "   - Arm workouts (biceps & triceps)"
    echo "   - Leg workouts"
    echo "   - Glute workouts"
    echo "   - Abs/core workouts"
    echo "   - Back workouts"
    echo "   - Full body stretches"
    echo ""
    
    response=$(curl -s -X POST "$API_BASE/admin/import/videos/curated" -H "Content-Type: application/json")
    
    echo "Response: $response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# Function to show body part distribution
show_body_part_stats() {
    echo "═══════════════════════════════════════"
    echo "📊 Workout Distribution by Body Parts:"
    echo "═══════════════════════════════════════"
    docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c "
        SELECT body_part, COUNT(*) as count 
        FROM workout_video 
        GROUP BY body_part 
        ORDER BY count DESC;
    " 2>/dev/null
}

# Start import
echo "═══════════════════════════════════════"
echo "🔍 Pre-Import Status"
echo "═══════════════════════════════════════"
before_count=$(check_count)
echo "Current workout count: $before_count"
echo ""

echo "═══════════════════════════════════════"
echo "🚀 Starting Import"
echo "═══════════════════════════════════════"
import_curated_videos

echo "═══════════════════════════════════════"
echo "✅ Post-Import Status"
echo "═══════════════════════════════════════"
after_count=$(check_count)
echo "New workout count: $after_count"
new_workouts=$((after_count - before_count))
echo -e "${GREEN}📈 Added $new_workouts new workouts!${NC}"
echo ""

show_body_part_stats

echo ""
echo "═══════════════════════════════════════"
echo "🎉 Workout Import Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Coverage includes:"
echo "  💪 Upper body: chest, shoulders, arms (biceps & triceps), back"
echo "  🦵 Lower body: legs, glutes, thighs"
echo "  🔥 Core: abs, obliques, balance"
echo "  🏃 Cardio: HIIT, full body bursts"
echo "  🧘 Mobility: stretches, flexibility"
echo ""
