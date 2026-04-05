import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BRAND_COLORS, spacing } from '@/utils';

import { Card } from '@/components/Card';
import { ProgressViz } from '@/components/common/ProgressViz';
import { Text } from '@/components/Text';

import { MacroPill } from './MacroPill';

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
  const remaining = Math.max(goal - calories, 0);
  const progressLabel = calories >= goal ? 'Goal reached' : `${Math.round(remaining)} kcal left`;

  return (
    <Card elevation="medium" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text variant="label" color={BRAND_COLORS.textMuted}>
            Today
          </Text>
          <Text variant="heading2" weight="bold">
            Nutrition summary
          </Text>
        </View>
        <Text variant="caption" color={BRAND_COLORS.textSecondary}>
          {new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.calorieRow}>
        <View>
          <Text variant="hero" weight="bold" style={styles.calorieValue}>
            {Math.round(calories)}
          </Text>
          <Text variant="caption" color={BRAND_COLORS.textSecondary}>
            of {goal} kcal
          </Text>
        </View>
        <View style={styles.statusChip}>
          <Text variant="caption" weight="semibold" color={BRAND_COLORS.primaryDark}>
            {progressLabel}
          </Text>
        </View>
      </View>

      <ProgressViz value={calories} max={goal} color={BRAND_COLORS.primary} style={styles.progressBar} />

      <View style={styles.macros}>
        <MacroPill label="Protein" {...protein} color={BRAND_COLORS.macros.protein} />
        <MacroPill label="Fat" {...fat} color={BRAND_COLORS.macros.fat} />
        {netCarbs ? <MacroPill label="Net carbs" {...netCarbs} color={BRAND_COLORS.macros.carbs} /> : null}
        {sugar ? <MacroPill label="Sugar" {...sugar} color={BRAND_COLORS.macros.sugar} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  calorieValue: {
    letterSpacing: -1,
  },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: BRAND_COLORS.primaryTint,
  },
  progressBar: {
    marginTop: -4,
  },
  macros: {
    gap: spacing.sm,
  },
});

