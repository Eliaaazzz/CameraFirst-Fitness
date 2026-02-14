/**
 * Tour Steps Configuration
 * Defines the content and order of the "Take a Tour" feature
 *
 * Web: 5 steps (includes Quick Actions)
 * Native: 4 steps (Quick Actions removed from dashboard flow)
 */
import { Platform } from 'react-native';

export interface TourStep {
  zone: number;
  screen: string;
  title: string;
  text: string;
}

// Step 1: Snap Your Meal (Dashboard)
export const SNAP_MEAL_STEP: TourStep = {
  zone: 1,
  screen: 'Dashboard',
  title: 'Snap Your Meal',
  text: 'Tap here to take a photo of your meal. Our AI will analyze the nutrition instantly!',
};

// Step 2: Today's Nutrition (Dashboard)
export const TODAYS_NUTRITION_STEP: TourStep = {
  zone: 2,
  screen: 'Dashboard',
  title: "Today's Nutrition",
  text: 'Track your daily calories and macros here. See your progress toward your goals.',
};

// Step 3: Quick Actions (Dashboard)
export const QUICK_ACTIONS_STEP: TourStep = {
  zone: 3,
  screen: 'Dashboard',
  title: 'Quick Actions',
  text: 'Jump to your logs and insights without digging through menus.',
};

// Step 4: Workouts (Workouts screen)
export const WORKOUTS_TOUR_STEP: TourStep = {
  zone: 4,
  screen: 'Workouts',
  title: 'Find Workouts',
  text: 'Search for workout videos by type, muscle group, or equipment. Save your favorites!',
};

// Step 5: Recipes (Recipes screen)
export const RECIPES_TOUR_STEP: TourStep = {
  zone: 5,
  screen: 'Recipes',
  title: 'Discover Recipes',
  text: 'Explore healthy recipes. Search by ingredients, diet, or prep time.',
};

const DASHBOARD_TOUR_STEPS: TourStep[] = Platform.OS === 'web'
  ? [SNAP_MEAL_STEP, TODAYS_NUTRITION_STEP, QUICK_ACTIONS_STEP]
  : [SNAP_MEAL_STEP, TODAYS_NUTRITION_STEP];

// All tour steps in order
export const ALL_TOUR_STEPS: TourStep[] = [
  ...DASHBOARD_TOUR_STEPS,
  WORKOUTS_TOUR_STEP,
  RECIPES_TOUR_STEP,
];

// Total number of zones in the tour
export const TOTAL_TOUR_ZONES = ALL_TOUR_STEPS.length;

// AsyncStorage key for tour status
export const TOUR_STATUS_KEY = '@app_tour_completed';
