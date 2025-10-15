#!/bin/bash

echo "🧪 Testing CameraFirst-Fitness API Endpoints"
echo "=============================================="
echo ""

# Test 1: Workout Retrieval
echo "📋 Test 1: GET Workouts from Image"
echo "curl -X POST http://localhost:8080/api/v1/workouts/from-image"
curl -s -X POST http://localhost:8080/api/v1/workouts/from-image -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 2: Recipe Retrieval
echo "🍳 Test 2: GET Recipes from Image"
echo "curl -X POST http://localhost:8080/api/v1/recipes/from-image"
curl -s -X POST http://localhost:8080/api/v1/recipes/from-image -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 3: Health Check
echo "❤️  Test 3: Health Check"
echo "curl http://localhost:8080/actuator/health"
curl -s http://localhost:8080/actuator/health | jq '.'
echo ""
echo ""

echo "✅ All tests completed!"
