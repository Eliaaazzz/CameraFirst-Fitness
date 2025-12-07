# Code Structure & Architecture Guide

## Component Architecture

```
NutritionScreen (Parent)
│
├─ useState(showMealDetail)
│
├─ SummaryCard (existing)
│  └─ Shows daily calories & progress
│
├─ TodaysMealCard (NEW) ⭐
│  ├─ Glassmorphic background
│  ├─ Food image
│  ├─ Calorie info
│  └─ Ripple effect on tap
│
├─ AddFoodButton (existing)
│
├─ MealListItem (existing)
│  └─ List of meals below
│
└─ Modal Overlay (conditional)
   └─ TodaysMealDetail (NEW) ⭐
      ├─ Header with close
      ├─ Total calories card
      ├─ Meal list
      │  └─ Expandable items
      └─ Edit/delete actions
```

## File Structure

```
frontend/
├── src/
│   ├── screens/
│   │   └── NutritionScreen.tsx ✏️ Modified
│   │
│   └── components/
│       └── nutrition/
│           ├── TodaysMealCard.tsx ✨ NEW
│           ├── TodaysMealDetail.tsx ✨ NEW
│           ├── SummaryCard.tsx (existing)
│           ├── MealListItem.tsx (existing)
│           ├── AddFoodButton.tsx (existing)
│           ├── GLASSMORPHISM_CARD_FEATURE.md ✨ NEW
│           ├── DetectedItemRow.tsx (existing)
│           ├── MacroPill.tsx (existing)
│           └── NutritionSummaryCard.tsx (existing)
│
├── GLASSMORPHISM_DESIGN.md ✨ NEW
├── IMPLEMENTATION_GUIDE.md ✨ NEW
└── GLASSMORPHISM_CARD_SUMMARY.md ✨ NEW
```

## State Flow

```
NutritionScreen
│
├─ data (from useDailyNutrition hook)
│  ├─ calories
│  ├─ goal
│  ├─ protein
│  ├─ carbs
│  ├─ fat
│  └─ meals[]
│      ├─ id
│      ├─ name
│      ├─ calories
│      ├─ imageUrl
│      ├─ protein?
│      ├─ carbs?
│      ├─ fat?
│      └─ consumedAt
│
├─ showMealDetail (boolean state)
│  ├─ true → render modal
│  └─ false → hide modal
│
└─ handlers
   ├─ handleAddPress()
   ├─ handleTakePhoto()
   └─ handleChooseFromGallery()
```

## Animation State Machines

### TodaysMealCard Animations

```
┌─────────────────────────────────────────────┐
│         CARD ANIMATION STATES               │
└─────────────────────────────────────────────┘

STATE: IDLE
├─ scale: 1
├─ ripple.scale: 0
├─ ripple.opacity: 0
└─ Ready for interaction

       ↓ onPressIn

STATE: PRESSED
├─ scale: 0.95 (withSpring)
├─ ripple.scale: 0 (starting)
├─ ripple.opacity: 1
└─ User touching card

       ↓ onPress

STATE: RIPPLING
├─ scale: 0.95 → 1 (withSpring)
├─ ripple.scale: 0 → 4 (withTiming, 600ms)
├─ ripple.opacity: 1 → 0 (withTiming, 600ms)
└─ Ripple expanding & callback triggered

       ↓ onPressOut

STATE: RETURNING
├─ scale: 0.95 → 1 (withSpring)
├─ ripple.scale: 4 (invisible)
└─ Animation completes

       ↓ Animation done

STATE: IDLE
└─ Ready again
```

### Modal Animations

```
┌─────────────────────────────────────────────┐
│         MODAL ANIMATION STATES              │
└─────────────────────────────────────────────┘

STATE: HIDDEN
├─ Modal not rendered
└─ showMealDetail = false

       ↓ User taps card

STATE: OPENING
├─ Background fades in (300ms)
├─ Modal: ZoomIn.springify()
├─ Overlay: rgba(0,0,0,0) → rgba(0,0,0,0.5)
└─ Each meal: FadeInDown (staggered)

       ↓ Animations complete

STATE: OPEN
├─ Modal fully visible
├─ User can interact with meals
├─ Can tap X or overlay
└─ Ready for user actions

       ↓ User closes

STATE: CLOSING
├─ Modal: FadeOutUp
├─ Overlay: rgba(0,0,0,0.5) → rgba(0,0,0,0)
└─ All animations reverse

       ↓ Close animation done

STATE: HIDDEN
└─ showMealDetail = false
```

## Styling Architecture

### TodaysMealCard Styles

```
StyleSheet.create({
  container: {                    // Wrapper
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
  },
  
  pressable: {                    // Touch target
    overflow: 'hidden',
    borderRadius: 20,
  },
  
  background: {                   // Glass effect base
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  glassLayer: {                   // Multiple layers
    opacity: 0.08,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  
  borderGlow: {                   // Highlight border
    borderColor: 'rgba(255,255,255,0.4)',
  },
  
  ripple: {                       // Ripple effect
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  
  content: {                      // Main layout
    flexDirection: 'row',
    padding: 16,
    height: 140,
  },
  
  imageSection: {                 // Image container
    marginRight: 16,
  },
  
  foodImage: {                    // Photo
    width: 110,
    height: 110,
    borderRadius: 16,
  },
  
  infoSection: {                  // Text info
    flex: 1,
    justifyContent: 'center',
  },
  
  label: {                        // "TODAY'S MEALS"
    fontSize: 12,
    textTransform: 'uppercase',
  },
  
  calorieCount: {                 // "1850"
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  calorieUnit: {                  // "kcal"
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  
  mealStatus: {                   // "1 meal logged"
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  
  arrowSection: {                 // Arrow button
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
```

