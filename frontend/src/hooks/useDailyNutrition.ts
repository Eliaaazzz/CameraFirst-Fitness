import { useQuery, useQueryClient } from '@tanstack/react-query';
import nutritionApi from '@/services/nutritionApi';

export interface DailyNutritionData {
  calories: number;
  goal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  meals: Array<{
    id: string;
    name: string;
    calories: number;
    imageUrl?: string;
    consumedAt: string;
  }>;
}

export function useDailyNutrition() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyNutrition'],
    queryFn: async (): Promise<DailyNutritionData> => {
      const summary = await nutritionApi.getDailySummary('default-user');

      // Transform backend response to our format
      return {
        calories: summary.totalCalories || 0,
        goal: 2100, // TODO: Get from user profile
        protein: { current: summary.totalProtein || 0, goal: 150 },
        carbs: { current: summary.totalCarbs || 0, goal: 200 },
        fat: { current: summary.totalFat || 0, goal: 65 },
        meals: summary.meals?.map((m: any) => ({
          id: m.id.toString(),
          name: m.recipeName || 'Unknown',
          calories: m.calories || 0,
          imageUrl: undefined, // TODO: Add image support
          consumedAt: m.consumedAt,
        })) || [],
      };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
  };

  return {
    data: data || {
      calories: 0,
      goal: 2100,
      protein: { current: 0, goal: 150 },
      carbs: { current: 0, goal: 200 },
      fat: { current: 0, goal: 65 },
      meals: [],
    },
    isLoading,
    error,
    refresh,
    refetch,
  };
}
