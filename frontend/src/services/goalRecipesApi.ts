/**
 * Goal-based Recipe API
 * Fetches recipes filtered by fitness goals (Build Muscle, Fat Loss, Nutrition Balance)
 */

import { RecipeCard } from '@/types';
import { get } from './apiClient';

/**
 * Fitness goal types supported by the API
 */
export type FitnessGoal =
  | 'GAIN_MUSCLE'      // High protein recipes for muscle building
  | 'LOSE_WEIGHT'      // Low calorie recipes for fat loss
  | 'BLOOD_SUGAR'      // Low carb recipes for blood sugar control
  | 'MAINTAIN'         // Balanced nutrition
  | 'STRENGTH';        // High protein for strength training

/**
 * Goal configuration with display info
 */
export interface GoalConfig {
  id: FitnessGoal;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;        // MaterialCommunityIcons name
  color: string;       // Accent color
  nutritionFocus: string;
}

/**
 * Available fitness goals with their configurations
 */
export const FITNESS_GOALS: GoalConfig[] = [
  {
    id: 'GAIN_MUSCLE',
    label: 'Build Muscle',
    shortLabel: 'Muscle',
    description: 'High protein recipes to support muscle growth',
    icon: 'arm-flex',
    color: '#7C3AED',  // Purple
    nutritionFocus: 'High Protein',
  },
  {
    id: 'LOSE_WEIGHT',
    label: 'Fat Loss',
    shortLabel: 'Fat Loss',
    description: 'Low calorie recipes for weight management',
    icon: 'fire',
    color: '#F97316',  // Orange
    nutritionFocus: 'Low Calorie',
  },
  {
    id: 'BLOOD_SUGAR',
    label: 'Nutrition Balance',
    shortLabel: 'Balanced',
    description: 'Lighter carb recipes for steadier energy',
    icon: 'leaf',
    color: '#06B6D4',  // Cyan
    nutritionFocus: 'Low Carb',
  },
];

/**
 * Recipe search response from the API
 */
interface RecipeSearchResponse {
  recipes: RecipeCard[];
  totalResults: number;
  latencyMs: number;
  fromCache: boolean;
}

/**
 * Fetch recipes by fitness goal
 *
 * @param goal - The fitness goal to filter by (GAIN_MUSCLE, LOSE_WEIGHT, BLOOD_SUGAR, etc.)
 * @param limit - Maximum number of recipes to return (default: 20, max: 50)
 * @returns List of recipes matching the goal
 */
export async function getRecipesByGoal(goal: string, limit: number = 20): Promise<RecipeCard[]> {
  try {
    const response = await get<RecipeSearchResponse>(
      `/api/v1/recipes/by-goal?goal=${encodeURIComponent(goal)}&limit=${limit}`
    );
    return response.recipes || [];
  } catch (error) {
    console.error('[GoalRecipesApi] Failed to fetch recipes:', error);
    throw error;
  }
}

/**
 * Get the display configuration for a goal
 */
export function getGoalConfig(goalId: string): GoalConfig | undefined {
  return FITNESS_GOALS.find(g => g.id === goalId);
}

/**
 * Normalize a goal string to the standard enum value
 */
export function normalizeGoal(goal: string): FitnessGoal {
  const upper = goal.toUpperCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');

  if (upper.includes('MUSCLE') || upper.includes('GAIN') || upper.includes('BUILD')) {
    return 'GAIN_MUSCLE';
  }
  if (upper.includes('WEIGHT') || upper.includes('FAT') || upper.includes('LOSS') || upper.includes('LOSE')) {
    return 'LOSE_WEIGHT';
  }
  if (upper.includes('BLOOD') || upper.includes('SUGAR') || upper.includes('DIABETES') || upper.includes('GLYCEMIC')) {
    return 'BLOOD_SUGAR';
  }
  if (upper.includes('STRENGTH') || upper.includes('POWER')) {
    return 'STRENGTH';
  }

  return 'MAINTAIN';
}
