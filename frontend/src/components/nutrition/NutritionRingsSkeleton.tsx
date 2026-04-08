/**
 * NutritionRingsSkeleton — Shimmer loading placeholder for NutritionRingsCard.
 * Matches the compact vertical layout: rings → P/F/C → calories → macro rows.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';

const SKELETON_COLOR = '#E5E7EB';
const STROKE_WIDTH = 20;
const RING_RADII = [82, 60, 38];

function useShimmerOpacity(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

function SkeletonRect({ width, height, opacity, borderRadius = 4, style }: {
  width: number; height: number; opacity: Animated.Value; borderRadius?: number; style?: object;
}) {
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: SKELETON_COLOR, opacity }, style]} />;
}

function MacroRowSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.macroRow}>
      <Animated.View style={[styles.dot, { opacity }]} />
      <SkeletonRect width={48} height={12} opacity={opacity} />
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFillSkeleton, { opacity }]} />
      </View>
      <SkeletonRect width={60} height={12} opacity={opacity} />
      <SkeletonRect width={30} height={14} opacity={opacity} />
    </View>
  );
}

export function NutritionRingsSkeleton() {
  const shimmer = useShimmerOpacity();

  return (
    <View style={styles.card}>
      {/* Ring tracks */}
      <View style={styles.ringsContainer}>
        <Animated.View style={{ opacity: shimmer, width: '100%', height: '100%' }}>
          <Svg width="100%" height="100%" viewBox="0 0 200 175" preserveAspectRatio="xMidYMid meet">
            {RING_RADII.map((r) => (
              <Circle key={r} cx={100} cy={100} r={r} stroke={SKELETON_COLOR} strokeWidth={STROKE_WIDTH}
                fill="none" strokeLinecap="round" />
            ))}
          </Svg>
        </Animated.View>
      </View>

      {/* P / F / C placeholders */}
      <View style={styles.ringLabels}>
        <SkeletonRect width={14} height={14} opacity={shimmer} borderRadius={7} />
        <SkeletonRect width={14} height={14} opacity={shimmer} borderRadius={7} />
        <SkeletonRect width={14} height={14} opacity={shimmer} borderRadius={7} />
      </View>

      {/* Calorie placeholder */}
      <View style={styles.calorieSection}>
        <SkeletonRect width={120} height={28} opacity={shimmer} borderRadius={6} />
      </View>

      {/* Macro row placeholders */}
      <View style={styles.macroRows}>
        <MacroRowSkeleton opacity={shimmer} />
        <MacroRowSkeleton opacity={shimmer} />
        <MacroRowSkeleton opacity={shimmer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    alignItems: 'center',
    overflow: 'hidden' as const,
  },

  ringsContainer: { width: '100%', maxWidth: 200, aspectRatio: 200 / 175 },

  ringLabels: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4, marginBottom: 8 },

  calorieSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },

  macroRows: { width: '100%', gap: 14 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SKELETON_COLOR },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.04)', overflow: 'hidden' },
  barFillSkeleton: { width: '30%', height: '100%', borderRadius: 4, backgroundColor: SKELETON_COLOR },
});

export default NutritionRingsSkeleton;
