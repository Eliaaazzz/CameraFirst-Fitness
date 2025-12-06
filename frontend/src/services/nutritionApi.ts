import { api } from './apiClient';
import { MealLogResponse, NutritionSummaryResponse, NutritionInsightResponse } from '@/types/mealPlan';

export interface LogMealPayload {
  mealPlanId?: number | null;
  mealDay?: number | null;
  mealType: string;
  recipeId?: string | null;
  recipeName?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  consumedAt?: string;
  notes?: string | null;
}

// Food recognition types - matching backend DTOs
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecognizedFood {
  food_key: string;
  display_name: string;
  estimated_grams: number;
  cooking_method: string;
  confidence?: number;
  nutrition?: NutritionInfo;
}

export interface FoodRecognitionResponse {
  items: RecognizedFood[];
  totalNutrition: NutritionInfo;
  suggestedMealType?: string;
}

// Legacy interface for compatibility with UI components
export interface DetectedFood {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
}

export interface SaveMealPayload {
  imageUri: string;
  detectedFoods: DetectedFood[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType?: string;
  notes?: string;
}

const logMeal = async (userId: string, payload: LogMealPayload): Promise<MealLogResponse> => {
  return await api.post<MealLogResponse>('/api/v1/nutrition/meals', {
    userId,
    consumedAt: new Date().toISOString(),
    ...payload,
  });
};

const getDailySummary = async (userId: string, date?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (date) queryParams.append('date', date);
  return await api.get<NutritionSummaryResponse>(`/api/v1/nutrition/summary/daily?${queryParams}`);
};

const getWeeklySummary = async (userId: string, weekStart?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (weekStart) queryParams.append('weekStart', weekStart);
  return await api.get<NutritionSummaryResponse>(`/api/v1/nutrition/summary/weekly?${queryParams}`);
};

const getWeeklyInsight = async (userId: string, weekStart?: string): Promise<NutritionInsightResponse> => {
  const queryParams = new URLSearchParams({ userId });
  if (weekStart) queryParams.append('weekStart', weekStart);
  return await api.get<NutritionInsightResponse>(`/api/v1/nutrition/insights/weekly?${queryParams}`);
};

// Analyze food image with Claude AI
const analyzeFoodImage = async (imageUri: string): Promise<FoodRecognitionResponse> => {
  return await api.uploadImage<FoodRecognitionResponse>(
    '/api/v1/nutrition/analyze',
    imageUri
  );
};

// Convert backend RecognizedFood to DetectedFood for UI compatibility
const convertToDetectedFood = (item: RecognizedFood): DetectedFood => {
  return {
    id: item.food_key,
    name: item.display_name,
    amount: item.estimated_grams,
    unit: 'g',
    calories: item.nutrition?.calories || 0,
    protein: item.nutrition?.protein || 0,
    carbs: item.nutrition?.carbs || 0,
    fat: item.nutrition?.fat || 0,
    confidence: item.confidence,
  };
};

// Save analyzed meal to today's log
const saveMealFromImage = async (payload: SaveMealPayload): Promise<MealLogResponse> => {
  // For now, we'll save the total nutrition as a single meal
  const mealPayload: LogMealPayload = {
    mealType: payload.mealType || 'other',
    recipeName: 'AI Detected Meal',
    calories: payload.total.calories,
    protein: payload.total.protein,
    carbs: payload.total.carbs,
    fat: payload.total.fat,
    consumedAt: new Date().toISOString(),
    notes: payload.notes || `Detected: ${payload.detectedFoods.map(f => f.name).join(', ')}`,
  };

  // Assuming we have a default userId - you may need to get this from auth context
  return await logMeal('default-user', mealPayload);
};

export default {
  logMeal,
  getDailySummary,
  getWeeklySummary,
  getWeeklyInsight,
  analyzeFoodImage,
  saveMealFromImage,
  convertToDetectedFood,
};
