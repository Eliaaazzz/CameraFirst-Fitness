import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RecipeCard, RecipeSortField, SearchParams, SortDirection, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard, WorkoutSortField } from '@/types';
import {
  getSavedRecipes,
  getSavedWorkouts,
  RecipeSearchResponse,
  removeRecipe,
  removeWorkout,
  saveRecipe,
  saveWorkout,
  searchRecipes,
  searchWorkouts,
  uploadRecipeImage,
  uploadWorkoutImage,
  WorkoutSearchResponse,
} from './api';

// Default pagination/sort constants
export const DEFAULT_SAVED_PAGE_SIZE = 20;

export type WorkoutSortOption = {
  field: WorkoutSortField;
  direction: SortDirection;
};

export type RecipeSortOption = {
  field: RecipeSortField;
  direction: SortDirection;
};

export const DEFAULT_WORKOUT_SORT: WorkoutSortOption = {
  field: 'savedAt',
  direction: 'desc',
};

export const DEFAULT_RECIPE_SORT: RecipeSortOption = {
  field: 'savedAt',
  direction: 'desc',
};

const mutationKeys = {
  uploadWorkout: ['upload', 'workout'] as const,
  uploadRecipe: ['upload', 'recipe'] as const,
  saveWorkout: (userId?: string, id?: string) => ['save', 'workout', userId, id] as const,
  saveRecipe: (userId?: string, id?: string) => ['save', 'recipe', userId, id] as const,
  removeWorkout: (userId?: string, id?: string) => ['remove', 'workout', userId, id] as const,
  removeRecipe: (userId?: string, id?: string) => ['remove', 'recipe', userId, id] as const,
};

const queryKeys = {
  savedWorkouts: (userId?: string) => ['workouts', 'saved', userId] as const,
  savedRecipes: (userId?: string) => ['recipes', 'saved', userId] as const,
};

export const useUploadWorkout = () =>
  useMutation<WorkoutCard[], Error, { uri: string; metadata?: UploadWorkoutPayload }>({
    mutationKey: mutationKeys.uploadWorkout,
    mutationFn: (payload) => uploadWorkoutImage(payload.uri, payload.metadata),
  });

export const useUploadRecipe = () =>
  useMutation<RecipeCard[], Error, { uri: string; payload?: UploadRecipePayload }>({
    mutationKey: mutationKeys.uploadRecipe,
    mutationFn: (payload) => uploadRecipeImage(payload.uri, payload.payload),
  });

export const useSaveWorkout = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.saveWorkout(userId),
    mutationFn: (workoutId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveWorkout(workoutId);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedWorkouts(userId) });
    },
  });
};

export const useSaveRecipe = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.saveRecipe(userId),
    mutationFn: (recipeId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return saveRecipe(recipeId);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRecipes(userId) });
    },
  });
};

export const useSavedWorkouts = (userId?: string) =>
  useQuery<WorkoutCard[], Error>({
    queryKey: queryKeys.savedWorkouts(userId),
    enabled: !!userId,
    queryFn: () => getSavedWorkouts(),
  });

export const useSavedRecipes = (userId?: string) =>
  useQuery<RecipeCard[], Error>({
    queryKey: queryKeys.savedRecipes(userId),
    enabled: !!userId,
    queryFn: () => getSavedRecipes(),
  });

export const useRemoveWorkout = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.removeWorkout(userId),
    mutationFn: (workoutId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return removeWorkout(workoutId);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedWorkouts(userId) });
    },
  });
};

export const useRemoveRecipe = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, string>({
    mutationKey: mutationKeys.removeRecipe(userId),
    mutationFn: (recipeId) => {
      if (!userId) {
        return Promise.reject(new Error('Missing user context'));
      }
      return removeRecipe(recipeId);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRecipes(userId) });
    },
  });
};

// ============================================================================
// Search Hooks
// ============================================================================

export const useSearchWorkouts = (params: SearchParams | null) =>
  useQuery<WorkoutSearchResponse, Error>({
    queryKey: ['search', 'workouts', params?.query, params?.level, params?.maxDuration] as const,
    enabled: !!params?.query && params.query.trim().length > 0,
    queryFn: () => searchWorkouts(params!),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const useSearchRecipes = (params: SearchParams | null) =>
  useQuery<RecipeSearchResponse, Error>({
    queryKey: ['search', 'recipes', params?.query, params?.maxTime] as const,
    enabled: !!params?.query && params.query.trim().length > 0,
    queryFn: () => searchRecipes(params!),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });