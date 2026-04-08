/**
 * DailyTasksCard — Research-driven checklist.
 *
 * Changes:
 * - Unchecked: 1.5px border circle, transparent fill (standard checkbox)
 * - Task items: subtle 1.5% tint background for containment
 * - Task gap: 10px (not 6)
 * - Progress track: 6px, 12% opacity
 * - Incomplete icons: accent color at 40% (not generic gray)
 * - 20px padding (card system standard)
 */
import * as Haptics from 'expo-haptics';
import { Camera, Barbell, Drop, Flame, Check } from 'phosphor-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { Text } from '@/components/Text';
import { BRAND_COLORS } from '@/utils';

interface TaskData {
  calories: number; calorieGoal: number;
  protein: { current: number; goal: number };
  mealCount: number; hydrationCups: number; hydrationGoal: number;
}
interface DailyTask { id: string; label: string; completed: boolean; icon: string; color: string; }
interface DailyTasksCardProps { data: TaskData; }

function generateTasks(d: TaskData): DailyTask[] {
  return [
    { id: 'log_meal', label: 'Log a meal', completed: d.mealCount > 0, icon: 'Camera', color: '#F97316' },
    { id: 'protein', label: 'Hit protein target', completed: d.protein.goal > 0 && d.protein.current >= d.protein.goal * 0.8, icon: 'Barbell', color: '#14B8A6' },
    { id: 'hydration', label: `Drink ${Math.max(1, Math.ceil(d.hydrationGoal / 2))}+ cups of water`, completed: d.hydrationCups >= Math.ceil(d.hydrationGoal / 2), icon: 'Drop', color: '#3B82F6' },
    { id: 'calories', label: 'Stay within calorie target', completed: d.calorieGoal > 0 && d.calories > 0 && d.calories <= d.calorieGoal * 1.1, icon: 'Flame', color: '#EA580C' },
  ];
}

const Icons: Record<string, React.ComponentType<any>> = { Camera, Barbell, Drop, Flame };

function TaskItem({ task, index }: { task: DailyTask; index: number }) {
  const cp = useSharedValue(task.completed ? 1 : 0);
  const prev = useRef(task.completed);

  useEffect(() => {
    if (task.completed && !prev.current && Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    prev.current = task.completed;
    cp.value = withDelay(index * 80, withTiming(task.completed ? 1 : 0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [task.completed, index]);

  const checkStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(cp.value, [0, 1], ['transparent', task.color]),
    borderWidth: 1.5 - cp.value * 1.5, // Border disappears when checked
    borderColor: 'rgba(0,0,0,0.15)',
  }));

  const I = Icons[task.icon];
  // Incomplete: accent at 40%. Complete: full color
  const iconColor = task.completed ? task.color : `${task.color}66`;

  return (
    <View style={styles.taskItem}>
      <Animated.View style={[styles.taskCheck, checkStyle]}>
        {task.completed && <Check size={12} color="#FFFFFF" weight="bold" />}
      </Animated.View>
      {I && <I size={15} color={iconColor} weight="regular" />}
      <Text style={[styles.taskLabel, { color: task.completed ? '#111111' : '#6B7280' }]}>
        {task.label}
      </Text>
    </View>
  );
}

export function DailyTasksCard({ data }: DailyTasksCardProps) {
  const tasks = useMemo(() => generateTasks(data), [data]);
  const done = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const allDone = done === total && total > 0;

  const [showCelebration, setShowCelebration] = useState(false);
  const [triggered, setTriggered] = useState(false);
  useEffect(() => { if (allDone && !triggered) { setShowCelebration(true); setTriggered(true); } }, [allDone, triggered]);

  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as any]}>
      <CelebrationOverlay visible={showCelebration} message="All Tasks Done!" onComplete={() => setShowCelebration(false)} />

      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>TODAY'S TASKS</Text>
          <Text style={styles.subtitle}>{done}/{total} completed</Text>
        </View>
        {allDone && <View style={styles.doneBadge}><Text style={styles.doneText}>DONE</Text></View>}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
      </View>

      <View style={styles.taskList}>
        {tasks.map((t, i) => <TaskItem key={t.id} task={t} index={i} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...(Platform.OS === 'web' ? BENTO_CARD_STYLES : MOBILE_CARD_STYLES) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sectionLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },
  subtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  doneBadge: { backgroundColor: 'rgba(16,185,129,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  doneText: { color: '#10B981', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(16,185,129,0.12)', overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#10B981' },

  taskList: { gap: 10 },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  taskCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  taskLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
});

export default DailyTasksCard;
