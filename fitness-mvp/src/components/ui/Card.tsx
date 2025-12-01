import { BORDER_RADIUS, COLORS, ELEVATION, SPACING } from '@/utils/theme';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = false,
  variant = 'default',
}) => {
  const cardStyle = [
    styles.card,
    elevated && ELEVATION.level1,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    ...ELEVATION.level1,
  },
  elevated: {
    backgroundColor: COLORS.dark.surfaceElevated,
    ...ELEVATION.level2,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.neutral.divider,
  },
});
