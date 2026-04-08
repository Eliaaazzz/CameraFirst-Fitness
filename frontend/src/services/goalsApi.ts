import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import type {
    CreateGoalPayload,
    CreateReminderPayload,
    Goal,
    GoalProgress,
    GoalStatistics,
    LogGoalProgressPayload,
    Reminder,
    UpdateGoalPayload,
    UpdateReminderPayload,
} from '@/types';
import {
    cancelReminderNotification,
    scheduleMultiDayReminder,
    scheduleReminderNotification,
} from './notificationService';
import { formatLocalDateKey, toLocalDateKey } from '@/utils';

// Storage keys
const GOALS_KEY = '@goals';
const GOAL_PROGRESS_PREFIX = '@goal_progress_';
const GOAL_STATISTICS_KEY = '@goal_statistics';

// Helper to generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

function getCurrentLocalDate(): string {
  return formatLocalDateKey(new Date());
}

/**
 * Get all goals for a user
 */
export async function getAllGoals(userId: string): Promise<Goal[]> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) return [];

    const allGoals: Goal[] = JSON.parse(stored);
    return allGoals.filter((g) => g.userId === userId);
  } catch (error) {
    console.error('Error getting goals:', error);
    return [];
  }
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(goalId: string): Promise<Goal | null> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) return null;

    const goals: Goal[] = JSON.parse(stored);
    return goals.find((g) => g.id === goalId) || null;
  } catch (error) {
    console.error('Error getting goal:', error);
    return null;
  }
}

/**
 * Create a new goal
 */
export async function createGoal(userId: string, payload: CreateGoalPayload): Promise<Goal> {
  try {
    const goalId = generateId('goal');
    const now = getCurrentTimestamp();

    // Create reminders with IDs
    const reminders: Reminder[] = (payload.reminders || []).map((r) => ({
      id: generateId('reminder'),
      goalId,
      userId,
      title: r.title,
      body: r.body,
      time: r.time,
      frequency: r.frequency,
      daysOfWeek: r.daysOfWeek,
      isEnabled: r.isEnabled !== undefined ? r.isEnabled : true,
      createdAt: now,
      updatedAt: now,
    }));

    const newGoal: Goal = {
      id: goalId,
      userId,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      targetValue: payload.targetValue,
      targetUnit: payload.targetUnit,
      currentValue: 0,
      frequency: payload.frequency,
      status: 'active',
      startDate: payload.startDate,
      endDate: payload.endDate,
      color: payload.color || getDefaultColorForType(payload.type),
      icon: payload.icon || getDefaultIconForType(payload.type),
      reminders,
      progressHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // Get existing goals
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    const goals: Goal[] = stored ? JSON.parse(stored) : [];

    // Add new goal
    goals.push(newGoal);

    // Save back
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));

    // Schedule notifications for reminders
    for (const reminder of reminders) {
      if (reminder.isEnabled) {
        if (reminder.frequency === 'weekdays') {
          await scheduleMultiDayReminder(reminder, [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
          ]);
        } else if (reminder.frequency === 'weekends') {
          await scheduleMultiDayReminder(reminder, ['saturday', 'sunday']);
        } else if (reminder.frequency === 'custom' && reminder.daysOfWeek) {
          await scheduleMultiDayReminder(reminder, reminder.daysOfWeek);
        } else {
          await scheduleReminderNotification(reminder);
        }
      }
    }

    return newGoal;
  } catch (error) {
    console.error('Error creating goal:', error);
    throw error;
  }
}

/**
 * Update an existing goal
 */
export async function updateGoal(goalId: string, payload: UpdateGoalPayload): Promise<Goal> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) throw new Error('No goals found');

    const goals: Goal[] = JSON.parse(stored);
    const index = goals.findIndex((g) => g.id === goalId);

    if (index === -1) throw new Error('Goal not found');

    const updatedGoal: Goal = {
      ...goals[index],
      ...payload,
      updatedAt: getCurrentTimestamp(),
    };

    goals[index] = updatedGoal;
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));

    return updatedGoal;
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) return;

    const goals: Goal[] = JSON.parse(stored);
    const goal = goals.find((g) => g.id === goalId);

    if (goal) {
      // Cancel all reminders
      for (const reminder of goal.reminders) {
        await cancelReminderNotification(reminder.id);
      }

      // Remove goal
      const filtered = goals.filter((g) => g.id !== goalId);
      await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(filtered));

      // Remove progress history
      await AsyncStorage.removeItem(`${GOAL_PROGRESS_PREFIX}${goalId}`);
    }
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
}

/**
 * Log progress for a goal
 */
