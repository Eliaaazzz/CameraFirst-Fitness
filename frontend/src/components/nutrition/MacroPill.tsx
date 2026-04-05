import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BRAND_COLORS, spacing } from '@/utils';

import { ProgressViz } from '@/components/common/ProgressViz';
import { Text } from '@/components/Text';

interface MacroPillProps {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  color: string;
}

export function MacroPill({ label, current, goal, unit = 'g', color }: MacroPillProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text variant="caption" weight="medium" color={BRAND_COLORS.textSecondary}>
            {label}
          </Text>
        </View>
        <Text variant="caption" weight="semibold">
          {Math.round(current)}/{goal}
          {unit}
        </Text>
      </View>
      <ProgressViz value={current} max={goal} color={color} height={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

