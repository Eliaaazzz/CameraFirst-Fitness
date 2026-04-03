/**
 * CelebrationOverlay - Particle celebration animation
 *
 * Triggered on milestones: all daily tasks done, streak milestones, calorie goal.
 * Pure Reanimated particles + haptic feedback — no Lottie dependency.
 */
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BRAND_COLORS } from '@/utils';

interface CelebrationOverlayProps {
  /** Whether to show the celebration */
  visible: boolean;
  /** Message to display */
  message?: string;
  /** Called when animation completes */
  onComplete?: () => void;
}

const PARTICLE_COUNT = 12;
const PARTICLE_COLORS = [
  BRAND_COLORS.primary,
  BRAND_COLORS.secondary,
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
];

function Particle({ index, screenWidth, screenHeight }: { index: number; screenWidth: number; screenHeight: number }) {
  const progress = useSharedValue(0);

  // Randomized per-particle values (deterministic from index)
  const startX = useMemo(() => screenWidth * 0.3 + (screenWidth * 0.4) * ((index * 7 + 3) % 10) / 10, [index, screenWidth]);
  const endX = useMemo(() => startX + ((index % 2 === 0 ? 1 : -1) * (30 + (index * 13) % 60)), [index, startX]);
  const endY = useMemo(() => -(screenHeight * 0.3 + (index * 17 % 100)), [index, screenHeight]);
  const size = useMemo(() => 6 + (index * 3) % 8, [index]);
  const color = useMemo(() => PARTICLE_COLORS[index % PARTICLE_COLORS.length], [index]);
  const delay = useMemo(() => (index * 40) % 300, [index]);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p < 0.7 ? 1 : 1 - ((p - 0.7) / 0.3),
      transform: [
        { translateX: startX + (endX - startX) * p },
        { translateY: endY * p },
        { scale: p < 0.3 ? p / 0.3 : 1 - (p - 0.3) * 0.5 },
        { rotate: `${p * 360 * (index % 2 === 0 ? 1 : -1)}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: index % 3 === 0 ? 2 : size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function CelebrationOverlay({ visible, message = 'Amazing!', onComplete }: CelebrationOverlayProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const overlayOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    // Overlay fade in/out
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1400, withTiming(0, { duration: 400 }))
    );

    // Text entrance
    textScale.value = withSequence(
      withDelay(100, withTiming(1.1, { duration: 300, easing: Easing.out(Easing.back(2)) })),
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0.8, { duration: 300 }))
    );
    textOpacity.value = withSequence(
      withDelay(100, withTiming(1, { duration: 200 })),
      withDelay(1000, withTiming(0, { duration: 300 }, () => {
        if (onComplete) runOnJS(onComplete)();
      }))
    );
  }, [visible, overlayOpacity, textScale, textOpacity, onComplete]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      {/* Particles */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} screenWidth={screenWidth} screenHeight={screenHeight} />
      ))}

      {/* Celebration text */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text variant="heading1" weight="bold" style={styles.celebrationText}>
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    bottom: '50%',
  },
  textContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  celebrationText: {
    color: BRAND_COLORS.primary,
    textAlign: 'center',
  },
});

export default CelebrationOverlay;