export async function logGoalProgress(payload: LogGoalProgressPayload): Promise<GoalProgress> {
  try {
    const { goalId, value, date, notes } = payload;

    // Create progress entry
    const progress: GoalProgress = {
      id: generateId('progress'),
      goalId,
      date: date ? toLocalDateKey(date) : getCurrentLocalDate(),
      value,
      notes,
      createdAt: getCurrentTimestamp(),
    };

    // Store progress
    const progressKey = `${GOAL_PROGRESS_PREFIX}${goalId}`;
    const stored = await AsyncStorage.getItem(progressKey);
    const progressHistory: GoalProgress[] = stored ? JSON.parse(stored) : [];
    progressHistory.push(progress);
    await AsyncStorage.setItem(progressKey, JSON.stringify(progressHistory));

    // Update goal's current value
    const goalsStored = await AsyncStorage.getItem(GOALS_KEY);
    if (goalsStored) {
      const goals: Goal[] = JSON.parse(goalsStored);
      const goalIndex = goals.findIndex((g) => g.id === goalId);

      if (goalIndex !== -1) {
        goals[goalIndex].currentValue = value;
        goals[goalIndex].updatedAt = getCurrentTimestamp();

        // Check if goal is completed
        if (
          goals[goalIndex].targetValue &&
          value >= goals[goalIndex].targetValue!
        ) {
          goals[goalIndex].status = 'completed';
        }

        await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
      }
    }

    return progress;
  } catch (error) {
    console.error('Error logging progress:', error);
    throw error;
  }
}

/**
 * Get progress history for a goal
 */
