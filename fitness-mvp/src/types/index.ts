export type EquipmentType = 'bodyweight' | 'dumbbells' | 'bands' | 'kettlebell' | 'machine' | 'other';

export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';

export interface WorkoutCard {
  id: string;
  title: string;
  youtubeId?: string;
  durationMinutes: number;
  level: WorkoutLevel;
  equipment: EquipmentType[];
  bodyPart?: string[];
  thumbnailUrl?: string;
  channelTitle?: string;
  viewCount?: number;
  lastValidatedAt?: string;
}

export interface RecipeCard {
  id: string;
  title: string;
  imageUrl?: string;
  timeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  calories?: number;
  nutritionSummary?: Record<string, unknown> | null;
  tags?: string[];
  isAiGenerated?: boolean;
}

export interface UserProfilePayload {
  heightCm?: number | null;
  weightKg?: number | null;
  bodyFatPercentage?: number | null;
  basalMetabolicRate?: number | null;
  fitnessGoal?: string | null;
  dietaryPreference?: string | null;
  allergens?: string[];
  dailyCalorieTarget?: number | null;
  dailyProteinTarget?: number | null;
  dailyCarbsTarget?: number | null;
  dailyFatTarget?: number | null;
}

export interface UserProfileResponse {
  userId: string;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  bodyFatPercentage?: number | null;
  basalMetabolicRate?: number | null;
  fitnessGoal?: string | null;
  dietaryPreference?: string | null;
  allergens?: string[];
  dailyCalorieTarget?: number | null;
  dailyProteinTarget?: number | null;
  dailyCarbsTarget?: number | null;
  dailyFatTarget?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CurrentUserResponse {
  userId: string;
  email: string;
  level: string;
  timeBucket: number;
  profile?: UserProfileResponse | null;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface UploadWorkoutPayload {
  equipment?: string[];
  level?: WorkoutLevel;
  durationMinutes?: number;
}

export interface UploadRecipePayload {
  ingredients?: string[];
}

export interface SavedWorkout extends WorkoutCard {
  savedAt: string;
  alreadySaved: boolean;
}

export interface SavedRecipe extends RecipeCard {
  savedAt: string;
  alreadySaved: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
}

// Search Types
export interface SearchParams {
  query: string;
  level?: WorkoutLevel;
  maxDuration?: number;
  maxTime?: number;
}

export interface SearchResponse<T> {
  items: T[];
  totalResults: number;
  query: string;
  latencyMs: number;
}

export type SortDirection = 'asc' | 'desc';

export type WorkoutSortField = 'savedAt' | 'duration';
export type RecipeSortField = 'savedAt' | 'time';

export interface SavedSortOption<F extends string> {
  field: F;
  direction: SortDirection;
}

export type WorkoutSortOption = SavedSortOption<WorkoutSortField>;
export type RecipeSortOption = SavedSortOption<RecipeSortField>;

export interface LeaderboardEntry {
  position: number;
  userId: string;
  displayName: string;
  score: number;
  streak: number;
}

export interface LeaderboardPayload {
  scope: string;
  generatedAt: string;
  entries: LeaderboardEntry[];
}

export * from './mealPlan';

// Goal and Reminder Types

export type GoalType =
  | 'nutrition'       // Daily calorie/macro targets
  | 'workout'         // Workout frequency/duration
  | 'hydration'       // Daily water intake
  | 'sleep'           // Sleep hours/quality
  | 'weight'          // Weight loss/gain goals
  | 'habit'           // Custom healthy habits
  | 'meal_prep';      // Meal planning/prep

export type GoalFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly';

export type GoalStatus =
  | 'active'
  | 'completed'
  | 'paused'
  | 'failed';

export type ReminderFrequency =
  | 'once'            // One-time reminder
  | 'daily'           // Every day
  | 'weekdays'        // Monday-Friday
  | 'weekends'        // Saturday-Sunday
  | 'custom';         // Custom days of week

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface Goal {
  id: string;
  userId: string;
  type: GoalType;
  title: string;
  description?: string;
  targetValue?: number;           // e.g., 2000 calories, 3 workouts
  targetUnit?: string;             // e.g., "calories", "workouts", "hours"
  currentValue?: number;           // Progress towards target
  frequency: GoalFrequency;        // How often to achieve the goal
  status: GoalStatus;
  startDate: string;
  endDate?: string;                // Optional end date
  color?: string;                  // UI color for the goal
  icon?: string;                   // Icon name for the goal
  reminders: Reminder[];           // Associated reminders
  progressHistory?: GoalProgress[]; // Historical progress tracking
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  id: string;
  goalId: string;
  date: string;                    // Date of progress entry
  value: number;                   // Actual value achieved
  notes?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  goalId?: string;                 // Optional: link to a goal
  userId: string;
  title: string;
  body?: string;
  time: string;                    // HH:mm format (e.g., "09:00")
  frequency: ReminderFrequency;
  daysOfWeek?: DayOfWeek[];        // For custom frequency
  isEnabled: boolean;
  lastTriggered?: string;
  nextTrigger?: string;
  notificationId?: string;         // Local notification identifier
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  type: GoalType;
  title: string;
  description?: string;
  targetValue?: number;
  targetUnit?: string;
  frequency: GoalFrequency;
  startDate: string;
  endDate?: string;
  color?: string;
  icon?: string;
  reminders?: CreateReminderPayload[];
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string;
  targetValue?: number;
  targetUnit?: string;
  status?: GoalStatus;
  endDate?: string;
  color?: string;
  icon?: string;
}

export interface CreateReminderPayload {
  goalId?: string;
  title: string;
  body?: string;
  time: string;
  frequency: ReminderFrequency;
  daysOfWeek?: DayOfWeek[];
  isEnabled?: boolean;
}

export interface UpdateReminderPayload {
  title?: string;
  body?: string;
  time?: string;
  frequency?: ReminderFrequency;
  daysOfWeek?: DayOfWeek[];
  isEnabled?: boolean;
}

export interface LogGoalProgressPayload {
  goalId: string;
  value: number;
  date?: string;
  notes?: string;
}

export interface GoalStatistics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  completionRate: number;          // Percentage
  currentStreak: number;           // Days
  longestStreak: number;           // Days
  goalsCompletedToday: number;
}
