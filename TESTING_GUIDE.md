# Testing Guide for Debugging Fixes

This guide provides step-by-step instructions for testing all the fixes that were applied to resolve the reported issues.

## Prerequisites

1. Backend server running on configured port (default: 8080)
2. Frontend app running via Expo
3. Database populated with at least the default user (UUID: 00000000-0000-0000-0000-000000000001)

## Test Cases

### Test 1: Logout Navigation ✅

**Issue**: App doesn't navigate to login page when clicking logout

**Steps to Test**:
1. Launch the app and ensure you're logged in
2. Navigate to the "Goals" tab
3. Click the logout button (red icon in top-right)
4. Confirm the logout in the alert dialog
5. **Expected**: App should navigate to the Login screen
6. **Expected**: JWT tokens should be cleared from SecureStore

**Verification**:
```bash
# Check app logs for:
# - "Logout successful"
# - Navigation reset to Login screen
```

---

### Test 2: Apple Login Button ✅

**Issue**: Apple login button not showing up

**Steps to Test** (iOS only):
1. Open the app
2. Navigate to the Login screen
3. **Expected**: See three buttons:
   - "Sign in with Google"
   - Apple Sign-In button (black, native iOS style)
   - "Mock Login (Dev Only)"

**Steps to Test Authentication**:
1. Click the Apple Sign-In button
2. Complete Apple authentication flow
3. **Expected**: Backend receives Apple ID token
4. **Expected**: JWT is saved and user navigates to Main screen

**Note**: Apple Sign-In only appears on iOS devices/simulators where it's available.

---

### Test 3: Nutrition API Errors ✅

**Issue**: 500 errors on nutrition endpoints

**Endpoints to Test**:
- GET `/api/v1/nutrition/summary/daily?userId=00000000-0000-0000-0000-000000000001`
- GET `/api/v1/nutrition/insights/weekly?userId=00000000-0000-0000-0000-000000000001`
- POST `/api/v1/nutrition/analyze` (with image)

**Steps to Test**:

1. **Daily Summary**:
   ```bash
   curl -X GET "http://localhost:8080/api/v1/nutrition/summary/daily?userId=00000000-0000-0000-0000-000000000001" \
     -H "X-API-Key: mobile-app-default-key-2024-fitness"
   ```
   **Expected**: 200 OK with nutrition summary
   **Expected**: Auto-creates user and profile if they don't exist

2. **Weekly Insights**:
   ```bash
   curl -X GET "http://localhost:8080/api/v1/nutrition/insights/weekly?userId=00000000-0000-0000-0000-000000000001" \
     -H "X-API-Key: mobile-app-default-key-2024-fitness"
   ```
   **Expected**: 200 OK with insights and AI advice

3. **Check Backend Logs**:
   ```bash
   # Should see logs like:
   # "Creating default user profile for userId: 00000000-0000-0000-0000-000000000001"
   # "Created default user: 00000000-0000-0000-0000-000000000001"
   ```

**Error Handling Test**:
- Test with non-existent user UUID
- **Expected**: Auto-creates user with generated email
- **Expected**: Returns transient profile if DB write fails

---

### Test 4: Food Photo Upload and Display ✅

**Issue**: Nutrition makeup not showing after uploading food photo

**Steps to Test**:

1. **Take/Select Food Photo**:
   - Navigate to Nutrition tab
   - Click "Add Meal" or camera button
   - Take a photo of food or select from gallery

2. **Wait for Analysis**:
   - **Expected**: See loading states:
     - "Detecting food…"
     - "Estimating portion size…"
     - "Calculating nutrition…"

3. **Verify Display**:
   - **Expected**: See "Detected items" section with food cards
   - Each card should show:
     - Food name (e.g., "Grilled Chicken Breast")
     - Calories and protein
     - Portion size with +/- controls
   - **Expected**: See "Total for this meal" card showing:
     - Total calories
     - Total protein, carbs, fat

4. **Test Interactions**:
   - Click + button to increase portion
   - Click - button to decrease portion
   - **Expected**: Numbers update in real-time
   - **Expected**: Total nutrition updates

5. **Save Meal**:
   - Click "Save to today" button
   - **Expected**: Success alert
   - **Expected**: Navigate back to Nutrition tab
   - **Expected**: Meal appears in today's log

**Backend Response Format Check**:
```json
{
  "items": [
    {
      "foodKey": "chicken_breast_grilled",
      "displayName": "Grilled Chicken Breast",
      "estimatedGrams": 150,
      "confidence": 0.95,
      "nutrition": {
        "calories": 165,
        "protein": 31,
        "carbs": 0,
        "fat": 3.6
      }
    }
  ],
  "totalNutrition": {
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6
  },
  "suggestedMealType": "lunch"
}
```

