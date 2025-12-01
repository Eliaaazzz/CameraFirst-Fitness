import { BORDER_RADIUS, COLORS, ELEVATION, SPACING, TYPOGRAPHY } from '@/utils/theme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  variant?: 'default' | 'highlighted' | 'compact';
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  variant = 'default',
  style,
}) => {
  const isCompact = variant === 'compact';
  const isHighlighted = variant === 'highlighted';

  return (
    <View style={[
      styles.container,
      isHighlighted && styles.highlighted,
      isCompact && styles.compact,
      style,
    ]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      
      <Text style={[styles.label, isHighlighted && styles.labelHighlighted]}>
        {label}
      </Text>
      
      <View style={styles.valueRow}>
        <Text style={[styles.value, isHighlighted && styles.valueHighlighted]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, isHighlighted && styles.unitHighlighted]}>
            {unit}
          </Text>
        )}
      </View>
      
      {trend && (
        <View style={[styles.trendContainer, trend.direction === 'up' ? styles.trendUp : styles.trendDown]}>
          <Text style={styles.trendIcon}>
            {trend.direction === 'up' ? '↑' : '↓'}
          </Text>
          <Text style={styles.trendValue}>{Math.abs(trend.value)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    minWidth: 120,
    ...ELEVATION.level1,
  },
  highlighted: {
    backgroundColor: COLORS.primary.main,
  },
  compact: {
    padding: SPACING.sm,
    minWidth: 100,
  },
  iconContainer: {
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  labelHighlighted: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text.primary,
  },
  valueHighlighted: {
    color: '#FFFFFF',
  },
  unit: {
    fontSize: TYPOGRAPHY.sizes.bodyS,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.text.tertiary,
  },
  unitHighlighted: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 2,
  },
  trendUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  trendDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  trendIcon: {
    fontSize: 10,
    color: COLORS.semantic.success,
  },
  trendValue: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.semantic.success,
  },
});
