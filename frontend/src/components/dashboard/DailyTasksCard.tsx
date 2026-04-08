/**
 * DailyTasksCard — Clean checklist, Apple/M3 style.
 *
 * Design rules applied:
 * - White task items, no tinted backgrounds or borders
 * - Subtle spacing separates items (not lines)
 * - Check circles: clean, minimal
 * - Progress bar: 4px thin, subtle track
 */
import * as Haptics from 'expo-haptics';
import { Camera, Barbell, Drop, Flame, Check } from 'phosphor-react-native';
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

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TaskData {
  calories: number;
  calorieGoal: number;
  protein: { current: number; goal: number };
  mealCount: number;
  hydrationCups: number;
  hydrationGoal: number;
}

interface DailyTask {
  id: string;
  label: string;
  completed: boolean;
  icon: 'Camera' | 'Barbell' | 'Drop' | 'Flame';
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
      icon: 'Camera',
      color: '#F97316',
    },
    {
      id: 'protein_target',
      label: 'Hit protein target',
      completed: data.protein.goal > 0 && data.protein.current >= data.protein.goal * 0.8,
      icon: 'Barbell',
      color: '#0D9488',
    },
    {
      id: 'hydration',
      label: `Drink ${Math.max(1, Math.ceil(data.hydrationGoal / 2))}+ cups of water`,
      completed: data.hydrationCups >= Math.ceil(data.hydrationGoal / 2),
      icon: 'Drop',
      color: '#3B82F6',
    },
    {
      id: 'calorie_balance',
      label: 'Stay within calorie target',
      completed: data.calorieGoal > 0 && data.calories > 0 && data.calories <= data.calorieGoal * 1.1,
      icon: 'Flame',
      color: '#EA580C',
    },
  ];
}

const TaskIcons: Record<string, React.ComponentType<any>> = {
  Camera, Barbell, Drop, Flame,
};

// ============================================================================
// TASK ITEM — white background, no border
// ============================================================================

function TaskItem({ task, index }: { task: DailyTask; index: number }) {
  const checkProgress = useSharedValue(task.completed ? 1 : 0);
  const prevCompleted = useRef(task.completed);

  useEffect(() => {
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
      ['rgba(0,0,0,0.06)', task.color]
    ),
  }));

  const IconComp = TaskIcons[task.icon];

  return (
    <View style={styles.taskItem}>
      <Animated.View style={[styles.taskCheck, checkStyle]}>
        {task.completed && <Check size={12} color="#FFFFFF" weight="bold" />}
      </Animated.View>
      {IconComp && (
        <View style={styles.taskIconWrap}>
          <IconComp size={15} color={task.completed ? task.color : '#9CA3AF'} weight="regular" />
        </View>
      )}
      <Text
        style={[
          styles.taskLabel,
          { color: task.completed ? '#111111' : '#6B7280' },
        ]}
      >
        {task.label}
      </Text>
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
      <CelebrationOverlay visible={showCelebration} message="All Tasks Done!" onComplete={() => setShowCelebration(false)} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>Today's Tasks</Text>
          <Text style={styles.subtitle}>{completedCount}/{totalCount} completed</Text>
        </View>
        {allDone && (
          <View style={styles.allDoneBadge}>
            <Text style={styles.allDoneText}>DONE</Text>
          </View>
        )}
      </View>

      {/* Progress bar — thin, clean */}
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
    ...(Platform.OS === 'web' ? BENTO_CARD_STYLES : MOBILE_CARD_STYLES),
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  allDoneBadge: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  allDoneText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,185,129,0.08)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  taskList: {
    gap: 6,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    // No background, no border — whitespace separates
  },
  taskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DailyTasksCard;
