import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BRAND_COLORS, spacing } from '@/utils';

import { Card } from '@/components/Card';
import { Text } from '@/components/Text';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, hint, icon }: MetricCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color={BRAND_COLORS.textMuted}>
          {label}
        </Text>
        {icon ? <View>{icon}</View> : null}
      </View>
      <Text variant="heading3" weight="bold">
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color={BRAND_COLORS.textSecondary}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default MetricCard;
