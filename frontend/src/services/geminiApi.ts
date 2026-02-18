/**
 * Gemini API Service for Goals Generation
 * Handles communication with backend for AI-powered fitness goals
 */

import { api, APIError } from './apiClient';

// ============ Request Types ============

export type Sex = 'male' | 'female' | 'prefer_not_to_say';
export type GoalType = 'fat_loss' | 'muscle_gain' | 'diabetes_control';
export type ActivityLevel = 'low' | 'medium' | 'high';

const MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G = 4;
const MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G = 0.5;
const ESTIMATED_FIBER_RATIO = 0.1;

export interface GenerateGoalsRequest {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goalType: GoalType;
  age?: number;
  activityLevel?: ActivityLevel;
}

// ============ Response Types (matches backend exactly) ============

export interface DailyCalories {
  min: number;
  target: number;
  max: number;
  rationale: string;
}

export interface MacrosGrams {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  blood_sugar_rise_mg_dl?: number;
  notes: string;
}

export interface WeeklyActivityPlan {
  cardio_minutes_per_week: number;
  strength_sessions_per_week: number;
  steps_per_day_target: number;
  notes: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  frequency: string;
  metric: string;
}

export interface GeneratedGoals {
  id?: string; // Database ID when saved
  dailyCalories: DailyCalories;
  macros_grams: MacrosGrams;
  sugarLimit_g_per_day: number;
  fiberTarget_g_per_day: number;
  weeklyActivityPlan: WeeklyActivityPlan;
  milestonesChecklist: MilestoneItem[];
  safetyNote: string;
  // Metadata
  generatedAt?: string;
  goalType?: GoalType;
  isActive?: boolean;
  // Input parameters (for reference)
  inputParameters?: {
    sex?: Sex;
    heightCm?: number;
    weightKg?: number;
    age?: number;
    activityLevel?: ActivityLevel;
  };
}

// ============ Save Goal Request ============

export interface SaveGoalRequest {
  userId: string;
  goalType: GoalType;
  dailyCalories: DailyCalories;
  macrosGrams: {
    proteinG: number;
    carbsG: number;
    fatG: number;
    notes?: string;
  };
  sugarLimitGPerDay?: number;
  fiberTargetGPerDay?: number;
  weeklyActivityPlan?: {
    cardioMinutesPerWeek?: number;
    strengthSessionsPerWeek?: number;
    stepsPerDayTarget?: number;
    notes?: string;
  };
  milestonesChecklist?: MilestoneItem[];
  safetyNote?: string;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  activityLevel?: ActivityLevel;
}

function estimateBloodSugarRiseMgDl(carbsG: number, proteinG: number): number {
  const safeCarbs = Math.max(0, carbsG || 0);
  const safeProtein = Math.max(0, proteinG || 0);
  const estimatedFiber = Math.round(safeCarbs * ESTIMATED_FIBER_RATIO);
  const netCarbs = Math.max(0, safeCarbs - estimatedFiber);
  return Math.round(
    netCarbs * MODERATE_T2D_NET_CARB_RISE_MGDL_PER_G +
    safeProtein * MODERATE_T2D_PROTEIN_RISE_MGDL_PER_G
  );
}

function withDerivedBloodSugarRise(goals: GeneratedGoals): GeneratedGoals {
  const macros = goals.macros_grams || {
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    notes: '',
  };

  return {
    ...goals,
    macros_grams: {
      ...macros,
      blood_sugar_rise_mg_dl:
        macros.blood_sugar_rise_mg_dl ??
        estimateBloodSugarRiseMgDl(
          macros.carbs_g || 0,
          macros.protein_g || 0
        ),
    },
  };
}

// ============ API Functions ============

/**
 * Generate personalized fitness goals using Gemini AI via backend
 */
export const generateGoals = async (request: GenerateGoalsRequest): Promise<GeneratedGoals> => {
  try {
    const response = await api.post<GeneratedGoals>('/api/v1/goals/generate', {
      sex: request.sex,
      heightCm: request.heightCm,
      weightKg: request.weightKg,
      goalType: request.goalType,
      age: request.age || 30,
      activityLevel: request.activityLevel || 'medium',
    });

    const normalized = withDerivedBloodSugarRise(response);

    // Add metadata
    return {
      ...normalized,
      generatedAt: new Date().toISOString(),
      goalType: request.goalType,
    };
  } catch (error) {
    console.error('Failed to generate goals via API:', error);
    // Return fallback goals if API fails
    return generateFallbackGoals(request);
  }
};

/**
 * Generate fallback goals based on basic calculations
 * Used when API is unavailable to keep demo stable
 */
