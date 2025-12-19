/**
 * Meal History & Insights API Service
 * Provides functions to fetch meal history and weekly insights
 */

import type {
    MealHistoryParams,
    MealHistoryResponse,
    WeeklyInsightsResponse,
} from '@/types/mealHistory';
import { api } from './apiClient';

/**
 * Get paginated meal history with optional date filtering
 * GET /api/v1/meals/history
 * 
 * @param params Query parameters
 * @returns Paginated meal history
 */
export const getMealHistory = async (
  params: MealHistoryParams = {}
): Promise<MealHistoryResponse> => {
  const queryParams = new URLSearchParams();

  // Add pagination params
  queryParams.append('page', String(params.page ?? 0));
  queryParams.append('size', String(params.size ?? 20));

  // Add date range params if provided
  if (params.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  // Add sort param if provided
  if (params.sort) {
    queryParams.append('sort', params.sort);
  }

  return api.get<MealHistoryResponse>(
    `/api/v1/meals/history?${queryParams.toString()}`
  );
};

/**
 * Get weekly nutrition insights
 * GET /api/v1/meals/insights/weekly
 *
 * @param endDate Optional end date (ISO format: "2025-01-15"), defaults to today
 * @returns Weekly insights data
 */
export const getWeeklyInsights = async (
  endDate?: string
): Promise<WeeklyInsightsResponse> => {
  const queryParams = new URLSearchParams();

  // Add user's timezone for accurate "today" calculation
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) {
    queryParams.append('timezone', timezone);
  }

  if (endDate) {
    queryParams.append('endDate', endDate);
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `/api/v1/meals/insights/weekly?${queryString}`
    : '/api/v1/meals/insights/weekly';

  return api.get<WeeklyInsightsResponse>(url);
};

export default {
  getMealHistory,
  getWeeklyInsights,
};
