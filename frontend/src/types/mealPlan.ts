export interface NutritionTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  mealType: string;
  recipeId?: string | null;
  recipeName?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  note?: string | null;
}

export interface MealPlanDay {
  dayNumber: number;
  meals: MealEntry[];
}

export interface MealPlanResponse {
  target: NutritionTarget;
  days: MealPlanDay[];
}

export interface MealPlanHistoryItem {
  id: number;
  userId: string;
  generatedAt: string;
  source?: string | null;
  plan: MealPlanResponse;
}

export interface NutritionMetricResponse {
  actual: number;
  target: number;
  percent: number;
}

export interface NutritionSummaryResponse {
  rangeStart: string;
  rangeEnd: string;
  days: number;
  calories: NutritionMetricResponse;
  protein: NutritionMetricResponse;
  carbs: NutritionMetricResponse;
  fat: NutritionMetricResponse;
  alerts: string[];
}

export interface MealLogResponse {
  id: number;
  userId: string;
  mealPlanId?: number | null;
  mealDay?: number | null;
  mealType: string;
  recipeId?: string | null;
  recipeName?: string | null;
  consumedAt: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
}

export interface NutritionInsightResponse {
  summary: NutritionSummaryResponse;
  logs: MealLogResponse[];
  aiAdvice: string;
}