export const generateFallbackGoals = (request: GenerateGoalsRequest): GeneratedGoals => {
  const { sex, heightCm, weightKg, goalType, age = 30, activityLevel = 'medium' } = request;

  // Mifflin-St Jeor BMR calculation
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sex === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // Average for prefer_not_to_say
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }

  // Activity multiplier
  const activityMultipliers: Record<ActivityLevel, number> = {
    low: 1.2,
    medium: 1.55,
    high: 1.725,
  };
  const multiplier = activityMultipliers[activityLevel];
  const tdee = Math.round(bmr * multiplier);

  // Goal-specific adjustments
  let targetCalories: number;
  let proteinG: number;
  let carbsG: number;
  let fatG: number;
  let calorieRationale: string;
  let macroNotes: string;
  let cardioMinutes: number;
  let strengthSessions: number;
  let stepsTarget: number;
  let activityNotes: string;

  switch (goalType) {
    case 'fat_loss':
      targetCalories = Math.round(tdee * 0.82);
      proteinG = Math.round(weightKg * 2);
      fatG = Math.round((targetCalories * 0.25) / 9);
      carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);
      calorieRationale = `Based on your TDEE of ~${tdee} kcal, an 18% deficit supports sustainable fat loss while preserving muscle.`;
      macroNotes = 'Higher protein (2g/kg) preserves muscle during deficit. Moderate carbs for energy.';
      cardioMinutes = 150;
      strengthSessions = 3;
      stepsTarget = 10000;
      activityNotes = 'Mix of steady-state and HIIT cardio. Strength training preserves muscle.';
      break;

    case 'muscle_gain':
      targetCalories = Math.round(tdee * 1.12);
      proteinG = Math.round(weightKg * 2);
      fatG = Math.round((targetCalories * 0.25) / 9);
      carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);
      calorieRationale = `Based on your TDEE of ~${tdee} kcal, a 12% surplus provides energy for muscle growth.`;
      macroNotes = 'High protein for muscle synthesis. Higher carbs fuel workouts and recovery.';
      cardioMinutes = 75;
      strengthSessions = 4;
      stepsTarget = 8000;
      activityNotes = 'Focus on progressive overload. Limit cardio to preserve energy for gains.';
      break;

    case 'diabetes_control':
      targetCalories = tdee;
      proteinG = Math.round(weightKg * 1.2);
      carbsG = Math.round((targetCalories * 0.30) / 4);
      fatG = Math.round((targetCalories - proteinG * 4 - carbsG * 4) / 9);
      calorieRationale = `Maintenance calories (~${tdee} kcal) support stable blood sugar while meeting energy needs.`;
      macroNotes = 'Lower carbs (30%) emphasizing low glycemic index foods. Focus on fiber-rich vegetables.';
      cardioMinutes = 150;
      strengthSessions = 2;
      stepsTarget = 8000;
      activityNotes = 'Regular walking after meals helps glucose uptake. Strength improves insulin sensitivity.';
      break;
  }

  const sugarLimit = goalType === 'diabetes_control' ? 20 : 25;
  const fiberTarget = sex === 'female' ? 25 : 30;

  const safetyNote = goalType === 'diabetes_control'
    ? 'IMPORTANT: This is NOT medical advice. Please consult your doctor, endocrinologist, or certified diabetes educator before making dietary changes. Monitor blood sugar closely.'
    : 'These recommendations are for general wellness guidance. Consult a healthcare professional before significant diet or exercise changes.';

  const milestones: MilestoneItem[] = goalType === 'diabetes_control'
    ? [
        { id: '1', title: 'Log meals with carbs', frequency: 'daily', metric: 'Track carb portions' },
        { id: '2', title: 'Post-meal walk', frequency: 'daily', metric: '10-15 min after meals' },
        { id: '3', title: 'Check blood sugar', frequency: 'daily', metric: 'As prescribed' },
        { id: '4', title: 'Eat fiber-rich foods', frequency: 'daily', metric: '25-30g fiber/day' },
        { id: '5', title: 'Limit added sugars', frequency: 'daily', metric: 'Under 20g/day' },
      ]
    : goalType === 'fat_loss'
    ? [
        { id: '1', title: 'Log all meals', frequency: 'daily', metric: '100% logged days' },
        { id: '2', title: 'Hit protein target', frequency: 'daily', metric: 'Within 10g of goal' },
        { id: '3', title: 'Complete cardio', frequency: 'weekly', metric: '150 min/week' },
        { id: '4', title: 'Strength training', frequency: 'weekly', metric: '3 sessions/week' },
        { id: '5', title: 'Weekly weigh-in', frequency: 'weekly', metric: 'Track progress' },
      ]
    : [
        { id: '1', title: 'Hit calorie surplus', frequency: 'daily', metric: 'Within 100 kcal' },
        { id: '2', title: 'Hit protein target', frequency: 'daily', metric: '2g per kg bodyweight' },
        { id: '3', title: 'Progressive overload', frequency: 'weekly', metric: 'Increase weight/reps' },
        { id: '4', title: 'Strength sessions', frequency: 'weekly', metric: '4 sessions/week' },
        { id: '5', title: 'Sleep 7-9 hours', frequency: 'daily', metric: 'Recovery priority' },
      ];

  return {
    dailyCalories: {
      min: Math.round(targetCalories * 0.9),
      target: targetCalories,
      max: Math.round(targetCalories * 1.1),
      rationale: calorieRationale,
    },
    macros_grams: {
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      blood_sugar_rise_mg_dl: estimateBloodSugarRiseMgDl(carbsG, proteinG),
      notes: macroNotes,
    },
    sugarLimit_g_per_day: sugarLimit,
    fiberTarget_g_per_day: fiberTarget,
    weeklyActivityPlan: {
      cardio_minutes_per_week: cardioMinutes,
      strength_sessions_per_week: strengthSessions,
      steps_per_day_target: stepsTarget,
      notes: activityNotes,
    },
    milestonesChecklist: milestones,
    safetyNote,
    generatedAt: new Date().toISOString(),
    goalType,
  };
};

