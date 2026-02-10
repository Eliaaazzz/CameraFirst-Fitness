/**
 * Magic Reticle Component
 *
 * A smart targeting reticle that provides visual feedback for food scanning.
 * Adapts to device capabilities (LiDAR, AR, Basic) and shows distance/status.
 *
 * States:
 * - searching: Red dashed ring - "Keep 30cm away"
 * - calibrating: Yellow solid ring - "Hold steady" (AR mode)
 * - ready: Green ring + haptic - "Ready! (35cm)"
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/Text';
import { DeviceTier } from '@/hooks/useDeviceCapabilities';

export type ReticleState = 'searching' | 'calibrating' | 'ready' | 'too_close' | 'too_far';

export interface MagicReticleProps {
  state: ReticleState;
  distance?: number; // in centimeters
  deviceTier: DeviceTier;
  accuracy?: string; // e.g., "±1cm"
  onReady?: () => void;
}

const STATE_COLORS = {
  searching: '#EF4444', // Red
  too_close: '#EF4444', // Red
  too_far: '#F59E0B', // Amber
  calibrating: '#F59E0B', // Yellow/Amber
  ready: '#22C55E', // Green
};

const STATE_MESSAGES: Record<ReticleState, string> = {
  searching: 'Detecting surface...',
  too_close: 'Move back a bit',
  too_far: 'Move closer',
  calibrating: 'Hold steady',
  ready: 'Ready!',
};

export const MagicReticle: React.FC<MagicReticleProps> = ({
  state,
  distance,
  deviceTier,
  accuracy,
  onReady,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevStateRef = useRef<ReticleState>(state);

  // Pulse animation for non-ready states
  useEffect(() => {
    if (state === 'ready') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);

      // Success scale animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Haptic feedback on transition to ready
      if (prevStateRef.current !== 'ready') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onReady?.();
      }
    } else {
      scaleAnim.setValue(1);

      // Gentle pulse for searching/calibrating
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();

      return () => loop.stop();
    }

    prevStateRef.current = state;
  }, [state, pulseAnim, scaleAnim, onReady]);

  const color = STATE_COLORS[state];
  const message = STATE_MESSAGES[state];
  const isReady = state === 'ready';
  const showDashed = state === 'searching' || state === 'too_close';

  // Format distance display
  const distanceText = distance !== undefined ? `${Math.round(distance)}cm` : '';

  // Tier-specific label
  const tierLabel = deviceTier === 'lidar' ? '⚡ Pro' : deviceTier === 'standard_ar' ? 'AR' : '';

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: color,
            opacity: pulseAnim,
            transform: [{ scale: scaleAnim }],
            borderStyle: showDashed ? 'dashed' : 'solid',
          },
        ]}
      />

      {/* Main reticle ring */}
      <Animated.View
        style={[
          styles.mainRing,
          {
            borderColor: color,
            transform: [{ scale: scaleAnim }],
            borderStyle: showDashed ? 'dashed' : 'solid',
          },
        ]}
      >
        <BlurView intensity={isReady ? 30 : 15} tint="dark" style={styles.blurFill}>
          {/* Center crosshair */}
          <View style={styles.crosshair}>
            <View style={[styles.crosshairLine, styles.crosshairH, { backgroundColor: color }]} />
            <View style={[styles.crosshairLine, styles.crosshairV, { backgroundColor: color }]} />
            <View style={[styles.crosshairDot, { backgroundColor: color }]} />
          </View>
        </BlurView>
      </Animated.View>

      {/* Corner brackets for "locked" feel */}
      {isReady && (
        <>
          <View style={[styles.corner, styles.cornerTL, { borderColor: color }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: color }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: color }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: color }]} />
        </>
      )}

      {/* Status label */}
      <View style={[styles.statusBadge, { backgroundColor: `${color}30` }]}>
        <Text weight="semibold" style={[styles.statusText, { color }]}>
          {message}
          {distanceText ? ` (${distanceText})` : ''}
        </Text>
        {tierLabel && (
          <Text style={[styles.tierBadge, { color }]}>{tierLabel}</Text>
        )}
      </View>

      {/* Accuracy indicator for LiDAR devices */}
      {deviceTier === 'lidar' && accuracy && isReady && (
        <View style={styles.accuracyBadge}>
          <Text style={styles.accuracyText}>{accuracy}</Text>
        </View>
      )}
    </View>
  );
};

const RING_SIZE = 220;
const OUTER_RING_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderRadius: OUTER_RING_SIZE / 2,
    borderWidth: 2,
  },
  mainRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
  },
  blurFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  crosshair: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLine: {
    position: 'absolute',
  },
  crosshairH: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  crosshairV: {
    width: 2,
    height: 24,
    borderRadius: 1,
  },
  crosshairDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  cornerTL: {
    top: 18,
    left: 18,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 18,
    right: 18,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 18,
    left: 18,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 18,
    right: 18,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  tierBadge: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  accuracyBadge: {
    position: 'absolute',
    top: -32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
  },
});

export default MagicReticle;