### TodaysMealDetail Styles

```
StyleSheet.create({
  container: {                    // Full overlay
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  
  safeArea: {                     // Modal body
    flex: 1,
    backgroundColor: '#1a1a1a',   // Dark bg
    borderTopLeftRadius: 24,
  },
  
  header: {                       // Title bar
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  
  summaryCard: {                  // Total calories
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  mealItem: {                     // Individual meal
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  mealItemSelected: {             // When expanded
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  
  macrosPreview: {                // Expanded macros
    marginTop: 8,
    paddingTop: 8,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  
  editButton: {                   // Edit action
    backgroundColor: 'rgba(76,175,80,0.2)',
  },
  
  editButtonPressed: {            // Edit pressed
    backgroundColor: 'rgba(76,175,80,0.35)',
  },
});
```

## Data Flow Pattern

```
┌─────────────────────────────────────────────┐
│         DATA FLOW DIAGRAM                   │
└─────────────────────────────────────────────┘

NutritionScreen
    ↓
useDailyNutrition() hook
    ↓
Fetches data from backend
    ↓
Returns:
    - calories (number)
    - goal (number)
    - macros (protein, carbs, fat)
    - meals[] (array of meal objects)
    ↓
Used by:
    ├─ SummaryCard (progress bar)
    ├─ TodaysMealCard (top card)
    │   ├─ totalCalories
    │   ├─ mealCount
    │   └─ imageUrl (meals[0].imageUrl)
    └─ TodaysMealDetail (modal)
        ├─ meals array
        └─ totalCalories
```

## Event Flow

```
┌─────────────────────────────────────────────┐
│         EVENT HANDLING FLOW                 │
└─────────────────────────────────────────────┘

User taps TodaysMealCard
    ↓
  onPressIn
    ├─ cardScale.value = 0.95 (spring)
    └─ Visual feedback
    ↓
  onPress
    ├─ Start ripple animation
    │   ├─ rippleScale: 0 → 4
    │   └─ rippleOpacity: 1 → 0
    ├─ setTimeout 100ms
    └─ setShowMealDetail(true)
    ↓
  onPressOut
    ├─ cardScale.value = 1 (spring)
    └─ Return to normal
    ↓
Component re-renders
    ├─ showMealDetail = true
    └─ Modal appears
    ↓
Modal renders with animations
    ├─ Background fades in
    ├─ Modal zooms in
    └─ Meals slide in (staggered)
    ↓
User taps meal
    ├─ selectedMealId toggled
    ├─ Macros animate in
    └─ Visual update
    ↓
User closes modal
    ├─ Tap X button OR
    ├─ Tap overlay
    ↓
setShowMealDetail(false)
    ├─ FadeOutUp animation
    ├─ Overlay fades
    └─ Modal unmounts
```

## Performance Optimization

```
┌─────────────────────────────────────────────┐
│       PERFORMANCE TECHNIQUES                │
└─────────────────────────────────────────────┘

✓ React Native Reanimated
  └─ Animations run on native thread
  └─ No JavaScript frame dropping
  └─ Consistent 60fps

✓ SharedValue & Animated Styles
  └─ Only re-render when state changes
  └─ Animations don't trigger re-renders

✓ FlatList for meals
  └─ Efficient rendering of large lists
  └─ Only visible items rendered

✓ Absolute positioning for modal
  └─ Doesn't affect layout tree
  └─ Minimal performance impact

✓ Lazy modal rendering
  └─ Only renders when showMealDetail = true
  └─ No cost when hidden

✓ Memoization ready
  └─ Components can use React.memo()
  └─ Props are stable references
```

## TypeScript Interfaces

```typescript
// TodaysMealCard Props
interface TodaysMealCardProps {
  totalMeals: number;
  totalCalories: number;
  mealCount: number;
  onPress: () => void;
  imageUrl?: string;
}

// TodaysMealDetail Props
interface TodaysMealDetailProps {
  meals: Food[];
  totalCalories: number;
  onClose: () => void;
  onEditMeal?: (mealId: string) => void;
}

// Food Data Structure
interface Food {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  consumedAt: string; // ISO date
}
```

## Next Steps for Integration

1. **Backend Integration** (if needed)
   - Ensure `/api/v1/nutrition/summary/daily` returns meal images
   - Add `imageUrl` to meal response

2. **Edit Meal Feature**
   - Implement `onEditMeal` callback
   - Navigate to meal editor screen

3. **Delete Meal Feature**
   - Add delete button
   - Implement confirmation dialog

4. **Additional Features**
   - Share meal functionality
   - Meal history/trends
   - Macro distribution pie chart

---

**Version**: 1.0.0
**Last Updated**: December 6, 2025
**Architecture Pattern**: Component-based with hooks
**Performance**: 60fps animations