// ============ Goal Persistence API Functions ============

/**
 * Save generated goals to the database
 */
export const saveGoal = async (
  userId: string,
  goals: GeneratedGoals,
  inputParams?: { sex?: Sex; heightCm?: number; weightKg?: number; age?: number; activityLevel?: ActivityLevel }
): Promise<GeneratedGoals> => {
  try {
    const request: SaveGoalRequest = {
      userId,
      goalType: goals.goalType || 'fat_loss',
      dailyCalories: goals.dailyCalories,
      macrosGrams: {
        proteinG: goals.macros_grams.protein_g,
        carbsG: goals.macros_grams.carbs_g,
        fatG: goals.macros_grams.fat_g,
        notes: goals.macros_grams.notes,
      },
      sugarLimitGPerDay: goals.sugarLimit_g_per_day,
      fiberTargetGPerDay: goals.fiberTarget_g_per_day,
      weeklyActivityPlan: goals.weeklyActivityPlan ? {
        cardioMinutesPerWeek: goals.weeklyActivityPlan.cardio_minutes_per_week,
        strengthSessionsPerWeek: goals.weeklyActivityPlan.strength_sessions_per_week,
        stepsPerDayTarget: goals.weeklyActivityPlan.steps_per_day_target,
        notes: goals.weeklyActivityPlan.notes,
      } : undefined,
      milestonesChecklist: goals.milestonesChecklist,
      safetyNote: goals.safetyNote,
      sex: inputParams?.sex,
      heightCm: inputParams?.heightCm,
      weightKg: inputParams?.weightKg,
      age: inputParams?.age,
      activityLevel: inputParams?.activityLevel,
    };

    const response = await api.post<GeneratedGoals>('/api/v1/goals/save', request);
    console.log('[GoalsApi] Goal saved to database successfully');
    return withDerivedBloodSugarRise(response);
  } catch (error) {
    console.error('[GoalsApi] Failed to save goal to database:', error);
    throw error;
  }
};

/**
 * Get the active goal for a user from the database
 */
export const getActiveGoal = async (userId: string): Promise<GeneratedGoals | null> => {
  try {
    const response = await api.get<GeneratedGoals>(`/api/v1/goals/active?userId=${userId}`);
    console.log('[GoalsApi] Active goal retrieved from database');
    return withDerivedBloodSugarRise(response);
  } catch (error: any) {
    // apiClient throws APIError (not axios), so check `.status` instead of `error.response.status`.
    const status = error instanceof APIError ? error.status : error?.status;
    if (status === 404) {
      console.log('[GoalsApi] No active goal found for user');
      return null;
    }
    console.error('[GoalsApi] Failed to get active goal:', error);
    throw error;
  }
};

/**
 * Get goal history for a user
 */
export const getGoalHistory = async (userId: string): Promise<GeneratedGoals[]> => {
  try {
    const response = await api.get<GeneratedGoals[]>(`/api/v1/goals/history?userId=${userId}`);
    return response.map(withDerivedBloodSugarRise);
  } catch (error) {
    console.error('[GoalsApi] Failed to get goal history:', error);
    return [];
  }
};

/**
 * Check if user has an active goal
 */
export const hasActiveGoal = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get<{ hasActiveGoal: boolean }>(`/api/v1/goals/has-active?userId=${userId}`);
    return response.hasActiveGoal;
  } catch (error) {
    console.error('[GoalsApi] Failed to check active goal:', error);
    return false;
  }
};

export default {
  generateGoals,
  generateFallbackGoals,
  saveGoal,
  getActiveGoal,
  getGoalHistory,
  hasActiveGoal,
};
