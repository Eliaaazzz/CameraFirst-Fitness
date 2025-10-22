import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadingSpinner } from './LoadingSpinner';
import { Text } from './Text';
import { spacing } from '@/utils';

interface LoadingStateProps {
  label?: string;
}

export const LoadingState = ({ label = 'Loading…' }: LoadingStateProps) => (
  <View style={styles.container} accessible accessibilityLiveRegion="polite">
    <LoadingSpinner size="large" />
    <Text variant="caption" color="rgba(148, 163, 184, 0.9)">
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
});
