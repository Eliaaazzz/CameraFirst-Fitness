import React, { PropsWithChildren } from 'react';
import { PressableProps, StyleSheet, ViewProps } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { radii, shadows } from '@/utils';

export interface CardProps extends PropsWithChildren<ViewProps> {
  onPress?: PressableProps['onPress'];
  elevation?: 'none' | 'light' | 'medium' | 'heavy';
}

const elevationStyles = {
  none: {},
  light: shadows.light.light,
  medium: shadows.light.medium,
  heavy: shadows.light.heavy,
};

export const Card = ({ children, style, onPress, elevation = 'light', ...rest }: CardProps) => (
  <PaperCard
    style={[styles.base, elevationStyles[elevation], style]}
    onPress={onPress}
    {...(rest as any)}
  >
    <PaperCard.Content style={styles.content}>{children}</PaperCard.Content>
  </PaperCard>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
