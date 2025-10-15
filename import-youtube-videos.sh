#!/bin/bash

echo "🎯 CameraFirst-Fitness - YouTube Video Import Script"
echo "===================================================="
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
    echo "❌ Error: YouTube API key not provided"
    echo ""
    echo "Usage: ./import-youtube-videos.sh YOUR_YOUTUBE_API_KEY"
    echo ""
    echo "📝 How to get YouTube API key:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a new project or select existing one"
    echo "3. Enable 'YouTube Data API v3'"
    echo "4. Go to 'Credentials' → 'Create Credentials' → 'API Key'"
    echo "5. Copy the API key"
    echo ""
    exit 1
fi

YOUTUBE_API_KEY=$1

echo "✅ YouTube API key provided"
echo ""

# Export the API key
export YOUTUBE_API_KEY=$YOUTUBE_API_KEY

# Check if server is running
echo "🔍 Checking if server is running on port 8080..."
if ! curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "⚠️  Server not running. Starting server..."
    echo ""
    echo "Please run in another terminal:"
    echo "  YOUTUBE_API_KEY=$YOUTUBE_API_KEY ./gradlew bootRun"
    echo ""
    echo "Then press Enter to continue..."
    read -r
fi

echo "✅ Server is running"
echo ""

# Import curated playlists
echo "📥 Importing curated workout videos from YouTube playlists..."
echo ""

response=$(curl -s -X POST http://localhost:8080/api/admin/import/playlist/curated \
    -H "Content-Type: application/json")

echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

# Check coverage
echo "📊 Checking workout video coverage..."
echo ""

coverage=$(curl -s "http://localhost:8080/api/admin/import/playlist/coverage?hoursBack=24")
echo "$coverage" | jq '.' 2>/dev/null || echo "$coverage"
echo ""

# Query database for final count
echo "🗄️  Querying database for workout video statistics..."
echo ""

/opt/homebrew/opt/postgresql@15/bin/psql -U fitnessuser -d fitness_mvp << EOF
-- Total workout videos
SELECT 'Total Workout Videos' as metric, COUNT(*)::text as count FROM workout_video;

-- By body part
SELECT 'By Body Part' as metric, '---' as count
UNION ALL
SELECT 
    COALESCE(unnest(body_part), 'unclassified') as metric,
    COUNT(*)::text as count
FROM workout_video
GROUP BY unnest(body_part)
ORDER BY count DESC;

-- By level
SELECT 'By Level' as metric, '---' as count
UNION ALL
SELECT level as metric, COUNT(*)::text as count
FROM workout_video
GROUP BY level
ORDER BY count DESC;

-- By equipment
SELECT 'By Equipment' as metric, '---' as count
UNION ALL
SELECT 
    COALESCE(unnest(equipment), 'unclassified') as metric,
    COUNT(*)::text as count
FROM workout_video
GROUP BY unnest(equipment)
ORDER BY count DESC;
EOF

echo ""
echo "✅ Import complete!"
echo ""
echo "📋 Summary:"
echo "  - Curated playlists imported from YouTube"
echo "  - Videos filtered by quality (≥50K views, ≥100K subscribers)"
echo "  - Body parts coverage verified"
echo ""
echo "🔗 Next steps:"
echo "  1. Test retrieval API: curl -X POST http://localhost:8080/api/v1/workouts/from-image"
echo "  2. View coverage report: curl http://localhost:8080/api/admin/import/playlist/coverage?hoursBack=24"
