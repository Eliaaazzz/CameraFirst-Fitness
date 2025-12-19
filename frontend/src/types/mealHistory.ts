/**
 * Meal History & Insights Types
 * Matches backend DTOs exactly to avoid type mismatches
 */

// ==================== Meal History Types ====================

export interface MealHistoryParams {
  page?: number;
  size?: number;
  startDate?: string; // ISO format: "2025-01-01"
  endDate?: string;   // ISO format: "2025-01-15"
  sort?: string;      // e.g., "consumedAt,desc"
}

export interface FoodItem {
  foodKey: string;
  displayName: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  confidence: number;
}

export interface MealHistoryItem {
  id: number;
  userId: string;
  mealType: string;
  consumedAt: string; // ISO DateTime string
  foodItems: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  imageUrl: string | null;
  notes: string | null;
}

export interface PageInfo {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

// Spring Page format
export interface MealHistoryResponse {
  content: MealHistoryItem[];
  // Spring Page uses flat structure, not nested 'page' object
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ==================== Weekly Insights Types ====================

export interface DateRange {
  startDate: string; // ISO date: "2025-01-09"
  endDate: string;   // ISO date: "2025-01-15"
}

export interface WeeklySummary {
  totalMeals: number;
  totalCalories: number;
  averageDailyCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  averageSugar: number;
}

export interface CaloriesData {
  actual: number;
  target: number;
  percentage: number;
}

export interface DailyData {
  date: string; // ISO date: "2025-01-09"
  calories: CaloriesData;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  mealCount: number;
}

export interface MacroDetail {
  grams: number;
  percentage: number;
  caloriesFromMacro: number;
}

export interface MacrosDistribution {
  protein: MacroDetail;
  carbs: MacroDetail;
  fat: MacroDetail;
}

export interface SugarWarning {
  hasWarning: boolean;
  averageDailySugar: number;
  recommendedLimit: number;
  daysExceeded: number;
  message: string;
}

export interface UserGoal {
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbsTarget: number | null;
  dailyFatTarget: number | null;
}

export interface WeeklyInsightsResponse {
  dateRange: DateRange;
  summary: WeeklySummary;
  dailyData: DailyData[];
  macrosDistribution: MacrosDistribution;
  sugarWarning: SugarWarning;
  userGoal: UserGoal;
}