**Frontend Transformation Check**:
- Frontend should transform to:
  - `foodKey` → `id`
  - `displayName` → `name`
  - `estimatedGrams` → `amount` (with unit: "g")
  - `nutrition.calories` → `calories`

---

### Test 5: Goals Feature Verification ✅

**Note**: This is not a bug - goals work as designed using local storage.

**Steps to Verify**:

1. **Create Goal**:
   - Navigate to Goals tab
   - Click "+ New Goal" FAB
   - Select goal type (e.g., Nutrition)
   - Fill in details (title, target, frequency)
   - Add reminders (optional)
   - Click "Create Goal"

2. **Verify Storage**:
   - **Expected**: Goal saved to AsyncStorage
   - **Expected**: Notifications scheduled for reminders
   - **Expected**: Goal appears in list

3. **Log Progress**:
   - Click quick progress button on goal card
   - **Expected**: Progress updates
   - **Expected**: Statistics update (streak, completed goals)

4. **Check Statistics**:
   - **Expected**: See cards showing:
     - Active Goals count
     - Current Streak 🔥
     - Completed Goals count

---

## Automated Tests

### Backend Tests

Run all backend tests:
```bash
cd backend
./gradlew test
```

**Expected Output**:
```
BUILD SUCCESSFUL in XXs
5 actionable tasks: 5 executed
```

Run specific nutrition tests:
```bash
./gradlew test --tests NutritionTrackingServiceTest
./gradlew test --tests NutritionControllerTest
```

### Frontend Tests

```bash
cd frontend
npm test
```

**Note**: Frontend uses AsyncStorage for goals, no server integration required.

---

## Common Issues and Solutions

### Issue: User doesn't exist in database

**Solution**: The fix now auto-creates users. Check logs:
```
Creating default user profile for userId: {uuid}
User {uuid} doesn't exist, creating default user
Created default user: {uuid}
```

### Issue: Apple Sign-In not showing

**Causes**:
- Running on Android (iOS only)
- Running on web (iOS only)
- Apple authentication not configured in Apple Developer account

**Solution**: Test on iOS device or simulator with valid Apple ID

### Issue: Food recognition fails

**Causes**:
- No Gemini API key configured
- Rate limit exceeded
- Image too large (>10MB)

**Solution**: 
- Check `GEMINI_API_KEY` environment variable
- Reduce image size
- Check backend logs for specific error

### Issue: Navigation doesn't reset on logout

**Cause**: Using nested tab navigator

**Solution**: Now uses `CommonActions.reset()` which works with nested navigators

---

## Performance Checks

### API Response Times

**Acceptable Ranges**:
- Nutrition summary: < 500ms
- Food recognition: 3-8 seconds (AI processing)
- Meal logging: < 200ms

### Memory Usage

Monitor for leaks when:
- Uploading multiple food photos
- Creating many goals
- Navigating between screens repeatedly

---

## Security Considerations

### Tested Security Aspects

1. **JWT Token Handling**:
   - ✅ Tokens stored in SecureStore
   - ✅ Tokens cleared on logout
   - ✅ Token included in API requests

2. **Input Validation**:
   - ✅ Image size limits (10MB)
   - ✅ User ID format validation
   - ✅ Required field validation

3. **Error Messages**:
   - ✅ Don't expose internal details
   - ✅ Generic errors for security
   - ✅ Detailed logs server-side only

---

## Regression Testing

Ensure existing functionality still works:

1. **Recipe Search** - Test search and save functionality
2. **Workout Videos** - Test video playback and saving
3. **Meal Plans** - Test generation and viewing
4. **User Profile** - Test profile updates
5. **Leaderboard** - Test scoring and display

---

## Environment-Specific Testing

### Development
- Backend: `http://localhost:8080`
- Frontend: Expo Dev Client
- Database: Local PostgreSQL

### Staging/Production
- Backend: Production URL (from env)
- Frontend: Production build
- Database: Production PostgreSQL

---

## Success Criteria

All tests pass when:
- ✅ Logout navigates to Login screen
- ✅ Apple Sign-In button appears on iOS
- ✅ Nutrition APIs return 200 (not 500)
- ✅ Food photos display detected items
- ✅ Nutrition totals calculate correctly
- ✅ Goals save and load from storage
- ✅ Backend tests pass
- ✅ No console errors in frontend
- ✅ Proper error handling for edge cases
