import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';

import { ApiResponse, RecipeCard, SearchParams, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard } from '@/types';
import { API_BASE_URL, API_TIMEOUT, YOUTUBE_API_KEY, API_KEY } from '@env';

const timeout = Number(API_TIMEOUT) || 5000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(Platform.OS !== 'web' && { 'User-Agent': `FitnessMVPMobile/${Platform.OS}` }),
    'X-YouTube-Key': YOUTUBE_API_KEY ?? '',
    'X-API-Key': API_KEY ?? 'mobile-app-default-key-2024-fitness',
  },
});

if (__DEV__) {
  api.interceptors.request.use((config) => {
    // eslint-disable-next-line no-console
    console.info('[API] →', config.method?.toUpperCase(), config.baseURL ? `${config.baseURL}${config.url}` : config.url, {
      params: config.params,
      data: config.data instanceof FormData ? '[FormData]' : config.data,
    });
    return config;
  });
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = normalizeErrorMessage(error);
    return Promise.reject(new Error(message));
  },
);

const normalizeErrorMessage = (error: AxiosError) => {
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out, try again.';
  }

  if (error.message === 'Network Error') {
    return 'Check internet connection and try again.';
  }

  const status = error.response?.status ?? 0;

  if (status >= 500) {
    return 'Something went wrong, try again.';
  }

  if (status === 0) {
    return 'Unable to reach the server. Please try again later.';
  }

  const data = error.response?.data as ApiResponse<unknown> | undefined;
  const apiMessage = typeof data?.message === 'string' ? data.message : undefined;

  if (apiMessage) {
    return apiMessage;
  }

  return 'Request failed. Please try again.';
};

const buildImageFormData = (imageUri: string, field: string, payload?: Record<string, unknown>) => {
  const formData = new FormData();
  const fileName = imageUri.split('/').pop() ?? 'upload.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

  formData.append(field, {
    uri: imageUri,
    name: fileName,
    type: mimeType,
  } as any);

  if (payload) {
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
        return;
      }

      formData.append(key, String(value));
    });
  }

  return formData;
};

export const __testables = {
  buildImageFormData,
};

export const uploadWorkoutImage = async (
  imageUri: string,
  metadata?: UploadWorkoutPayload,
): Promise<WorkoutCard[]> => {
  const formData = buildImageFormData(
    imageUri,
    'image',
    metadata ? (metadata as unknown as Record<string, unknown>) : undefined,
  );
  const response = await api.post<ApiResponse<WorkoutCard[]>>('/api/v1/workouts/from-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const uploadRecipeImage = async (
  imageUri: string,
  payload?: UploadRecipePayload,
): Promise<RecipeCard[]> => {
  const formData = buildImageFormData(
    imageUri,
    'image',
    payload ? (payload as unknown as Record<string, unknown>) : undefined,
  );
  const response = await api.post<ApiResponse<RecipeCard[]>>('/api/v1/recipes/from-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const saveWorkout = async (workoutId: string): Promise<boolean> => {
  const response = await api.post<ApiResponse<{ success: boolean }>>('/api/v1/workouts/save', { workoutId });
  return response.data.data.success;
};

export const saveRecipe = async (recipeId: string): Promise<boolean> => {
  const response = await api.post<ApiResponse<{ success: boolean }>>('/api/v1/recipes/save', { recipeId });
  return response.data.data.success;
};

export const getSavedWorkouts = async (): Promise<WorkoutCard[]> => {
  const response = await api.get<ApiResponse<WorkoutCard[]>>('/api/v1/workouts/saved');
  return response.data.data;
};

export const getSavedRecipes = async (): Promise<RecipeCard[]> => {
  const response = await api.get<ApiResponse<RecipeCard[]>>('/api/v1/recipes/saved');
  return response.data.data;
};

export const removeWorkout = async (workoutId: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<{ success: boolean }>>(`/api/v1/workouts/saved/${workoutId}`);
  return response.data.data.success;
};

export const removeRecipe = async (recipeId: string): Promise<boolean> => {
  const response = await api.delete<ApiResponse<{ success: boolean }>>(`/api/v1/recipes/saved/${recipeId}`);
  return response.data.data.success;
};

export const getMealLogLeaderboard = async (scope: 'weekly' | 'daily', limit: number): Promise<any> => {
  const response = await api.get<ApiResponse<any>>(`/api/v1/leaderboard/meal-logs`, {
    params: { scope, limit }
  });
  return response.data.data ?? { entries: [], scope, limit };
};

// ============================================================================
// Text Search APIs
// ============================================================================

export interface WorkoutSearchResponse {
  workouts: WorkoutCard[];
  totalResults: number;
  query: string;
  latencyMs: number;
}

export interface RecipeSearchResponse {
  recipes: RecipeCard[];
  totalResults: number;
  latencyMs: number;
}

export const searchWorkouts = async (params: SearchParams): Promise<WorkoutSearchResponse> => {
  try {
    const response = await api.get<ApiResponse<WorkoutSearchResponse>>('/api/v1/workouts/search', {
      params: {
        query: params.query,
        level: params.level,
        maxDuration: params.maxDuration,
      },
    });

    if (!response.data?.data) {
      return {
        workouts: [],
        totalResults: 0,
        query: params.query,
        latencyMs: 0,
      };
    }

    return response.data.data;
  } catch (error) {
    console.error('Search workouts failed:', error);
    return {
      workouts: [],
      totalResults: 0,
      query: params.query,
      latencyMs: 0,
    };
  }
};

export const searchRecipes = async (params: SearchParams): Promise<RecipeSearchResponse> => {
  try {
    const response = await api.get<ApiResponse<RecipeSearchResponse>>('/api/v1/recipes/search-text', {
      params: {
        query: params.query,
        maxTime: params.maxTime,
      },
    });

    if (!response.data?.data) {
      return {
        recipes: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    return response.data.data;
  } catch (error) {
    console.error('Search recipes failed:', error);
    return {
      recipes: [],
      totalResults: 0,
      latencyMs: 0,
    };
  }
};
