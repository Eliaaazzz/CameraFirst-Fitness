/**
 * DailyTasksSkeleton — Shimmer loading placeholder for DailyTasksCard
 *
 * Matches the exact layout of DailyTasksCard (header with title/subtitle,
 * progress bar, and 4 task items with checkbox circles + text lines)
 * so the transition from skeleton to real data is seamless.
 *
 * Uses React Native's built-in Animated API (not Reanimated) for a simple
 * opacity pulse loop — lighter dependency for a non-interactive element.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { spacing } from '@/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const SKELETON_COLOR = '#E5E7EB';
const TASK_COUNT = 4;

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
// TASK ITEM SKELETON
// ============================================================================

interface TaskItemSkeletonProps {
  opacity: Animated.Value;
  /** Width of the text placeholder (varies for visual variety) */
  textWidth: number;
}

function TaskItemSkeleton({ opacity, textWidth }: TaskItemSkeletonProps) {
  return (
    <View style={styles.taskItem}>
      {/* Checkbox circle */}
      <Animated.View style={[styles.taskCheck, { opacity }]} />

      {/* Icon placeholder */}
      <Animated.View style={[styles.taskIcon, { opacity }]} />

      {/* Text placeholder */}
      <SkeletonRect width={textWidth} height={14} opacity={opacity} />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DailyTasksSkeleton() {
  const shimmerOpacity = useShimmerOpacity();

  // Vary text widths for a natural look
  const textWidths = [100, 120, 160, 140];

  return (
    <View style={styles.card}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <View>
          <SkeletonRect width={120} height={18} opacity={shimmerOpacity} />
          <SkeletonRect
            width={80}
            height={12}
            opacity={shimmerOpacity}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>

      {/* Progress bar skeleton */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { opacity: shimmerOpacity }]} />
      </View>

      {/* Task list skeleton */}
      <View style={styles.taskList}>
        {Array.from({ length: TASK_COUNT }).map((_, index) => (
          <TaskItemSkeleton
            key={index}
            opacity={shimmerOpacity}
            textWidth={textWidths[index]}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES — mirror DailyTasksCard layout for seamless transition
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    padding: spacing.lg,
    overflow: 'hidden' as const,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    width: '25%',
    borderRadius: 2,
    backgroundColor: SKELETON_COLOR,
  },

  // Task list
  taskList: {
    gap: spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SKELETON_COLOR,
  },
  taskIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: SKELETON_COLOR,
  },
});

export default DailyTasksSkeleton;
