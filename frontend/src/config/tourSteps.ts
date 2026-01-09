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

// Tour steps for other screens (shown when user navigates to them)
export const MEAL_HISTORY_TOUR_STEP: TourStep = {
  zone: 4,
  screen: 'MealHistory',
  title: 'Meal History',
  text: 'View your complete meal history. Browse past meals and track your eating patterns over time.',
};

export const WEEKLY_INSIGHTS_TOUR_STEP: TourStep = {
  zone: 5,
  screen: 'WeeklyInsights',
  title: 'Weekly Insights',
  text: 'Get weekly nutrition insights. See trends, averages, and your progress over time.',
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
  MEAL_HISTORY_TOUR_STEP,
  WEEKLY_INSIGHTS_TOUR_STEP,
  WORKOUTS_TOUR_STEP,
  RECIPES_TOUR_STEP,
];

// Total number of zones in the tour
export const TOTAL_TOUR_ZONES = ALL_TOUR_STEPS.length;

// AsyncStorage key for tour status
export const TOUR_STATUS_KEY = '@app_tour_completed';
