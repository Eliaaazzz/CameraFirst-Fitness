/**
 * Tour Steps Configuration
 * Defines the content and order of the "Take a Tour" feature
 */

export interface TourStep {
  zone: number;
  screen: string;
  title: string;
  text: string;
}

// Tour steps for the Dashboard screen
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    zone: 1,
    screen: 'Dashboard',
    title: 'Snap Your Meal',
    text: 'Tap here to take a photo of your meal. Our AI will analyze the nutrition instantly!',
  },
  {
    zone: 2,
    screen: 'Dashboard',
    title: "Today's Nutrition",
    text: 'Track your daily calories and macros here. See your progress toward your goals.',
  },
  {
    zone: 3,
    screen: 'Dashboard',
    title: "Today's Meals",
    text: 'Your logged meals appear here. View your daily nutrition breakdown at a glance.',
  },
];

// Tour steps for Profile screen menu items
export const SAVED_WORKOUTS_TOUR_STEP: TourStep = {
  zone: 4,
  screen: 'Profile',
  title: 'Saved Workouts',
  text: 'Access your bookmarked workout videos here. Build your personal workout library for quick access.',
};

export const SAVED_RECIPES_TOUR_STEP: TourStep = {
  zone: 5,
  screen: 'Profile',
  title: 'Saved Recipes',
  text: 'Find all your favorite recipes here. Save recipes from the search tab to build your personal cookbook.',
};

export const WORKOUTS_TOUR_STEP: TourStep = {
  zone: 6,
  screen: 'Workouts',
  title: 'Workout Search Tab',
  text: 'Search for workout videos by type, muscle group, or equipment. Save your favorite routines to your personal list.',
};

export const RECIPES_TOUR_STEP: TourStep = {
  zone: 7,
  screen: 'Recipes',
  title: 'Recipe Search Tab',
  text: 'Explore our vast library of healthy recipes. Use the search bar to find meals by ingredients, diet, or preparation time.',
};

// All tour steps in order
export const ALL_TOUR_STEPS: TourStep[] = [
  ...DASHBOARD_TOUR_STEPS,
  SAVED_WORKOUTS_TOUR_STEP,
  SAVED_RECIPES_TOUR_STEP,
  WORKOUTS_TOUR_STEP,
  RECIPES_TOUR_STEP,
];

// Total number of zones in the tour
export const TOTAL_TOUR_ZONES = ALL_TOUR_STEPS.length;

// AsyncStorage key for tour status
export const TOUR_STATUS_KEY = '@app_tour_completed';
