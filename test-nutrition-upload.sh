#!/bin/bash
# Integration test script for nutrition photo upload feature
# This script tests the full flow of uploading a food photo and getting nutrition data

set -e

echo "==================================================================="
echo "Nutrition Photo Upload Integration Test"
echo "==================================================================="
echo ""

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
API_KEY="${API_KEY:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

# Check prerequisites
echo "1. Checking prerequisites..."

if [ -z "$GEMINI_API_KEY" ]; then
    echo "   ⚠️  GEMINI_API_KEY not set. Food recognition will not work."
    echo "   Please set: export GEMINI_API_KEY=your_api_key"
else
    echo "   ✓ GEMINI_API_KEY is set"
fi

if [ -z "$API_KEY" ]; then
    echo "   ⚠️  API_KEY not set. Using default (may fail in production)."
else
    echo "   ✓ API_KEY is set"
fi

echo ""

# Check if backend is running
echo "2. Checking if backend is running at $BACKEND_URL..."
if curl -s -f "$BACKEND_URL/actuator/health" > /dev/null 2>&1; then
    echo "   ✓ Backend is running"
else
    echo "   ✗ Backend is not responding at $BACKEND_URL"
    echo "   Please start the backend: cd backend && ./gradlew bootRun"
    exit 1
fi

echo ""

# Create a test image (simple 1x1 pixel JPEG)
echo "3. Creating test image..."
TEST_IMAGE="/tmp/test-food.jpg"

# Create a minimal valid JPEG file
printf '\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c\x20\x24\x2e\x27\x20\x22\x2c\x23\x1c\x1c\x28\x37\x29\x2c\x30\x31\x34\x34\x34\x1f\x27\x39\x3d\x38\x32\x3c\x2e\x33\x34\x32\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00\x3f\x00\x00\xff\xd9' > "$TEST_IMAGE"

if [ -f "$TEST_IMAGE" ]; then
    echo "   ✓ Test image created at $TEST_IMAGE"
else
    echo "   ✗ Failed to create test image"
    exit 1
fi

echo ""

# Test the nutrition analyze endpoint
echo "4. Testing /api/v1/nutrition/analyze endpoint..."
echo "   Sending POST request with image..."

RESPONSE_FILE="/tmp/nutrition-response.json"

if [ -n "$API_KEY" ]; then
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST \
        "$BACKEND_URL/api/v1/nutrition/analyze" \
        -H "X-API-Key: $API_KEY" \
        -F "image=@$TEST_IMAGE" \
        -o "$RESPONSE_FILE")
else
    HTTP_CODE=$(curl -s -w "%{http_code}" -X POST \
        "$BACKEND_URL/api/v1/nutrition/analyze" \
        -F "image=@$TEST_IMAGE" \
        -o "$RESPONSE_FILE")
fi

echo ""
echo "   HTTP Status Code: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✓ Request successful (200 OK)"
    echo ""
    echo "   Response:"
    cat "$RESPONSE_FILE" | python3 -m json.tool 2>/dev/null || cat "$RESPONSE_FILE"
    echo ""
    
    # Validate response structure
    echo "5. Validating response structure..."
    
    if command -v jq &> /dev/null; then
        # Check for required fields using jq
        HAS_ITEMS=$(cat "$RESPONSE_FILE" | jq 'has("items")' 2>/dev/null)
        HAS_TOTAL=$(cat "$RESPONSE_FILE" | jq 'has("totalNutrition")' 2>/dev/null)
        
        if [ "$HAS_ITEMS" = "true" ] && [ "$HAS_TOTAL" = "true" ]; then
            echo "   ✓ Response has 'items' and 'totalNutrition' fields"
            
            CALORIES=$(cat "$RESPONSE_FILE" | jq '.totalNutrition.calories' 2>/dev/null)
            PROTEIN=$(cat "$RESPONSE_FILE" | jq '.totalNutrition.protein' 2>/dev/null)
            FAT=$(cat "$RESPONSE_FILE" | jq '.totalNutrition.fat' 2>/dev/null)
            CARBS=$(cat "$RESPONSE_FILE" | jq '.totalNutrition.carbs' 2>/dev/null)
            
            echo "   ✓ Total Nutrition:"
            echo "      - Calories: $CALORIES"
            echo "      - Protein:  $PROTEIN g"
            echo "      - Fat:      $FAT g"
            echo "      - Carbs:    $CARBS g"
            
            ITEMS_COUNT=$(cat "$RESPONSE_FILE" | jq '.items | length' 2>/dev/null)
            echo "   ✓ Detected $ITEMS_COUNT food items"
        else
            echo "   ✗ Response missing required fields"
        fi
    else
        echo "   (jq not installed, skipping detailed validation)"
    fi
    
    echo ""
    echo "==================================================================="
    echo "✓ Integration test PASSED"
    echo "==================================================================="
    
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "   ✗ Bad Request (400)"
    echo "   Response:"
    cat "$RESPONSE_FILE"
    echo ""
    echo "   This might be because:"
    echo "   - The test image is too simple/invalid"
    echo "   - Missing required parameters"
    echo ""
    exit 1
    
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "   ✗ Unauthorized (401)"
    echo "   Response:"
    cat "$RESPONSE_FILE"
    echo ""
    echo "   Please provide a valid API_KEY:"
    echo "   export API_KEY=your_api_key"
    echo ""
    exit 1
    
elif [ "$HTTP_CODE" -eq 500 ]; then
    echo "   ✗ Internal Server Error (500)"
    echo "   Response:"
    cat "$RESPONSE_FILE"
    echo ""
    echo "   This might be because:"
    echo "   - GEMINI_API_KEY is not configured on the server"
    echo "   - Gemini API returned an error"
    echo "   - Database connection issues"
    echo ""
    echo "   Check server logs for more details"
    exit 1
    
else
    echo "   ✗ Unexpected status code: $HTTP_CODE"
    echo "   Response:"
    cat "$RESPONSE_FILE"
    echo ""
    exit 1
fi

# Cleanup
rm -f "$TEST_IMAGE" "$RESPONSE_FILE"

echo ""
echo "Test completed successfully!"
