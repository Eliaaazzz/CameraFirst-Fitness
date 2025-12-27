/**
 * Saved Items API
 * Handles saving and retrieving saved workouts and recipes
 */

import type { SavedRecipe, SavedWorkout } from '@/types';
import { api } from './apiClient';

/**
 * Page result shape returned by the backend (after ApiEnvelope unwrap).
 * Keep legacy `data.items` access for older responses.
 */
interface PageResult<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
}

const extractItems = <T>(response: any): PageResult<T> | null => {
  if (!response) return null;
  // New shape: { items, page, size, total, hasNext }
  if (Array.isArray(response.items)) {
    return response as PageResult<T>;
  }
  // Legacy shape: { data: { items, ... } }
  if (response.data && Array.isArray(response.data.items)) {
    return response.data as PageResult<T>;
  }
  return null;
};

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
  const response = await api.get<PageResult<SavedWorkout>>(`/api/v1/workouts/saved?userId=${userId}`);
  const page = extractItems<SavedWorkout>(response);
  return page?.items ?? [];
}

/**
 * Get all saved recipes for a user
 */
export async function getSavedRecipes(userId?: string): Promise<SavedRecipe[]> {
  if (!userId) {
    return [];
  }
  const response = await api.get<PageResult<SavedRecipe>>(`/api/v1/recipes/saved?userId=${userId}`);
  const page = extractItems<SavedRecipe>(response);
  return page?.items ?? [];
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
