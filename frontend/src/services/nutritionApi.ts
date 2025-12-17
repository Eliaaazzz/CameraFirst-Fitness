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
  // Build request body, filtering out null/undefined values to avoid serialization issues
  const body: Record<string, any> = {
    mealType: payload.mealType,
    consumedAt: payload.consumedAt || new Date().toISOString(),
  };

  // Only include optional fields if they have values
  if (payload.mealPlanId != null) body.mealPlanId = payload.mealPlanId;
  if (payload.mealDay != null) body.mealDay = payload.mealDay;
  if (payload.recipeId != null) body.recipeId = payload.recipeId;
  if (payload.recipeName != null) body.recipeName = payload.recipeName;
  if (payload.calories != null) body.calories = payload.calories;
  if (payload.protein != null) body.protein = payload.protein;
  if (payload.carbs != null) body.carbs = payload.carbs;
  if (payload.fat != null) body.fat = payload.fat;
  if (payload.notes != null) body.notes = payload.notes;
  if (payload.imageUrl != null) body.imageUrl = payload.imageUrl;

  // Only include userId if not using 'me' (JWT-based auth)
  const resolvedUserId = resolveUserId(userId);
  if (resolvedUserId) {
    body.userId = resolvedUserId;
  }

  console.log('[NutritionApi] logMeal body:', JSON.stringify(body, null, 2));

  return await api.post<MealLogResponse>('/api/v1/meals', body);
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
  // Validate nutrition values - ensure they're valid numbers
  const calories = Math.round(payload.totalNutrition.calories || 0);
  const protein = Math.round(payload.totalNutrition.protein || 0);
  const carbs = Math.round(payload.totalNutrition.carbs || 0);
  const fat = Math.round(payload.totalNutrition.fat || 0);

  // Validate that we have at least some nutrition data
  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
    throw new Error('No nutrition data available to save');
  }

  // Build food items in the format expected by backend (CreateMealRequest.FoodItemRequest)
  const foodItems = payload.items.map((item, index) => ({
    foodKey: `detected_${index}_${item.name.toLowerCase().replace(/\s+/g, '_')}`,
    displayName: item.name,
    grams: Math.round(item.amount),
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
    confidence: item.confidence || 0.8,
  }));

  // Build the request payload matching CreateMealRequest structure
  // The backend will extract userId from JWT token when using 'me' user ID
  const mealPayload = {
    userId: undefined as any, // Will be overridden by backend from JWT
    mealType: payload.mealType || 'other',
    items: foodItems,
    note: payload.notes || `Detected: ${payload.items.map(f => f.name).join(', ')}`.slice(0, 500),
    imageUrl: null, // Local file URIs are not accessible server-side
  };

  console.log('[NutritionApi] Saving meal with payload:', JSON.stringify(mealPayload, null, 2));

  // POST to /api/v1/meals and let backend extract userId from JWT token
  return await api.post<MealLogResponse>('/api/v1/meals', mealPayload);
};

export default {
  logMeal,
  getDailySummary,
  getWeeklySummary,
  getWeeklyInsight,
  analyzeFoodImage,
  saveMealFromImage,
};
