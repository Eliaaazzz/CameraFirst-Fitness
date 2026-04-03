/**
 * DailyTasksCard - Noom-inspired daily checklist
 *
 * Dynamically generates tasks based on user goals and current progress.
 * Provides a structured engagement loop that encourages daily interaction.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES } from '@/components/common/BentoCard';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TaskData {
  /** Current calorie intake */
  calories: number;
  calorieGoal: number;
  /** Protein current vs target */
  protein: { current: number; goal: number };
  /** Number of meals logged today */
  mealCount: number;
  /** Hydration cups consumed */
  hydrationCups: number;
  hydrationGoal: number;
}

interface DailyTask {
  id: string;
  label: string;
  completed: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface DailyTasksCardProps {
  data: TaskData;
}

// ============================================================================
// TASK GENERATION
// ============================================================================

function generateTasks(data: TaskData): DailyTask[] {
  return [
    {
      id: 'log_meal',
      label: 'Log a meal',
      completed: data.mealCount > 0,
      icon: 'camera-outline',
      color: BRAND_COLORS.primary,
    },
    {
      id: 'protein_target',
      label: 'Hit protein target',
      completed: data.protein.goal > 0 && data.protein.current >= data.protein.goal * 0.8,
      icon: 'barbell-outline',
      color: BRAND_COLORS.macros.protein,
    },
    {
      id: 'hydration',
      label: `Drink ${Math.max(1, Math.ceil(data.hydrationGoal / 2))}+ cups of water`,
      completed: data.hydrationCups >= Math.ceil(data.hydrationGoal / 2),
      icon: 'water-outline',
      color: '#06B6D4',
    },
    {
      id: 'calorie_balance',
      label: 'Stay within calorie target',
      completed: data.calorieGoal > 0 && data.calories > 0 && data.calories <= data.calorieGoal * 1.1,
      icon: 'flame-outline',
      color: BRAND_COLORS.macros.calories,
    },
  ];
}

// ============================================================================
// ANIMATED TASK ITEM
// ============================================================================

function TaskItem({ task, index }: { task: DailyTask; index: number }) {
  const checkProgress = useSharedValue(task.completed ? 1 : 0);
  const prevCompleted = useRef(task.completed);

  useEffect(() => {
    // Fire haptic when task transitions to completed
    if (task.completed && !prevCompleted.current && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    prevCompleted.current = task.completed;

    checkProgress.value = withDelay(
      index * 80,
      withTiming(task.completed ? 1 : 0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [task.completed, index]);

  const checkStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      ['rgba(0,0,0,0.04)', task.color]
    ),
    transform: [{ scale: 0.9 + checkProgress.value * 0.1 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + checkProgress.value * 0.5,
  }));

  return (
    <View style={styles.taskItem}>
      <Animated.View style={[styles.taskCheck, checkStyle]}>
        {task.completed && (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        )}
      </Animated.View>
      <Ionicons name={task.icon as any} size={16} color={task.color} style={styles.taskIcon} />
      <Animated.View style={[{ flex: 1 }, textStyle]}>
        <Text
          variant="body"
          weight={task.completed ? 'medium' : 'regular'}
          style={task.completed ? [styles.taskLabel, styles.taskLabelDone] : styles.taskLabel}
        >
          {task.label}
        </Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DailyTasksCard({ data }: DailyTasksCardProps) {
  const tasks = useMemo(() => generateTasks(data), [data]);
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  // Celebration state — trigger once when all tasks completed
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (allDone && !hasTriggered) {
      setShowCelebration(true);
      setHasTriggered(true);
    }
  }, [allDone, hasTriggered]);

  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as any]}>
      {/* Celebration overlay */}
      <CelebrationOverlay
        visible={showCelebration}
        message="All Tasks Done!"
        onComplete={() => setShowCelebration(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="heading3" weight="bold" style={styles.title}>Today's Tasks</Text>
          <Text variant="caption" style={styles.subtitle}>
            {completedCount}/{totalCount} completed
          </Text>
        </View>
        {allDone && (
          <View style={styles.allDoneBadge}>
            <Text variant="caption" weight="bold" style={styles.allDoneText}>ALL DONE</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Task list */}
      <View style={styles.taskList}>
        {tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index} />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...BENTO_CARD_STYLES,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
  },
  subtitle: {
    color: BRAND_COLORS.textDisabled,
    marginTop: 2,
  },
  allDoneBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  allDoneText: {
    color: '#059669',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  taskList: {
    gap: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    width: 20,
  },
  taskLabel: {
    color: BRAND_COLORS.textMuted,
    fontSize: 14,
  },
  taskLabelDone: {
    color: '#10B981',
  },
});

export default DailyTasksCard;
