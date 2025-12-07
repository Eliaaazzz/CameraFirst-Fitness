// Re-export all API modules
export { default as goalsApi } from './goalsApi';
export { default as mealPlanApi } from './mealPlanApi';
export { default as nutritionApi } from './nutritionApi';
export { default as userApi } from './userApi';

// Re-export all exports from goalsApi
export * from './goalsApi';
export * from './notificationService';

// Export image recognition API
export * from './imageRecognitionApi';

// Export saved items API
export * from './savedItemsApi';

// Export API client
export { api } from './apiClient';

// Leaderboard API
import type { LeaderboardPayload } from '@/types';

export const getMealLogLeaderboard = async (
  scope: 'weekly' | 'daily',
  limit: number = 10,
): Promise<LeaderboardPayload> => {
  const { api } = await import('./apiClient');
  const response = await api.get<any>(
    `/api/v1/gamification/leaderboard/meal-logs?scope=${scope}&limit=${limit}`,
  );
  return response.data as LeaderboardPayload;
};
