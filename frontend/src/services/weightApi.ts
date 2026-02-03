import { apiClient } from './apiClient';

// ============================================================================
// Types
// ============================================================================

export interface WeightLogRequest {
  weightKg: number; // Required
  logDate?: string; // ISO date format: "2024-01-15"
  bodyFatPercentage?: number; // Optional
  muscleMassKg?: number; // Optional
  note?: string; // Optional
}

export interface WeightLogResponse {
  id: number;
  weightKg: number;
  logDate: string;
  bodyFatPercentage?: number;
  muscleMassKg?: number;
  note?: string;
  createdAt: string;
}

export interface WeightStatsResponse {
  currentWeight: number | null;
  targetWeight: number | null;
  startWeight: number | null;
  weightChange: number | null;
  weightChangePercent: number | null;
  bmi: number | null;
  lastLogDate: string | null;
  totalLogs: number;
  trend: 'gaining' | 'losing' | 'stable';
  progressMessage: string;
  history: WeightLogResponse[];
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Log a new weight entry (or update existing entry for the same date).
 */
export async function logWeight(request: WeightLogRequest): Promise<WeightLogResponse> {
  const response = await apiClient<WeightLogResponse>('/api/v1/weight', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response;
}

/**
 * Get weight history within a date range.
 */
export async function getWeightHistory(
  startDate: string,
  endDate: string
): Promise<WeightLogResponse[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await apiClient<WeightLogResponse[]>(`/api/v1/weight/history?${params}`);
  return response;
}

/**
 * Get recent weight logs.
 */
export async function getRecentWeightLogs(limit = 30): Promise<WeightLogResponse[]> {
  const response = await apiClient<WeightLogResponse[]>(`/api/v1/weight/recent?limit=${limit}`);
  return response;
}

/**
 * Get comprehensive weight statistics and trends.
 */
export async function getWeightStats(days = 30): Promise<WeightStatsResponse> {
  const response = await apiClient<WeightStatsResponse>(`/api/v1/weight/stats?days=${days}`);
  return response;
}

/**
 * Delete a weight log entry.
 */
export async function deleteWeightLog(id: number): Promise<void> {
  await apiClient<void>(`/api/v1/weight/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// React Query Hooks (to be used in components)
// ============================================================================

export const weightQueryKeys = {
  all: ['weight'] as const,
  stats: (days: number) => [...weightQueryKeys.all, 'stats', days] as const,
  history: (startDate: string, endDate: string) =>
    [...weightQueryKeys.all, 'history', startDate, endDate] as const,
  recent: (limit: number) => [...weightQueryKeys.all, 'recent', limit] as const,
};
