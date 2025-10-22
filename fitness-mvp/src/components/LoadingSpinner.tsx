import React, { useEffect } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { getTheme } from '@/utils';

type SpinnerSize = 'small' | 'medium' | 'large';

const sizeToPixels: Record<SpinnerSize, number> = {
  small: 16,
  medium: 24,
  large: 32,
};

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

export const LoadingSpinner = ({ size = 'medium', color }: LoadingSpinnerProps) => {
  const rotation = useSharedValue(0);
  const dimension = sizeToPixels[size];
  const scheme = useColorScheme();
  const fallbackColor = getTheme(scheme === 'dark' ? 'dark' : 'light').colors.primary;

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.bezier(0.4, 0.0, 0.7, 1.0) }),
      -1,
      false,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const tint = color ?? fallbackColor;

  return (
    <View style={[styles.container, { width: dimension, height: dimension }]}>
      <Animated.View
        style={[
          styles.spinner,
          animatedStyle,
          {
            borderColor: `${tint}33`,
            borderTopColor: tint,
            width: dimension,
            height: dimension,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 999,
  },
});
