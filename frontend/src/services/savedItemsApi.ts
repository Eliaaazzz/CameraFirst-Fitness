/**
 * Saved Items API
 * Handles saving and retrieving saved workouts and recipes
 */

import type { SavedRecipe, SavedWorkout } from '@/types';
import { api } from './apiClient';

/**
 * Paginated response structure from the API
 */
interface PaginatedResponse<T> {
  data: {
    items: T[];
    page: number;
    size: number;
    total: number;
    hasNext: boolean;
  };
}

/**
 * Save a workout to user's library
 */
export async function saveWorkout(workoutId: string, userId: string): Promise<SavedWorkout> {
  const response = await api.post<SavedWorkout>('/api/v1/workouts/save', {
    workoutId,
    userId,
  });
  return response;
}

/**
 * Save a recipe to user's library
 */
export async function saveRecipe(recipeId: string, userId: string): Promise<SavedRecipe> {
  const response = await api.post<SavedRecipe>('/api/v1/recipes/save', {
    recipeId,
    userId,
  });
  return response;
}

/**
 * Get all saved workouts for a user
 */
export async function getSavedWorkouts(userId?: string): Promise<SavedWorkout[]> {
  if (!userId) {
    return [];
  }
  const response = await api.get<PaginatedResponse<SavedWorkout>>(`/api/v1/workouts/saved?userId=${userId}`);
  // API returns paginated response, extract items array
  return response?.data?.items ?? [];
}

/**
 * Get all saved recipes for a user
 */
export async function getSavedRecipes(userId?: string): Promise<SavedRecipe[]> {
  if (!userId) {
    return [];
  }
  const response = await api.get<PaginatedResponse<SavedRecipe>>(`/api/v1/recipes/saved?userId=${userId}`);
  // API returns paginated response, extract items array
  return response?.data?.items ?? [];
}

/**
 * Remove a saved workout from user's library
 */
export async function removeSavedWorkout(workoutId: string, userId?: string): Promise<void> {
  const url = userId
    ? `/api/v1/workouts/saved/${workoutId}?userId=${userId}`
    : `/api/v1/workouts/saved/${workoutId}`;
  await api.delete(url);
}

/**
 * Remove a saved recipe from user's library
 */
export async function removeSavedRecipe(recipeId: string, userId?: string): Promise<void> {
  const url = userId
    ? `/api/v1/recipes/saved/${recipeId}?userId=${userId}`
    : `/api/v1/recipes/saved/${recipeId}`;
  await api.delete(url);
}
