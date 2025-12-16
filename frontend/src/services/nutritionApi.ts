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
  imageUrl?: string | null;
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
  fiber?: number;
  sugar?: number;
  confidence?: number;
}

export interface TotalNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  netCarbs?: number;
  sugarCubes?: number;
}

export interface FoodRecognitionResponse {
  items: DetectedFood[];
  totalNutrition: TotalNutrition;
  suggestedMealType?: string;
}

// Backend API types (matching Java @JsonProperty snake_case)
interface BackendNutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
  netCarbs?: number;
  sugarCubes?: number;
}

interface BackendRecognizedFood {
  food_key: string;
  display_name: string;
  estimated_grams: number;
  cooking_method?: string;
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
  items: DetectedFood[];
  totalNutrition: TotalNutrition;
  mealType?: string;
  notes?: string;
}

// When userId is 'me', the backend extracts user from JWT token
// Otherwise use the provided userId
const resolveUserId = (userId: string): string | undefined => {
  if (userId === 'me') {
    return undefined; // Backend will use authenticated user from JWT
  }
  return userId;
};

const logMeal = async (userId: string, payload: LogMealPayload): Promise<MealLogResponse> => {
  const body: Record<string, any> = {
    consumedAt: new Date().toISOString(),
    ...payload,
  };

  // Only include userId if not using 'me' (JWT-based auth)
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    body.userId = resolvedUserId;
  }

  return await api.post<MealLogResponse>('/api/v1/nutrition/meals', body);
};

const getDailySummary = async (userId: string, date?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams();
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    queryParams.append('userId', resolvedUserId);
  }
  if (date) {
    queryParams.append('date', date);
  }
  const queryString = queryParams.toString();
  return await api.get<NutritionSummaryResponse>(
    `/api/v1/nutrition/summary/daily${queryString ? `?${queryString}` : ''}`
  );
};

const getWeeklySummary = async (userId: string, weekStart?: string): Promise<NutritionSummaryResponse> => {
  const queryParams = new URLSearchParams();
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    queryParams.append('userId', resolvedUserId);
  }
  if (weekStart) {
    queryParams.append('weekStart', weekStart);
  }
  const queryString = queryParams.toString();
  return await api.get<NutritionSummaryResponse>(
    `/api/v1/nutrition/summary/weekly${queryString ? `?${queryString}` : ''}`
  );
};

const getWeeklyInsight = async (userId: string, weekStart?: string): Promise<NutritionInsightResponse> => {
  const queryParams = new URLSearchParams();
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    queryParams.append('userId', resolvedUserId);
  }
  if (weekStart) {
    queryParams.append('weekStart', weekStart);
  }
  const queryString = queryParams.toString();
  return await api.get<NutritionInsightResponse>(
    `/api/v1/nutrition/insights/weekly${queryString ? `?${queryString}` : ''}`
  );
};

// Transform backend response to frontend format
const transformBackendResponse = (backendResponse: BackendFoodRecognitionResponse): FoodRecognitionResponse => {
  const items: DetectedFood[] = backendResponse.items.map((item, index) => ({
    id: item.food_key || `item-${index}`,
    name: item.display_name || 'Unknown Food',
    amount: item.estimated_grams || 100,
    unit: 'g',
    calories: item.nutrition?.calories || 0,
    protein: item.nutrition?.protein || 0,
    carbs: item.nutrition?.carbs || 0,
    fat: item.nutrition?.fat || 0,
    fiber: item.nutrition?.fiber,
    sugar: item.nutrition?.sugar,
    confidence: item.confidence,
  }));

  const totalNutrition: TotalNutrition = {
    calories: backendResponse.totalNutrition?.calories || 0,
    protein: backendResponse.totalNutrition?.protein || 0,
    carbs: backendResponse.totalNutrition?.carbs || 0,
    fat: backendResponse.totalNutrition?.fat || 0,
    fiber: backendResponse.totalNutrition?.fiber,
    sugar: backendResponse.totalNutrition?.sugar,
    netCarbs: backendResponse.totalNutrition?.netCarbs,
    sugarCubes: backendResponse.totalNutrition?.sugarCubes,
  };

  return {
    items,
    totalNutrition,
    suggestedMealType: backendResponse.suggestedMealType,
  };
};

// Analyze food image with Gemini AI
const analyzeFoodImage = async (imageUri: string): Promise<FoodRecognitionResponse> => {
  const backendResponse = await api.uploadImage<BackendFoodRecognitionResponse>(
    '/api/v1/nutrition/analyze',
    imageUri
  );

  console.log('[NutritionApi] Backend response:', JSON.stringify(backendResponse, null, 2));

  // Transform backend response to frontend format
  const transformedResponse = transformBackendResponse(backendResponse);

  console.log('[NutritionApi] Transformed response:', JSON.stringify(transformedResponse, null, 2));

  return transformedResponse;
};

// Save analyzed meal to today's log
const saveMealFromImage = async (payload: SaveMealPayload): Promise<MealLogResponse> => {
  // For now, we'll save the total nutrition as a single meal
  const mealPayload: LogMealPayload = {
    mealType: payload.mealType || 'other',
    recipeName: 'AI Detected Meal',
    calories: Math.round(payload.totalNutrition.calories),
    protein: Math.round(payload.totalNutrition.protein),
    carbs: Math.round(payload.totalNutrition.carbs),
    fat: Math.round(payload.totalNutrition.fat),
    consumedAt: new Date().toISOString(),
    notes: payload.notes || `Detected: ${payload.items.map(f => f.name).join(', ')}`,
    imageUrl: payload.imageUri,
  };

  // Use 'me' to let the backend extract user from JWT token
  return await logMeal('me', mealPayload);
};

export default {
  logMeal,
  getDailySummary,
  getWeeklySummary,
  getWeeklyInsight,
  analyzeFoodImage,
  saveMealFromImage,
};
