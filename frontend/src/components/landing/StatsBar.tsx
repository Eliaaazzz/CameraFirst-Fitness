/**
 * StatsBar — Social proof statistics row
 *
 * Inspired by: Uber homepage trust metrics —
 * large numbers with subtle labels, separated by borders.
 *
 * Desktop: wide gap between items. Mobile: compact gap.
 */

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

const STATS = [
  { value: '2,000+', label: 'Active users' },
  { value: '4.8 ★', label: 'App Store rating' },
  { value: 'Free', label: 'No credit card required' },
];

export function StatsBar() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      {STATS.map((stat) => (
        <View key={stat.label} style={styles.item}>
          <Text
            variant="heading1"
            weight="bold"
            style={styles.value}
          >
            {stat.value}
          </Text>
          <Text variant="body" style={styles.label}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
    marginTop: spacing['3xl'],
  },
  containerDesktop: {
    gap: 120,
  },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 32,
    letterSpacing: -1,
  },
  label: {
    color: BRAND_COLORS.textMuted,
    fontSize: 15,
  },
});

export default StatsBar;