export async function getGoalProgressHistory(goalId: string): Promise<GoalProgress[]> {
  try {
    const key = `${GOAL_PROGRESS_PREFIX}${goalId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting progress history:', error);
    return [];
  }
}

/**
 * Calculate goal statistics
 */
export async function calculateGoalStatistics(userId: string): Promise<GoalStatistics> {
  try {
    const goals = await getAllGoals(userId);
    const activeGoals = goals.filter((g) => g.status === 'active');
    const completedGoals = goals.filter((g) => g.status === 'completed');

    const totalGoals = goals.length;
    const completionRate = totalGoals > 0 ? (completedGoals.length / totalGoals) * 100 : 0;

    // Calculate streak (simplified - based on days with progress)
    let currentStreak = 0;
    let longestStreak = 0;

    // Get today's completed goals
    const today = getCurrentLocalDate();
    const goalsCompletedToday = goals.filter((g) => {
      if (!g.progressHistory || g.progressHistory.length === 0) return false;
      const lastProgress = g.progressHistory[g.progressHistory.length - 1];
      return toLocalDateKey(lastProgress.date) === today;
    }).length;

    const stats: GoalStatistics = {
      totalGoals,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      completionRate,
      currentStreak,
      longestStreak,
      goalsCompletedToday,
    };

    // Cache statistics
    await AsyncStorage.setItem(GOAL_STATISTICS_KEY, JSON.stringify(stats));

    return stats;
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      goalsCompletedToday: 0,
    };
  }
}

/**
 * Add a reminder to a goal
 */
export async function addReminder(
  goalId: string,
  userId: string,
  payload: CreateReminderPayload
): Promise<Reminder> {
  try {
    const reminder: Reminder = {
      id: generateId('reminder'),
      goalId,
      userId,
      title: payload.title,
      body: payload.body,
      time: payload.time,
      frequency: payload.frequency,
      daysOfWeek: payload.daysOfWeek,
      isEnabled: payload.isEnabled !== undefined ? payload.isEnabled : true,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    // Get goal and add reminder
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) throw new Error('No goals found');

    const goals: Goal[] = JSON.parse(stored);
    const goalIndex = goals.findIndex((g) => g.id === goalId);

    if (goalIndex === -1) throw new Error('Goal not found');

    goals[goalIndex].reminders.push(reminder);
    goals[goalIndex].updatedAt = getCurrentTimestamp();
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));

    // Schedule notification
    if (reminder.isEnabled) {
      if (reminder.frequency === 'weekdays') {
        await scheduleMultiDayReminder(reminder, [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
        ]);
      } else if (reminder.frequency === 'weekends') {
        await scheduleMultiDayReminder(reminder, ['saturday', 'sunday']);
      } else if (reminder.frequency === 'custom' && reminder.daysOfWeek) {
        await scheduleMultiDayReminder(reminder, reminder.daysOfWeek);
      } else {
        await scheduleReminderNotification(reminder);
      }
    }

    return reminder;
  } catch (error) {
    console.error('Error adding reminder:', error);
    throw error;
  }
}

/**
 * Update a reminder
 */
export async function updateReminder(
  reminderId: string,
  payload: UpdateReminderPayload
): Promise<Reminder> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) throw new Error('No goals found');

    const goals: Goal[] = JSON.parse(stored);

    // Find goal with this reminder
    let reminderUpdated: Reminder | null = null;

    for (const goal of goals) {
      const reminderIndex = goal.reminders.findIndex((r) => r.id === reminderId);
      if (reminderIndex !== -1) {
        // Cancel existing notification
        await cancelReminderNotification(reminderId);

        // Update reminder
        goal.reminders[reminderIndex] = {
          ...goal.reminders[reminderIndex],
          ...payload,
          updatedAt: getCurrentTimestamp(),
        };

        reminderUpdated = goal.reminders[reminderIndex];
        goal.updatedAt = getCurrentTimestamp();

        // Reschedule if enabled
        if (reminderUpdated.isEnabled) {
          if (reminderUpdated.frequency === 'weekdays') {
            await scheduleMultiDayReminder(reminderUpdated, [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
            ]);
          } else if (reminderUpdated.frequency === 'weekends') {
            await scheduleMultiDayReminder(reminderUpdated, ['saturday', 'sunday']);
          } else if (reminderUpdated.frequency === 'custom' && reminderUpdated.daysOfWeek) {
            await scheduleMultiDayReminder(reminderUpdated, reminderUpdated.daysOfWeek);
          } else {
            await scheduleReminderNotification(reminderUpdated);
          }
        }

        break;
      }
    }

    if (!reminderUpdated) throw new Error('Reminder not found');

    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    return reminderUpdated;
  } catch (error) {
    console.error('Error updating reminder:', error);
    throw error;
  }
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(GOALS_KEY);
    if (!stored) return;

    const goals: Goal[] = JSON.parse(stored);

    for (const goal of goals) {
      const reminderIndex = goal.reminders.findIndex((r) => r.id === reminderId);
      if (reminderIndex !== -1) {
        // Cancel notification
        await cancelReminderNotification(reminderId);

        // Remove reminder
        goal.reminders.splice(reminderIndex, 1);
        goal.updatedAt = getCurrentTimestamp();
        break;
      }
    }

    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Error deleting reminder:', error);
    throw error;
  }
}

// Helper functions for default colors and icons
function getDefaultColorForType(type: string): string {
  const colors: Record<string, string> = {
    nutrition: '#FF6B6B',
    workout: '#4ECDC4',
    hydration: '#45B7D1',
    sleep: '#9B59B6',
    weight: '#F39C12',
    habit: '#1ABC9C',
    meal_prep: '#E74C3C',
  };
  return colors[type] || '#95A5A6';
}

function getDefaultIconForType(type: string): string {
  const icons: Record<string, string> = {
    nutrition: 'nutrition',
    workout: 'fitness-center',
    hydration: 'water-drop',
    sleep: 'bedtime',
    weight: 'scale',
    habit: 'check-circle',
    meal_prep: 'restaurant',
  };
  return icons[type] || 'flag';
}

// React Query hooks

/**
 * Hook to get all goals
 */
export function useGoals(userId: string): UseQueryResult<Goal[], Error> {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: () => getAllGoals(userId),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get goal statistics
 */
export function useGoalStatistics(userId: string): UseQueryResult<GoalStatistics, Error> {
  return useQuery({
    queryKey: ['goalStatistics', userId],
    queryFn: () => calculateGoalStatistics(userId),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to create a goal
 */
export function useCreateGoal(
  userId: string
): UseMutationResult<Goal, Error, CreateGoalPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGoalPayload) => createGoal(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId] });
      queryClient.invalidateQueries({ queryKey: ['goalStatistics', userId] });
    },
  });
}

/**
 * Hook to update a goal
 */
export function useUpdateGoal(): UseMutationResult<
  Goal,
  Error,
  { goalId: string; payload: UpdateGoalPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, payload }) => updateGoal(goalId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStatistics'] });
    },
  });
}

/**
 * Hook to delete a goal
 */
export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStatistics'] });
    },
  });
}

/**
 * Hook to log goal progress
 */
export function useLogGoalProgress(): UseMutationResult<
  GoalProgress,
  Error,
  LogGoalProgressPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LogGoalProgressPayload) => logGoalProgress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalStatistics'] });
    },
  });
}

export default {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  logGoalProgress,
  getGoalProgressHistory,
  calculateGoalStatistics,
  addReminder,
  updateReminder,
  deleteReminder,
  useGoals,
  useGoalStatistics,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useLogGoalProgress,
};
