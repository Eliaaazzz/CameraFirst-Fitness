/**
 * NutritionRingsSkeleton — Shimmer loading placeholder for NutritionRingsCard
 *
 * Matches the exact layout of NutritionRingsCard (ring radii 85, 64, 43,
 * viewBox 200x200, header + content row with legend) so the transition
 * from skeleton to real data is seamless.
 *
 * Uses React Native's built-in Animated API (not Reanimated) for a simple
 * opacity pulse loop — lighter dependency for a non-interactive element.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES } from '@/components/common/BentoCard';
import { spacing } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

interface NutritionRingsSkeletonProps {
  /** Whether using mobile layout */
  isMobile?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SKELETON_COLOR = '#E5E7EB';
const TRACK_COLOR = '#E5E7EB';
const STROKE_WIDTH = 18;
const VIEW_BOX_SIZE = 200;
const CENTER = 100;
const RING_RADII = [85, 64, 43];

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
  width: number;
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
// LEGEND ITEM SKELETON
// ============================================================================

interface LegendItemSkeletonProps {
  opacity: Animated.Value;
}

function LegendItemSkeleton({ opacity }: LegendItemSkeletonProps) {
  return (
    <View style={styles.legendItem}>
      {/* Colored dot placeholder */}
      <Animated.View
        style={[styles.legendDot, { opacity }]}
      />

      {/* Text placeholders */}
      <View style={styles.legendContent}>
        <SkeletonRect width={48} height={10} opacity={opacity} />
        <View style={styles.legendValues}>
          <SkeletonRect width={32} height={14} opacity={opacity} />
          <SkeletonRect width={40} height={10} opacity={opacity} style={{ marginLeft: 4 }} />
        </View>
      </View>

      {/* Percentage badge placeholder */}
      <SkeletonRect width={40} height={20} opacity={opacity} borderRadius={10} />
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionRingsSkeleton({ isMobile = false }: NutritionRingsSkeletonProps) {
  const shimmerOpacity = useShimmerOpacity();

  return (
    <View style={styles.card}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <SkeletonRect width={140} height={18} opacity={shimmerOpacity} />
        <SkeletonRect width={90} height={14} opacity={shimmerOpacity} />
      </View>

      {/* Content row / column */}
      <View
        style={[
          styles.content,
          isMobile ? styles.contentMobile : styles.contentDesktop,
        ]}
      >
        {/* LEFT: Ring tracks */}
        <View
          style={[
            styles.ringsWrapper,
            isMobile ? styles.ringsWrapperMobile : styles.ringsWrapperDesktop,
          ]}
        >
          <View style={styles.ringsAspectBox}>
            <Animated.View style={{ opacity: shimmerOpacity, width: '100%', height: '100%' }}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
                preserveAspectRatio="xMidYMid meet"
              >
                {RING_RADII.map((radius) => (
                  <Circle
                    key={radius}
                    cx={CENTER}
                    cy={CENTER}
                    r={radius}
                    stroke={TRACK_COLOR}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                  />
                ))}
                {/* Center mask — matches NutritionRingsCard white center */}
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={36}
                  fill="white"
                  opacity={0.97}
                />
              </Svg>
            </Animated.View>
          </View>
        </View>

        {/* RIGHT: Legend skeletons (3 items matching protein / fat / carbs) */}
        <View
          style={[
            styles.legend,
            isMobile ? styles.legendMobile : styles.legendDesktop,
          ]}
        >
          <LegendItemSkeleton opacity={shimmerOpacity} />
          <LegendItemSkeleton opacity={shimmerOpacity} />
          <LegendItemSkeleton opacity={shimmerOpacity} />
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES — mirror NutritionRingsCard layout for seamless transition
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...BENTO_CARD_STYLES,
    ...(BENTO_CARD_WEB_STYLES as object),
    overflow: 'hidden' as const,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Content layout
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentDesktop: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  contentMobile: {
    flexDirection: 'column',
    gap: spacing.lg,
  },

  // Rings wrapper
  ringsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsWrapperDesktop: {
    flex: 1,
    maxWidth: 280,
    minWidth: 200,
  },
  ringsWrapperMobile: {
    width: '100%',
    maxWidth: 260,
  },
  ringsAspectBox: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },

  // Legend layout
  legend: {
    justifyContent: 'center',
  },
  legendDesktop: {
    flex: 1,
    minWidth: 180,
    maxWidth: 240,
    gap: spacing.lg,
  },
  legendMobile: {
    width: '100%',
    gap: spacing.md,
  },

  // Legend item skeleton
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SKELETON_COLOR,
    flexShrink: 0,
  },
  legendContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NutritionRingsSkeleton;
