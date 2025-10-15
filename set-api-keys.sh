#!/bin/bash

# API Keys Configuration for CameraFirst-Fitness
# Run this before starting the application: source ./set-api-keys.sh

echo "🔑 Configuring API Keys..."

# YouTube Data API v3
export YOUTUBE_API_KEY="AIzaSyCvugM8by8scvZcdLbGR9owMLt1HUTfPyY"

# Spoonacular Recipe API
export SPOONACULAR_API_KEY="c06acb6339d6428aa8715889da7ce962"

echo "✅ API Keys configured!"
echo ""
echo "YouTube API Key: ${YOUTUBE_API_KEY:0:20}..."
echo "Spoonacular API Key: ${SPOONACULAR_API_KEY:0:20}..."
echo ""
echo "💡 To use these keys, run:"
echo "   source ./set-api-keys.sh"
echo "   ./gradlew bootRun"
