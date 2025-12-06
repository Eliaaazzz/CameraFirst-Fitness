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

// Food recognition types (Frontend display format)
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

export interface FoodRecognitionResponse {
  success: boolean;
  detectedFoods: DetectedFood[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl?: string;
}

// Backend API types
interface BackendNutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface BackendRecognizedFood {
  foodKey: string;
  displayName: string;
  estimatedGrams: number;
  cookingMethod?: string;
  confidence: number;
  nutrition?: BackendNutritionInfo;
}

interface BackendFoodRecognitionResponse {
  items: BackendRecognizedFood[];
  totalNutrition: BackendNutritionInfo;
  suggestedMealType?: string;
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

// Analyze food image with Gemini AI
const analyzeFoodImage = async (imageUri: string): Promise<FoodRecognitionResponse> => {
  const backendResponse = await api.uploadImage<BackendFoodRecognitionResponse>(
    '/api/v1/nutrition/analyze',
    imageUri
  );

  // Transform backend response to frontend format
  const detectedFoods: DetectedFood[] = backendResponse.items.map((item) => ({
    id: item.foodKey,
    name: item.displayName,
    amount: item.estimatedGrams,
    unit: 'g',
    calories: Math.round(item.nutrition?.calories || 0),
    protein: Math.round(item.nutrition?.protein || 0),
    carbs: Math.round(item.nutrition?.carbs || 0),
    fat: Math.round(item.nutrition?.fat || 0),
    confidence: item.confidence,
  }));

  return {
    success: true,
    detectedFoods,
    total: {
      calories: Math.round(backendResponse.totalNutrition.calories),
      protein: Math.round(backendResponse.totalNutrition.protein),
      carbs: Math.round(backendResponse.totalNutrition.carbs),
      fat: Math.round(backendResponse.totalNutrition.fat),
    },
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
};
