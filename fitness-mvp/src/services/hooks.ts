import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getSavedRecipes,
  getSavedWorkouts,
  saveRecipe,
  saveWorkout,
  uploadRecipeImage,
  uploadWorkoutImage,
} from './api';
import { RecipeCard, UploadRecipePayload, UploadWorkoutPayload, WorkoutCard } from '@/types';

const mutationKeys = {
  uploadWorkout: ['upload', 'workout'] as const,
  uploadRecipe: ['upload', 'recipe'] as const,
  saveWorkout: (id: string) => ['save', 'workout', id] as const,
  saveRecipe: (id: string) => ['save', 'recipe', id] as const,
};

const queryKeys = {
  savedWorkouts: ['workouts', 'saved'] as const,
  savedRecipes: ['recipes', 'saved'] as const,
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

export const useSaveWorkout = () =>
  useMutation<boolean, Error, string>({
    mutationKey: ['save', 'workout'],
    mutationFn: (workoutId) => saveWorkout(workoutId),
  });

export const useSaveRecipe = () =>
  useMutation<boolean, Error, string>({
    mutationKey: ['save', 'recipe'],
    mutationFn: (recipeId) => saveRecipe(recipeId),
  });

export const useSavedWorkouts = () =>
  useQuery<WorkoutCard[], Error>({
    queryKey: queryKeys.savedWorkouts,
    queryFn: getSavedWorkouts,
  });

export const useSavedRecipes = () =>
  useQuery<RecipeCard[], Error>({
    queryKey: queryKeys.savedRecipes,
    queryFn: getSavedRecipes,
  });
