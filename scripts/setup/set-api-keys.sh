#!/bin/bash

# API Keys Configuration for CameraFirst-Fitness
# Run this before starting the application: source ./set-api-keys.sh
#
# IMPORTANT: Do NOT hardcode API keys in this file!
# Instead, create a .env.local file (which is gitignored) with your keys.

echo "🔑 Loading API Keys..."

# Try to load from .env.local if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo "📁 Loading from .env.local..."
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
elif [ -f "$PROJECT_ROOT/.env" ]; then
    echo "📁 Loading from .env..."
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Validate required keys
if [ -z "$YOUTUBE_API_KEY" ]; then
    echo "❌ YOUTUBE_API_KEY is not set!"
    echo ""
    echo "Please create a .env.local file with:"
    echo "   YOUTUBE_API_KEY=your_youtube_api_key"
    echo "   SPOONACULAR_API_KEY=your_spoonacular_api_key"
    return 1 2>/dev/null || exit 1
fi

if [ -z "$SPOONACULAR_API_KEY" ]; then
    echo "❌ SPOONACULAR_API_KEY is not set!"
    return 1 2>/dev/null || exit 1
fi

echo "✅ API Keys configured!"
echo ""
echo "YouTube API Key: ${YOUTUBE_API_KEY:0:10}..."
echo "Spoonacular API Key: ${SPOONACULAR_API_KEY:0:10}..."
echo ""
echo "💡 To use these keys, run:"
echo "   source ./set-api-keys.sh"
echo "   ./gradlew bootRun"
