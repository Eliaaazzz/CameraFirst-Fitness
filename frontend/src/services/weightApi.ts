import { api } from './apiClient';

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
  return await api.post<WeightLogResponse>('/api/v1/weight', request);
}

/**
 * Get weight history within a date range.
 */
export async function getWeightHistory(
  startDate: string,
  endDate: string
): Promise<WeightLogResponse[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return await api.get<WeightLogResponse[]>(`/api/v1/weight/history?${params}`);
}

/**
 * Get recent weight logs.
 */
export async function getRecentWeightLogs(limit = 30): Promise<WeightLogResponse[]> {
  return await api.get<WeightLogResponse[]>(`/api/v1/weight/recent?limit=${limit}`);
}

/**
 * Get comprehensive weight statistics and trends.
 */
export async function getWeightStats(days = 30): Promise<WeightStatsResponse> {
  return await api.get<WeightStatsResponse>(`/api/v1/weight/stats?days=${days}`);
}

/**
 * Delete a weight log entry.
 */
export async function deleteWeightLog(id: number): Promise<void> {
  await api.delete(`/api/v1/weight/${id}`);
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
