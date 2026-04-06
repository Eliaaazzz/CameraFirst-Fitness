/**
 * MealListSkeleton — Shimmer loading placeholder for Today's Meals list
 *
 * Matches the layout of MealListItem rows (56x56 square image placeholder,
 * two text lines for name + time, and a calorie value on the right)
 * so the transition from skeleton to real data is seamless.
 *
 * Uses React Native's built-in Animated API (not Reanimated) for a simple
 * opacity pulse loop — lighter dependency for a non-interactive element.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const SKELETON_COLOR = '#E5E7EB';
const MEAL_ROW_COUNT = 3;
const IMAGE_SIZE = 56;
const IMAGE_RADIUS = 12;

// ============================================================================
// SHIMMER HOOK
// ============================================================================

/**
 * Returns an Animated.Value that pulses between 0.3 and 0.7
 * in a continuous loop (1000ms easeInOut).
 */
function useShimmerOpacity(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

// ============================================================================
// SKELETON BUILDING BLOCKS
// ============================================================================

interface SkeletonRectProps {
  width: number | string;
  height: number;
  opacity: Animated.Value;
  borderRadius?: number;
  style?: object;
}

function SkeletonRect({ width, height, opacity, borderRadius = 4, style }: SkeletonRectProps) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: SKELETON_COLOR,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ============================================================================
// MEAL ROW SKELETON
// ============================================================================

interface MealRowSkeletonProps {
  opacity: Animated.Value;
  /** Width of the meal name placeholder (varies for visual variety) */
  nameWidth: number;
}

function MealRowSkeleton({ opacity, nameWidth }: MealRowSkeletonProps) {
  return (
    <View style={styles.mealRow}>
      {/* Square image placeholder */}
      <Animated.View style={[styles.mealImage, { opacity }]} />

      {/* Text content — name + time */}
      <View style={styles.mealContent}>
        <SkeletonRect width={nameWidth} height={14} opacity={opacity} />
        <SkeletonRect width={50} height={11} opacity={opacity} />
      </View>

      {/* Calorie value */}
      <SkeletonRect width={52} height={14} opacity={opacity} borderRadius={4} />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MealListSkeleton() {
  const shimmerOpacity = useShimmerOpacity();

  // Vary name widths for a natural look
  const nameWidths = [120, 100, 140];

  return (
    <View style={styles.container}>
      {Array.from({ length: MEAL_ROW_COUNT }).map((_, index) => (
        <MealRowSkeleton
          key={index}
          opacity={shimmerOpacity}
          nameWidth={nameWidths[index]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// STYLES — mirror MealListItem layout for seamless transition
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },

  // Meal row — matches MealListItem container
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(236,233,226,1)',
    gap: spacing.sm,
  },

  // Image placeholder — matches MealImage size 56, borderRadius 12
  mealImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_RADIUS,
    backgroundColor: SKELETON_COLOR,
    marginRight: 4,
  },

  // Text content
  mealContent: {
    flex: 1,
    gap: 6,
  },
});

export default MealListSkeleton;
