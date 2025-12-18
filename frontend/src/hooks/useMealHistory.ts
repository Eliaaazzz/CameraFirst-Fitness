/**
 * React Query hooks for Meal History & Insights
 */

import { getMealHistory, getWeeklyInsights } from '@/services/mealHistoryApi';
import type {
    MealHistoryParams,
    MealHistoryResponse,
    WeeklyInsightsResponse,
} from '@/types/mealHistory';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

/**
 * Hook to fetch paginated meal history
 * 
 * @param params Query parameters (page, size, date range, sort)
 * @param enabled Whether to enable the query (default: true)
 * @returns Query result with meal history data
 * 
 * @example
 * // Basic usage - get first page
 * const { data, isLoading, error } = useMealHistory();
 * 
 * @example
 * // With pagination
 * const { data } = useMealHistory({ page: 1, size: 10 });
 * 
 * @example
 * // With date range
 * const { data } = useMealHistory({
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-15'
 * });
 */
export const useMealHistory = (
  params: MealHistoryParams = {},
  enabled: boolean = true
): UseQueryResult<MealHistoryResponse, Error> => {
  return useQuery({
    queryKey: ['meal-history', params],
    queryFn: () => getMealHistory(params),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes (was cacheTime in v4)
  });
};

/**
 * Hook to fetch weekly nutrition insights
 * 
 * @param endDate Optional end date (ISO format), defaults to today
 * @param enabled Whether to enable the query (default: true)
 * @returns Query result with weekly insights data
 * 
 * @example
 * // Get insights for last 7 days (ending today)
 * const { data, isLoading } = useWeeklyInsights();
 * 
 * @example
 * // Get insights for specific week
 * const { data } = useWeeklyInsights('2025-01-15');
 */
export const useWeeklyInsights = (
  endDate?: string,
  enabled: boolean = true
): UseQueryResult<WeeklyInsightsResponse, Error> => {
  return useQuery({
    queryKey: ['weekly-insights', endDate],
    queryFn: () => getWeeklyInsights(endDate),
    enabled,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
  });
};
