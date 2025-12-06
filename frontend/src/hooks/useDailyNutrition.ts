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
      // Fetch both summary and insight to get meals
      const [summary, insight] = await Promise.all([
        nutritionApi.getDailySummary('default-user'),
        nutritionApi.getWeeklyInsight('default-user').catch(() => null), // Gracefully handle if insight fails
      ]);

      // Filter meals to today only
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = (insight?.logs || [])
        .filter((m: any) => m.consumedAt?.startsWith(today))
        .map((m: any) => ({
          id: m.id?.toString() || Math.random().toString(),
          name: m.recipeName || 'Unknown',
          calories: m.calories || 0,
          imageUrl: undefined,
          consumedAt: m.consumedAt,
        }));

      // Transform backend response to our format
      // Backend returns NutritionMetricResponse with {actual, target, percent}
      return {
        calories: summary.calories?.actual || 0,
        goal: summary.calories?.target || 2100,
        protein: { 
          current: summary.protein?.actual || 0, 
          goal: summary.protein?.target || 150 
        },
        carbs: { 
          current: summary.carbs?.actual || 0, 
          goal: summary.carbs?.target || 200 
        },
        fat: { 
          current: summary.fat?.actual || 0, 
          goal: summary.fat?.target || 65 
        },
        meals: todayMeals,
      };
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
    refetch();
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
