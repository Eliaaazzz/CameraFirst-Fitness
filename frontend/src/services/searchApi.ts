import { api } from './apiClient';

export interface RecipeSearchResult {
  id: string;
  title: string;
  imageUrl: string | null;
  timeMinutes: number;
  difficulty: string;
  calories: number | null;
  protein: number | null;
  targetGoal: string[] | null;
}

export interface WorkoutSearchResult {
  id: string;
  exerciseName: string;
  exerciseSlug: string;
  primaryCategory: string;
  youtubeId: string;
  thumbnailUrl: string | null;
  targetGoal: string[] | null;
}

/**
 * Search for recipes by title, description, or tags.
 */
export const searchRecipes = async (
  query: string,
  limit: number = 20
): Promise<RecipeSearchResult[]> => {
  if (!query.trim()) return [];

  return api.get<RecipeSearchResult[]>(
    `/api/v1/search/recipes?query=${encodeURIComponent(query)}&limit=${limit}`
  );
};

/**
 * Search for workouts by name, category, or exercise type.
 */
export const searchWorkouts = async (
  query: string,
  limit: number = 20
): Promise<WorkoutSearchResult[]> => {
  if (!query.trim()) return [];

  return api.get<WorkoutSearchResult[]>(
    `/api/v1/search/workouts?query=${encodeURIComponent(query)}&limit=${limit}`
  );
};
