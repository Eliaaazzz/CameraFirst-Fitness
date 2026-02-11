/**
 * Saved Items API
 * Handles saving and retrieving saved workouts and recipes
 */

import type { SavedRecipe, SavedWorkout } from '@/types';
import { Platform } from 'react-native';
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

const WEB_CACHE_TTL_MS = 60 * 1000; // 60s, aligned with backend Cache-Control max-age=60
const WEB_CACHE_PREFIX = 'aurafit:saved-items:v1';

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

interface SavedItemsWebCache<T> {
  cachedAt: number;
  items: T[];
}

const getWebSessionStorage = (): StorageLike | null => {
  if (Platform.OS !== 'web') {
    return null;
  }
  const globalStorage = (globalThis as any)?.sessionStorage;
  if (!globalStorage) {
    return null;
  }
  return globalStorage as StorageLike;
};

const webCacheKey = (resource: 'workouts' | 'recipes', userId: string) =>
  `${WEB_CACHE_PREFIX}:${resource}:${userId}`;

const readWebCache = <T>(key: string): T[] | null => {
  const storage = getWebSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SavedItemsWebCache<T>;
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.cachedAt !== 'number') {
      storage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.cachedAt > WEB_CACHE_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed.items;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

const writeWebCache = <T>(key: string, items: T[]): void => {
  const storage = getWebSessionStorage();
  if (!storage) {
    return;
  }
  const payload: SavedItemsWebCache<T> = {
    cachedAt: Date.now(),
    items,
  };
  storage.setItem(key, JSON.stringify(payload));
};

const invalidateWebCache = (resource: 'workouts' | 'recipes', userId?: string): void => {
  if (!userId) {
    return;
  }
  const storage = getWebSessionStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(webCacheKey(resource, userId));
};

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
  invalidateWebCache('workouts', userId);
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
  invalidateWebCache('recipes', userId);
  return response;
}

/**
 * Get all saved workouts for a user
 */
export async function getSavedWorkouts(userId?: string): Promise<SavedWorkout[]> {
  if (!userId) {
    return [];
  }
  const cacheKey = webCacheKey('workouts', userId);
  const cached = readWebCache<SavedWorkout>(cacheKey);
  if (cached) {
    return cached;
  }
  const response = await api.get<PageResult<SavedWorkout>>(`/api/v1/workouts/saved?userId=${userId}`);
  const page = extractItems<SavedWorkout>(response);
  const items = page?.items ?? [];
  writeWebCache(cacheKey, items);
  return items;
}

/**
 * Get all saved recipes for a user
 */
export async function getSavedRecipes(userId?: string): Promise<SavedRecipe[]> {
  if (!userId) {
    return [];
  }
  const cacheKey = webCacheKey('recipes', userId);
  const cached = readWebCache<SavedRecipe>(cacheKey);
  if (cached) {
    return cached;
  }
  const response = await api.get<PageResult<SavedRecipe>>(`/api/v1/recipes/saved?userId=${userId}`);
  const page = extractItems<SavedRecipe>(response);
  const items = page?.items ?? [];
  writeWebCache(cacheKey, items);
  return items;
}

/**
 * Remove a saved workout from user's library
 */
export async function removeSavedWorkout(workoutId: string, userId?: string): Promise<void> {
  const url = userId
    ? `/api/v1/workouts/saved/${workoutId}?userId=${userId}`
    : `/api/v1/workouts/saved/${workoutId}`;
  await api.delete(url);
  invalidateWebCache('workouts', userId);
}

/**
 * Remove a saved recipe from user's library
 */
export async function removeSavedRecipe(recipeId: string, userId?: string): Promise<void> {
  const url = userId
    ? `/api/v1/recipes/saved/${recipeId}?userId=${userId}`
    : `/api/v1/recipes/saved/${recipeId}`;
  await api.delete(url);
  invalidateWebCache('recipes', userId);
}

/**
 * Get full recipe details by ID (includes ingredients and steps)
 */
export async function getRecipeById(recipeId: string): Promise<SavedRecipe | null> {
  try {
    const response = await api.get<SavedRecipe>(`/api/v1/recipes/${recipeId}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch recipe by ID:', error);
    return null;
  }
}
