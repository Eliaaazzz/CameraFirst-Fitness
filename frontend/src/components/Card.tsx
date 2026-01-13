import React, { PropsWithChildren } from 'react';
import { PressableProps, StyleSheet, ViewProps } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { radii, spacing } from '@/utils';

export interface CardProps extends PropsWithChildren<ViewProps> {
  onPress?: PressableProps['onPress'];
  elevation?: 'light' | 'medium' | 'heavy';
}

export const Card = ({ children, style, onPress, elevation = 'light', ...rest }: CardProps) => (
  <PaperCard style={[styles.base, style]} onPress={onPress} {...(rest as any)}>
    <PaperCard.Content>{children}</PaperCard.Content>
  </PaperCard>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
});
