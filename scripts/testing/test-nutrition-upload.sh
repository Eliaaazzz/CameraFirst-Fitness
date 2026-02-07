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

# Create a minimal valid JPEG file (1x1 red pixel)
# Using base64 for better readability and maintainability
cat > "$TEST_IMAGE.b64" << 'EOF'
/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB
AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEB
AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIA
AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA
AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3
ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm
p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA
AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx
BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK
U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWl5iZmqKjpKWmp6ipqrKztLW2
t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4o
oor/AH/f/9k=
EOF
if base64 -d < "$TEST_IMAGE.b64" > "$TEST_IMAGE" 2>/dev/null; then
    :
elif base64 -D < "$TEST_IMAGE.b64" > "$TEST_IMAGE" 2>/dev/null; then
    :
else
    echo "   ✗ Failed to decode base64 test image (base64 tool incompatible)"
    exit 1
fi
rm -f "$TEST_IMAGE.b64"

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
    python3 -m json.tool < "$RESPONSE_FILE" 2>/dev/null || cat "$RESPONSE_FILE"
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
