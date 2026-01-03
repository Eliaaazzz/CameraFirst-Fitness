import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { MacroPill } from './MacroPill';
import { getTheme } from '@/utils';

interface SummaryCardProps {
  calories: number;
  goal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  netCarbs?: { current: number; goal: number };
  sugar?: { current: number; goal: number };
}

export function SummaryCard({ calories, goal, protein, carbs, fat, netCarbs, sugar }: SummaryCardProps) {
  // Always use light mode
  const theme = getTheme('light');
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    const percentage = Math.min((calories / goal) * 100, 100);
    progressWidth.value = withTiming(percentage, { duration: 600 });
  }, [calories, goal]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
    backgroundColor: theme.colors.primary,
  }));

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Today</Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      <Text style={[styles.calories, { color: theme.colors.textPrimary }]}>
        {Math.round(calories)} <Text style={[styles.caloriesGoal, { color: theme.colors.textSecondary }]}>of {goal} kcal</Text>
      </Text>

      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      <View style={styles.macros}>
        <MacroPill label="Protein" {...protein} color="#10B981" />
        <MacroPill label="Fat" {...fat} color="#EF4444" />
        {netCarbs && (
          <MacroPill label="Net Carbs" {...netCarbs} color="#F59E0B" />
        )}
        {sugar && (
          <MacroPill label="Sugar" {...sugar} color="#EC4899" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  calories: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  caloriesGoal: {
    fontSize: 18,
    fontWeight: '400',
    color: '#999',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  macros: {
    gap: 8,
  },
});
