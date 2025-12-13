import { MealLogResponse, NutritionInsightResponse, NutritionSummaryResponse } from '@/types/mealPlan';
import { api } from './apiClient';

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
  items: DetectedFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  suggestedMealType?: string;
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

/**
 * Transform backend response to frontend format
 */
function transformBackendResponse(backendResponse: BackendFoodRecognitionResponse): FoodRecognitionResponse {
  const items: DetectedFood[] = backendResponse.items.map((item, index) => ({
    id: item.foodKey || `food_${index}`,
    name: item.displayName || 'Unknown Food',
    amount: item.estimatedGrams || 100,
    unit: 'g',
    calories: item.nutrition?.calories || 0,
    protein: item.nutrition?.protein || 0,
    carbs: item.nutrition?.carbs || 0,
    fat: item.nutrition?.fat || 0,
    confidence: item.confidence || 0,
  }));

  return {
    items,
    totalNutrition: {
      calories: backendResponse.totalNutrition.calories || 0,
      protein: backendResponse.totalNutrition.protein || 0,
      carbs: backendResponse.totalNutrition.carbs || 0,
      fat: backendResponse.totalNutrition.fat || 0,
    },
    suggestedMealType: backendResponse.suggestedMealType,
  };
}

export interface SaveMealPayload {
  imageUri: string;
  items: DetectedFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType?: string;
  notes?: string;
}

// Default user UUID used across the app
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const logMeal = async (userId: string, payload: LogMealPayload): Promise<MealLogResponse> => {
  // Convert 'default-user' to the actual UUID the backend expects
  const actualUserId = userId === 'default-user' ? DEFAULT_USER_ID : userId;
  return await api.post<MealLogResponse>('/api/v1/nutrition/meals', {
    userId: actualUserId,
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
  try {
    const backendResponse = await api.uploadImage<BackendFoodRecognitionResponse>(
      '/api/v1/nutrition/analyze',
      imageUri
    );
    
    // Transform backend response to frontend format
    return transformBackendResponse(backendResponse);
  } catch (error) {
    console.error('Food recognition error:', error);
    throw error;
  }
};

// Save analyzed meal to today's log
const saveMealFromImage = async (payload: SaveMealPayload): Promise<MealLogResponse> => {
  // For now, we'll save the total nutrition as a single meal
  const mealPayload: LogMealPayload = {
    mealType: payload.mealType || 'other',
    recipeName: 'AI Detected Meal',
    calories: payload.totalNutrition.calories,
    protein: payload.totalNutrition.protein,
    carbs: payload.totalNutrition.carbs,
    fat: payload.totalNutrition.fat,
    consumedAt: new Date().toISOString(),
    notes: payload.notes || `Detected: ${payload.items.map(f => f.name).join(', ')}`,
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
