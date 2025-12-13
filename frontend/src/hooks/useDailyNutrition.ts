import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nutritionApi from '@/services/nutritionApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GeneratedGoals } from '@/services/geminiApi';

// Storage key for generated goals (shared with ProfileScreen)
const GENERATED_GOALS_KEY = '@generated_goals';

export interface DailyNutritionData {
  calories: number;
  goal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  netCarbs?: { current: number; goal: number };
  sugar?: { current: number; goal: number };
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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds to prevent rapid refetches
    queryFn: async (): Promise<DailyNutritionData> => {
      // Load generated goals from storage to use as targets
      let generatedGoals: GeneratedGoals | null = null;
      try {
        const saved = await AsyncStorage.getItem(GENERATED_GOALS_KEY);
        if (saved) {
          generatedGoals = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to load generated goals:', e);
      }

      // Fetch both summary and insight to get meals
      // Use actual user from JWT - the backend extracts user from token
      const [summary, insight] = await Promise.all([
        nutritionApi.getDailySummary('me').catch(() => null),
        nutritionApi.getWeeklyInsight('me').catch(() => null),
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

      // Use generated goals if available, otherwise use backend targets or defaults
      const calorieGoal = generatedGoals?.dailyCalories.target || summary?.calories?.target || 2100;
      const proteinGoal = generatedGoals?.macros_grams.protein_g || summary?.protein?.target || 150;
      const carbsGoal = generatedGoals?.macros_grams.carbs_g || summary?.carbs?.target || 200;
      const fatGoal = generatedGoals?.macros_grams.fat_g || summary?.fat?.target || 65;
      // Net carbs = total carbs - fiber (for diabetes/low-carb tracking)
      const fiberGoal = generatedGoals?.fiberTarget_g_per_day || 25;
      // Sugar limit from generated goals (default: 25g for general health)
      const sugarGoal = generatedGoals?.sugarLimit_g_per_day || 25;

      // Transform backend response to our format
      // Backend returns NutritionMetricResponse with {actual, target, percent}
      const currentCarbs = summary?.carbs?.actual || 0;
      // Note: Backend doesn't track fiber separately yet, estimate as ~10% of carbs
      const estimatedFiber = Math.round(currentCarbs * 0.1);
      // Sugar from backend summary or estimate from today's meals
      const currentSugar = (summary as any)?.sugar?.actual || 0;

      return {
        calories: summary?.calories?.actual || 0,
        goal: calorieGoal,
        protein: {
          current: summary?.protein?.actual || 0,
          goal: proteinGoal,
        },
        carbs: {
          current: currentCarbs,
          goal: carbsGoal,
        },
        fat: {
          current: summary?.fat?.actual || 0,
          goal: fatGoal,
        },
        netCarbs: {
          current: Math.max(0, currentCarbs - estimatedFiber),
          goal: Math.max(0, carbsGoal - fiberGoal),
        },
        sugar: {
          current: currentSugar,
          goal: sugarGoal,
        },
        meals: todayMeals,
      };
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
    refetch();
  }, [queryClient, refetch]);

  return {
    data: data || {
      calories: 0,
      goal: 2100,
      protein: { current: 0, goal: 150 },
      carbs: { current: 0, goal: 200 },
      fat: { current: 0, goal: 65 },
      netCarbs: { current: 0, goal: 175 },
      sugar: { current: 0, goal: 25 },
      meals: [],
    },
    isLoading,
    error,
    refresh,
    refetch,
  };
}
