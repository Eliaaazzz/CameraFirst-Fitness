import { api } from './apiClient';

export interface FoodItemResponse {
  foodKey: string;
  displayName: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  confidence: number;
}

export interface MealResponse {
  id: number;
  userId: string;
  mealType: string;
  consumedAt: string;
  foodItems?: FoodItemResponse[] | null;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  imageUrl?: string | null;
  notes?: string | null;
}

export interface TodaySummaryResponse {
  date: string;
  timezone?: string;
  current: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  target?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: MealResponse[];
  healthScore?: number;
}

const getDeviceTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect device timezone', error);
    return undefined;
  }
};

export const getMeals = async (date?: string): Promise<MealResponse[]> => {
  const params = new URLSearchParams();

  if (date) {
    params.append('date', date);
  }

  const timezone = getDeviceTimezone();
  if (timezone) {
    params.append('timezone', timezone);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/v1/meals?${queryString}` : '/api/v1/meals';

  return api.get<MealResponse[]>(url);
};

export const getTodaySummary = async (): Promise<TodaySummaryResponse> => {
  const params = new URLSearchParams();
  const timezone = getDeviceTimezone();

  if (timezone) {
    params.append('timezone', timezone);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/v1/meals/today?${queryString}` : '/api/v1/meals/today';

  return api.get<TodaySummaryResponse>(url);
};

export default {
  getMeals,
  getTodaySummary,
};
