import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { BRAND_COLORS } from '@/utils';

interface ProgressVizProps {
  value: number;
  max: number;
  color?: string;
  style?: ViewStyle;
  height?: number;
}

export function ProgressViz({
  value,
  max,
  color = BRAND_COLORS.primary,
  style,
  height = 8,
}: ProgressVizProps) {
  const safeMax = max > 0 ? max : 1;
  const progress = Math.min(1, Math.max(0, value / safeMax));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${progress * 100}%`,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: BRAND_COLORS.surfaceVariant,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    minWidth: 6,
  },
});

export default ProgressViz;
