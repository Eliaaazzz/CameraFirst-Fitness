import {
  logWeight,
  getWeightHistory,
  getRecentWeightLogs,
  getWeightStats,
  deleteWeightLog,
  weightQueryKeys,
  type WeightLogRequest,
  type WeightLogResponse,
  type WeightStatsResponse,
} from '../weightApi';
import { apiClient } from '../apiClient';

// Mock apiClient
jest.mock('../apiClient', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe('weightApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // logWeight Tests
  // =========================================================================

  describe('logWeight()', () => {
    it('should call API with correct payload', async () => {
      // Given
      const request: WeightLogRequest = {
        weightKg: 75.5,
        logDate: '2024-01-15',
        bodyFatPercentage: 18.5,
        muscleMassKg: 35,
        note: 'Morning weigh-in',
      };

      const mockResponse: WeightLogResponse = {
        id: 1,
        weightKg: 75.5,
        logDate: '2024-01-15',
        bodyFatPercentage: 18.5,
        muscleMassKg: 35,
        note: 'Morning weigh-in',
        createdAt: '2024-01-15T08:00:00Z',
      };

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await logWeight(request);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle minimal payload (weight only)', async () => {
      // Given
      const request: WeightLogRequest = {
        weightKg: 70,
      };

      const mockResponse: WeightLogResponse = {
        id: 2,
        weightKg: 70,
        logDate: '2024-01-15',
        createdAt: '2024-01-15T08:00:00Z',
      };

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await logWeight(request);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      expect(result.id).toBe(2);
    });

    it('should propagate API errors', async () => {
      // Given
      const request: WeightLogRequest = { weightKg: 75 };
      mockApiClient.mockRejectedValueOnce(new Error('Network error'));

      // When & Then
      await expect(logWeight(request)).rejects.toThrow('Network error');
    });
  });

  // =========================================================================
  // getWeightHistory Tests
  // =========================================================================

  describe('getWeightHistory()', () => {
    it('should fetch weight history with date range', async () => {
      // Given
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const mockResponse: WeightLogResponse[] = [
        { id: 1, weightKg: 75, logDate: '2024-01-15', createdAt: '2024-01-15T08:00:00Z' },
        { id: 2, weightKg: 74.5, logDate: '2024-01-10', createdAt: '2024-01-10T08:00:00Z' },
      ];

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await getWeightHistory(startDate, endDate);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith(
        `/api/v1/weight/history?startDate=${startDate}&endDate=${endDate}`
      );
      expect(result).toHaveLength(2);
      expect(result[0].weightKg).toBe(75);
    });
  });

  // =========================================================================
  // getRecentWeightLogs Tests
  // =========================================================================

  describe('getRecentWeightLogs()', () => {
    it('should fetch recent logs with default limit', async () => {
      // Given
      const mockResponse: WeightLogResponse[] = [
        { id: 1, weightKg: 75, logDate: '2024-01-15', createdAt: '2024-01-15T08:00:00Z' },
      ];

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await getRecentWeightLogs();

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight/recent?limit=30');
      expect(result).toHaveLength(1);
    });

    it('should fetch recent logs with custom limit', async () => {
      // Given
      mockApiClient.mockResolvedValueOnce([]);

      // When
      await getRecentWeightLogs(10);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight/recent?limit=10');
    });
  });

  // =========================================================================
  // getWeightStats Tests
  // =========================================================================

  describe('getWeightStats()', () => {
    it('should fetch weight stats with default days', async () => {
      // Given
      const mockResponse: WeightStatsResponse = {
        currentWeight: 72,
        targetWeight: 70,
        startWeight: 75,
        weightChange: -3,
        weightChangePercent: -4,
        bmi: 23.5,
        lastLogDate: '2024-01-15',
        totalLogs: 10,
        trend: 'losing',
        progressMessage: 'Great progress!',
        history: [],
      };

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await getWeightStats();

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight/stats?days=30');
      expect(result.currentWeight).toBe(72);
      expect(result.trend).toBe('losing');
    });

    it('should fetch weight stats with custom days', async () => {
      // Given
      const mockResponse: WeightStatsResponse = {
        currentWeight: null,
        targetWeight: null,
        startWeight: null,
        weightChange: null,
        weightChangePercent: null,
        bmi: null,
        lastLogDate: null,
        totalLogs: 0,
        trend: 'stable',
        progressMessage: 'Start logging!',
        history: [],
      };

      mockApiClient.mockResolvedValueOnce(mockResponse);

      // When
      const result = await getWeightStats(90);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight/stats?days=90');
      expect(result.totalLogs).toBe(0);
    });
  });

  // =========================================================================
  // deleteWeightLog Tests
  // =========================================================================

  describe('deleteWeightLog()', () => {
    it('should call delete API with correct ID', async () => {
      // Given
      mockApiClient.mockResolvedValueOnce(undefined);

      // When
      await deleteWeightLog(123);

      // Then
      expect(mockApiClient).toHaveBeenCalledWith('/api/v1/weight/123', {
        method: 'DELETE',
      });
    });
  });

  // =========================================================================
  // Query Keys Tests
  // =========================================================================

  describe('weightQueryKeys', () => {
    it('should generate correct query keys', () => {
      expect(weightQueryKeys.all).toEqual(['weight']);
      expect(weightQueryKeys.stats(30)).toEqual(['weight', 'stats', 30]);
      expect(weightQueryKeys.history('2024-01-01', '2024-01-31')).toEqual([
        'weight',
        'history',
        '2024-01-01',
        '2024-01-31',
      ]);
      expect(weightQueryKeys.recent(10)).toEqual(['weight', 'recent', 10]);
    });
  });
});
