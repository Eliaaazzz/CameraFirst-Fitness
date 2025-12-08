# Fix for Nutrition API 500 Errors

## Problem Summary

The nutrition API endpoints were returning HTTP 500 errors repeatedly when called with `userId=default-user`. These errors were visible in the network inspector and were being caused by the `getDailySummary` API endpoint at `apiClient.ts:57`.

### Root Cause

The issue was an `EntityNotFoundException` being thrown in `NutritionTrackingService.buildSummary()` when attempting to retrieve a `UserProfile` for users that didn't have one in the database. Specifically:

1. The frontend calls the API with `userId="default-user"`
2. The backend converts this to UUID `00000000-0000-0000-0000-000000000001`
3. The nutrition tracking service tries to look up the user profile
4. No profile exists in the database for this user
5. `EntityNotFoundException` is thrown, resulting in a 500 error

## Solution

We implemented a multi-layered solution to ensure the nutrition API never fails due to missing profiles:

### 1. Database Migration (V15__seed_default_user_profiles.sql)

Created a migration that:
- Seeds a default user with UUID `00000000-0000-0000-0000-000000000001`
- Creates default profiles for all demo users and the default-user
- Sets standard nutrition targets (2000 cal, 130g protein, 220g carbs, 70g fat)
- Uses upsert logic to avoid conflicts on repeated runs

### 2. Auto-Profile Creation in NutritionTrackingService

Modified the `buildSummary()` method to automatically create a default profile when one doesn't exist:
- Uses `Optional.orElseGet()` instead of `Optional.orElseThrow()`
- Creates a profile with standard defaults using the builder pattern
- Properly handles the `@MapsId` relationship by loading the User entity first
- Logs a warning when auto-creating for visibility

### 3. Fallback Profile in NutritionInsightService

Added a minimal transient profile for advice generation:
- Only used when a profile doesn't exist for generating AI advice
- Contains just the minimum fields needed (fitness goal, dietary preference)
- Never persisted to the database
- Clearly documented as transient-only

### 4. Testing

Added comprehensive integration test (`NutritionAutoProfileCreationTest`):
- Verifies auto-creation works for daily summaries
- Verifies auto-creation works for weekly summaries  
- Confirms correct default values are used
- Ensures profiles are properly persisted

## Default Nutrition Targets

The following default values are used for new profiles:
- **Daily Calories**: 2000 kcal
- **Daily Protein**: 130g
- **Daily Carbs**: 220g
- **Daily Fat**: 70g
- **Fitness Goal**: MAINTAIN
- **Dietary Preference**: NONE

These constants are defined in `NutritionTrackingService` and can be easily updated if needed.

## Impact

- ✅ No more 500 errors when calling nutrition APIs
- ✅ Users can access nutrition tracking without manually creating a profile
- ✅ Graceful degradation with sensible defaults
- ✅ Zero breaking changes to existing functionality
- ✅ All tests pass
- ✅ No security vulnerabilities introduced

## Files Changed

1. `backend/src/main/resources/db/migration/V15__seed_default_user_profiles.sql` - New migration
2. `backend/src/main/java/com/fitnessapp/backend/service/NutritionTrackingService.java` - Auto-creation logic
3. `backend/src/main/java/com/fitnessapp/backend/service/NutritionInsightService.java` - Fallback profile
4. `backend/src/test/java/com/fitnessapp/backend/service/NutritionTrackingServiceTest.java` - Updated constructor
5. `backend/src/test/java/com/fitnessapp/backend/service/NutritionAutoProfileCreationTest.java` - New integration test

## Rollout Notes

When this change is deployed:
1. The V15 migration will run automatically and seed default profiles
2. Existing users with profiles will see no changes
3. New users and default-user will automatically get profiles on first API call
4. The frontend can continue using "default-user" as the userId without errors
