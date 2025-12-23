/**
 * Recommendation API Service
 * Handles fetching personalized content recommendations based on fitness goals
 */

import { useQuery } from '@tanstack/react-query';
import { api } from './apiClient';
import type { RecipeCard, WorkoutCard } from '@/types';

/**
 * Dashboard recommendation response from the API
 */
export interface DashboardRecommendationResponse {
  fitnessGoal: string;
  goalLabel: string;
  workouts: WorkoutCard[];
  recipes: RecipeCard[];
  latencyMs: number;
}

/**
 * Fetch dashboard recommendations for a specific fitness goal.
 * Returns top 5 workouts and top 5 recipes matching the goal.
 *
 * @param goal The fitness goal (e.g., "LOSE_WEIGHT", "GAIN_MUSCLE", "MAINTAIN", "STRENGTH")
 */
export async function getDashboardRecommendations(
  goal: string
): Promise<DashboardRecommendationResponse> {
  return api.get<DashboardRecommendationResponse>(
    `/api/v1/recommendations/dashboard?goal=${encodeURIComponent(goal)}`
  );
}

/**
 * Map frontend goal types to API goal values.
 * Handles various naming conventions used in the app.
 */
export function normalizeGoalForApi(goal: string | null | undefined): string {
  if (!goal) return 'MAINTAIN';

  const normalized = goal.toUpperCase().trim();

  // Map common variations
  if (normalized.includes('FAT') || normalized.includes('LOSS') || normalized.includes('LOSE')) {
    return 'LOSE_WEIGHT';
  }
  if (normalized.includes('MUSCLE') || normalized.includes('GAIN') || normalized.includes('BUILD')) {
    return 'GAIN_MUSCLE';
  }
  if (normalized.includes('STRENGTH') || normalized.includes('POWER')) {
    return 'STRENGTH';
  }
  if (normalized.includes('MAINTAIN') || normalized.includes('HEALTH') || normalized.includes('BALANCE')) {
    return 'MAINTAIN';
  }
  if (normalized.includes('BLOOD') || normalized.includes('SUGAR') || normalized.includes('DIABETES')) {
    return 'MAINTAIN'; // Map blood sugar control to maintain
  }

  return normalized;
}

/**
 * React Query hook for fetching dashboard recommendations.
 * Automatically handles caching, refetching, and error states.
 *
 * @param goal The user's fitness goal
 * @param enabled Whether to enable the query (default: true)
 */
export function useDashboardRecommendations(
  goal: string | null | undefined,
  enabled: boolean = true
) {
  const normalizedGoal = normalizeGoalForApi(goal);

  return useQuery({
    queryKey: ['dashboardRecommendations', normalizedGoal],
    queryFn: () => getDashboardRecommendations(normalizedGoal),
    enabled: enabled && !!normalizedGoal,
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
