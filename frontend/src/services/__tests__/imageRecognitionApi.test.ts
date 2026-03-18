import { getRecommendedRecipes } from '../imageRecognitionApi';
import { api, get } from '../apiClient';

jest.mock('../apiClient', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    uploadImage: jest.fn(),
  },
  get: jest.fn(),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGet = get as jest.MockedFunction<typeof get>;

describe('imageRecognitionApi recipe recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses BUILD_MUSCLE when fitnessGoal is missing', async () => {
    mockApi.post.mockResolvedValueOnce({
      recommendationId: 'rec-1',
      aiAdvice: 'Focus on protein',
      workouts: [],
      recipes: [
        {
          id: 'recipe-1',
          title: 'Chicken Rice Bowl',
          imageUrl: 'https://example.com/recipe-1.jpg',
          nutrition: {
            calories: 520,
            protein: 42,
          },
        },
      ],
    });

    const result = await getRecommendedRecipes(undefined, 'user-1');

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/v1/recommendations/generate',
      expect.objectContaining({
        userProfile: expect.objectContaining({
          userId: 'user-1',
          goals: ['BUILD_MUSCLE'],
        }),
        limit: 6,
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recipe-1');
  });

  it('falls back to BUILD_MUSCLE goal recipes when AI returns none and fitnessGoal is missing', async () => {
    mockApi.post.mockResolvedValueOnce({
      recommendationId: 'rec-2',
      aiAdvice: 'No direct recipe matches',
      workouts: [],
      recipes: [],
    });
    mockGet.mockResolvedValueOnce({
      recipes: [
        {
          id: 'recipe-2',
          title: 'Steak Burrito Bowl',
          imageUrl: 'https://example.com/recipe-2.jpg',
          timeMinutes: 25,
          difficulty: 'medium',
        },
      ],
    } as any);

    const result = await getRecommendedRecipes(undefined, 'user-2');

    expect(mockGet).toHaveBeenCalledWith('/api/v1/recipes/by-goal?goal=BUILD_MUSCLE&limit=6');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('recipe-2');
  });
});
