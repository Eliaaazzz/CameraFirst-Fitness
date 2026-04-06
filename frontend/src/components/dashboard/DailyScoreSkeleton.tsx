/**
 * DailyScoreSkeleton — Shimmer loading placeholder for DailyScoreCard
 *
 * Matches the exact layout of DailyScoreCard (score dial on the left,
 * "DAILY SCORE" label + 4 breakdown rows with progress bars on the right)
 * so the transition from skeleton to real data is seamless.
 *
 * Uses React Native's built-in Animated API (not Reanimated) for a simple
 * opacity pulse loop — lighter dependency for a non-interactive element.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { spacing } from '@/utils';

// ============================================================================
// CONSTANTS — match DailyScoreCard dial dimensions
// ============================================================================

const SKELETON_COLOR = '#E5E7EB';
const DIAL_SIZE = 140;
const STROKE_WIDTH = 10;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const TRACK_COLOR = '#E5E7EB';
const BREAKDOWN_ROW_COUNT = 4;

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
// BREAKDOWN ROW SKELETON
// ============================================================================

interface BreakdownRowSkeletonProps {
  opacity: Animated.Value;
  /** Width of the progress bar fill (varies for visual variety) */
  fillPercent: `${number}%`;
}

function BreakdownRowSkeleton({ opacity, fillPercent }: BreakdownRowSkeletonProps) {
  return (
    <View style={styles.breakdownRow}>
      {/* Label + value row */}
      <View style={styles.breakdownMeta}>
        <SkeletonRect width={56} height={11} opacity={opacity} />
        <SkeletonRect width={40} height={10} opacity={opacity} />
      </View>

      {/* Progress track */}
      <View style={styles.breakdownTrack}>
        <Animated.View
          style={[
            styles.breakdownFill,
            { width: fillPercent, opacity },
          ]}
        />
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DailyScoreSkeleton() {
  const shimmerOpacity = useShimmerOpacity();

  // Vary bar fill widths for a natural look
  const fillPercents: `${number}%`[] = ['45%', '60%', '35%', '50%'];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* LEFT: Score dial placeholder */}
        <View style={styles.dialContainer}>
          <Animated.View style={{ opacity: shimmerOpacity }}>
            <Svg
              width={DIAL_SIZE}
              height={DIAL_SIZE}
              viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
            >
              {/* Track ring */}
              <Circle
                cx={DIAL_SIZE / 2}
                cy={DIAL_SIZE / 2}
                r={RADIUS}
                stroke={TRACK_COLOR}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
            </Svg>
          </Animated.View>

          {/* Center score placeholder */}
          <View style={styles.dialCenter}>
            <SkeletonRect width={48} height={32} opacity={shimmerOpacity} borderRadius={6} />
            <SkeletonRect
              width={56}
              height={12}
              opacity={shimmerOpacity}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>

        {/* RIGHT: Breakdown skeleton */}
        <View style={styles.breakdown}>
          {/* Title */}
          <SkeletonRect
            width={80}
            height={10}
            opacity={shimmerOpacity}
            style={{ marginBottom: spacing.xs }}
          />

          {/* Breakdown rows */}
          {Array.from({ length: BREAKDOWN_ROW_COUNT }).map((_, index) => (
            <BreakdownRowSkeleton
              key={index}
              opacity={shimmerOpacity}
              fillPercent={fillPercents[index]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES — mirror DailyScoreCard layout for seamless transition
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    padding: spacing.lg,
    overflow: 'hidden' as const,
  },

  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },

  // Dial
  dialContainer: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Breakdown
  breakdown: {
    flex: 1,
    gap: spacing.sm,
  },
  breakdownRow: {
    gap: 3,
  },
  breakdownMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: SKELETON_COLOR,
  },
});

export default DailyScoreSkeleton;
