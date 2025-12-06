# Nutrition Card Upload Fix Verification

## Issues Fixed

### 1. Frontend API Parameter Mismatch
**Problem**: The frontend was sending the image with parameter name `'file'`, but the backend expects `'image'`.
- **File**: `frontend/src/services/apiClient.ts`
- **Fix**: Changed `formData.append('file', ...)` to `formData.append('image', ...)`

### 2. Missing API Version Prefix
**Problem**: Frontend was calling `/nutrition/analyze` instead of `/api/v1/nutrition/analyze`.
- **File**: `frontend/src/services/nutritionApi.ts`
- **Fix**: Updated endpoint to `/api/v1/nutrition/analyze`

### 3. Frontend Response Type Mismatch
**Problem**: Frontend types didn't match backend response structure.
- **Backend returns**: `{ items: RecognizedFood[], totalNutrition: NutritionInfo, suggestedMealType: string }`
- **Frontend expected**: `{ detectedFoods: DetectedFood[], total: {...}, success: boolean }`
- **Fix**: Added backend types and adapter function to transform response

## Backend Response Structure

```json
{
  "items": [
    {
      "foodKey": "steamed_rice",
      "displayName": "白米饭",
      "estimatedGrams": 200,
      "cookingMethod": "steamed",
      "confidence": 0.95,
      "nutrition": {
        "calories": 232.0,
        "protein": 4.2,
        "fat": 0.4,
        "carbs": 51.6
      }
    }
  ],
  "totalNutrition": {
    "calories": 232.0,
    "protein": 4.2,
    "fat": 0.4,
    "carbs": 51.6
  },
  "suggestedMealType": "lunch"
}
```

## How to Test

### Prerequisites
1. **Gemini API Key**: Set `GEMINI_API_KEY` environment variable with a valid Google Gemini API key
2. **Backend Running**: Start the backend server on port 8080
3. **Test Image**: Prepare a food image (e.g., `test-food.jpg`)

### Testing with curl

```bash
# 1. Start the backend (if not already running)
cd backend
./gradlew bootRun

# 2. In another terminal, test the nutrition analyze endpoint
curl -X POST http://localhost:8080/api/v1/nutrition/analyze \
  -H "X-API-Key: your-api-key" \
  -F "image=@test-food.jpg"
```

### Expected Response
```json
{
  "items": [
    {
      "foodKey": "food_name_in_snake_case",
      "displayName": "Food Display Name",
      "estimatedGrams": 150,
      "cookingMethod": "steamed",
      "confidence": 0.90,
      "nutrition": {
        "calories": 200.0,
        "protein": 15.0,
        "fat": 8.0,
        "carbs": 20.0
      }
    }
  ],
  "totalNutrition": {
    "calories": 200.0,
    "protein": 15.0,
    "fat": 8.0,
    "carbs": 20.0
  },
  "suggestedMealType": "lunch"
}
```

### Frontend Testing
1. Start the frontend app
2. Navigate to the nutrition screen
3. Upload a food photo
4. Verify the nutrition card displays with:
   - Food items with names and amounts
   - Total calories, protein, fat, carbs
   - Ability to adjust portions

## API Key Configuration

The Gemini API is used as the primary food recognition provider. Make sure you have:

1. **Environment Variable Set**:
   ```bash
   export GEMINI_API_KEY=your_actual_gemini_api_key
   ```

2. **Or in `.env` file** (for local development):
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```

3. **Verify in application logs**:
   - ✅ Should see: `Initialized FoodRecognitionService with X providers`
   - ❌ Should NOT see: `Gemini API key not configured - Gemini food recognition will be disabled`

## Troubleshooting

### Error: "No AI food recognition providers available"
- **Cause**: Gemini API key is not configured
- **Solution**: Set `GEMINI_API_KEY` environment variable

### Error: "Failed to recognize foods after X attempts"
- **Cause**: Gemini API key is invalid or rate limit exceeded
- **Solution**: Verify API key is valid and has quota

### Error: "Image file is required" or 400 Bad Request
- **Cause**: Missing or incorrect parameter name in request
- **Solution**: Ensure frontend uses `'image'` as the parameter name (FIXED)

### Error: 401 Unauthorized
- **Cause**: Missing or invalid API key in request header
- **Solution**: Include `X-API-Key` header with valid API key

## Changes Summary

### Files Modified
1. `frontend/src/services/apiClient.ts` - Fixed parameter name from 'file' to 'image'
2. `frontend/src/services/nutritionApi.ts` - Fixed endpoint and added response adapter

### No Backend Changes Needed
The backend was already correctly implemented and expecting the 'image' parameter.
