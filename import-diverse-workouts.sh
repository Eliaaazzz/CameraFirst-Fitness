#!/bin/bash

# Import Diverse Workout Videos - Targeting Different Body Parts
# This script imports workouts covering: legs, shoulders, arms, chest, abs, back, glutes

set -e

echo "🏋️ Starting Diverse Workout Import..."
echo "Target: Import videos for all major muscle groups"
echo ""

API_BASE="http://localhost:8080/api"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to import a playlist
import_playlist() {
    local name=$1
    local playlist_id=$2
    local equipment=$3
    local level=$4
    local body_parts=$5
    local count=$6
    
    echo -e "${YELLOW}📥 Importing: $name${NC}"
    echo "   Playlist ID: $playlist_id"
    echo "   Equipment: $equipment | Level: $level"
    echo "   Body Parts: $body_parts"
    
    response=$(curl -s -X POST "$API_BASE/admin/import/playlist" \
        -H "Content-Type: application/json" \
        -d "{
            \"playlistId\": \"$playlist_id\",
            \"equipment\": \"$equipment\",
            \"level\": \"$level\",
            \"bodyParts\": $body_parts,
            \"targetCount\": $count
        }")
    
    saved=$(echo "$response" | jq -r '.saved // 0')
    rejected=$(echo "$response" | jq -r '.rejected // 0')
    
    if [ "$saved" -gt 0 ]; then
        echo -e "${GREEN}✅ Imported $saved videos ($rejected rejected)${NC}"
    else
        echo -e "${RED}❌ Failed to import ($rejected rejected)${NC}"
    fi
    echo ""
}

# LEGS WORKOUTS
echo "═══════════════════════════════════════"
echo "🦵 LEGS WORKOUTS"
echo "═══════════════════════════════════════"

# MadFit - Lower Body 5min
import_playlist \
    "MadFit Lower Body 5min" \
    "PLhu1QCKrfgPX_ygZ9sQYH-K8S8RkYQNMr" \
    "bodyweight" \
    "beginner" \
    "[\"lower_body\", \"legs\", \"glutes\"]" \
    15

# Blogilates - Leg Workouts
import_playlist \
    "Blogilates Leg Workouts" \
    "PL2F80D9E374C45E52" \
    "bodyweight" \
    "intermediate" \
    "[\"lower_body\", \"legs\", \"thighs\"]" \
    12

# SHOULDERS WORKOUTS
echo "═══════════════════════════════════════"
echo "💪 SHOULDERS WORKOUTS"
echo "═══════════════════════════════════════"

# MadFit - Arms & Shoulders 5min
import_playlist \
    "MadFit Arms Shoulders 5min" \
    "PLhu1QCKrfgPVGpOqR89sX2oY47l2KVYhO" \
    "dumbbells" \
    "intermediate" \
    "[\"upper_body\", \"shoulders\", \"arms\"]" \
    15

# CHEST WORKOUTS
echo "═══════════════════════════════════════"
echo "💪 CHEST WORKOUTS"
echo "═══════════════════════════════════════"

# Look for chest-focused playlists (using search as backup)
echo "Note: Chest workouts will be imported via search in next script"

# ARMS WORKOUTS
echo "═══════════════════════════════════════"
echo "💪 ARMS WORKOUTS (Biceps & Triceps)"
echo "═══════════════════════════════════════"

# Chloe Ting - Arm Workouts
import_playlist \
    "Chloe Ting Arm Workouts" \
    "PLyP2v7JMa5JTc6Uz3BxQPBmv-3c5YN6LI" \
    "dumbbells" \
    "beginner" \
    "[\"upper_body\", \"arms\", \"biceps\", \"triceps\"]" \
    12

# ABS/CORE WORKOUTS
echo "═══════════════════════════════════════"
echo "🔥 ABS & CORE WORKOUTS"
echo "═══════════════════════════════════════"

# MadFit - Quick Core 5min
import_playlist \
    "MadFit Quick Core 5min" \
    "PLhu1QCKrfgPWlhRHrJW7n16dxcam-oYfE" \
    "bodyweight" \
    "beginner" \
    "[\"core\", \"abs\"]" \
    15

# MadFit - Standing Abs 5min
import_playlist \
    "MadFit Standing Abs 5min" \
    "PLhu1QCKrfgPVrfPHWpVQDqQdyZ5YhDg4W" \
    "bodyweight" \
    "beginner" \
    "[\"core\", \"abs\", \"balance\"]" \
    15

# Blogilates - Pilates Core
import_playlist \
    "Blogilates Pilates Core" \
    "PL6F8AF6B2F2E56F47" \
    "mat" \
    "beginner" \
    "[\"core\", \"abs\", \"pilates\"]" \
    12

# BACK WORKOUTS
echo "═══════════════════════════════════════"
echo "💪 BACK WORKOUTS"
echo "═══════════════════════════════════════"

# MadFit - Back Workouts
import_playlist \
    "MadFit Back Workouts" \
    "PLhu1QCKrfgPWN19WxKvAuTXLPaEOGh9jf" \
    "dumbbells" \
    "intermediate" \
    "[\"upper_body\", \"back\", \"lats\"]" \
    12

# GLUTES WORKOUTS
echo "═══════════════════════════════════════"
echo "🍑 GLUTES WORKOUTS"
echo "═══════════════════════════════════════"

# Blogilates - Booty Workouts
import_playlist \
    "Blogilates Booty Workouts" \
    "PLE40273AE1E0D06C4" \
    "bodyweight" \
    "intermediate" \
    "[\"lower_body\", \"glutes\", \"booty\"]" \
    15

# FULL BODY & CARDIO
echo "═══════════════════════════════════════"
echo "🔥 FULL BODY & CARDIO"
echo "═══════════════════════════════════════"

# MadFit - Cardio Bursts 5min
import_playlist \
    "MadFit Cardio Bursts 5min" \
    "PLhu1QCKrfgPUWL3FAVjy2Pzs5v9d_7cKJ" \
    "bodyweight" \
    "intermediate" \
    "[\"cardio\", \"full_body\"]" \
    12

# Chloe Ting - HIIT Workouts
import_playlist \
    "Chloe Ting HIIT Workouts" \
    "PLyP2v7JMa5JSi7v_DqS2qT9jVKLMJxQJF" \
    "bodyweight" \
    "advanced" \
    "[\"cardio\", \"full_body\", \"hiit\"]" \
    10

echo ""
echo "═══════════════════════════════════════"
echo "📊 Import Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Run this command to check the new distribution:"
echo "docker exec -i camerafirst-fitness-postgres-1 psql -U fitnessuser -d fitness_mvp -c \"SELECT body_part, COUNT(*) as count FROM workout_video GROUP BY body_part ORDER BY count DESC;\""
echo ""
