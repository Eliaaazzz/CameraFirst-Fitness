import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/Text';
import { BRAND_COLORS, radii, spacing } from '@/utils';

interface RecognitionProcessingHeroProps {
  imageUri?: string | null;
  modeLabel?: string;
  title: string;
  subtitle: string;
  phaseLabels?: readonly string[];
  activePhase?: number;
  callouts?: readonly string[];
  compact?: boolean;
}

const DEFAULT_PHASES = ['Scan', 'Portion', 'Macros'] as const;
const DEFAULT_CALLOUTS = ['Food edges', 'Portion depth', 'Macro estimate'] as const;

export function RecognitionProcessingHero({
  imageUri,
  modeLabel = 'AURA VISION',
  title,
  subtitle,
  phaseLabels = DEFAULT_PHASES,
  activePhase = 1,
  callouts = DEFAULT_CALLOUTS,
  compact = false,
}: RecognitionProcessingHeroProps) {
  const scanProgress = useRef(new Animated.Value(0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const orbitProgress = useRef(new Animated.Value(0)).current;
  const calloutAnims = useRef((callouts.slice(0, 3) as string[]).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.timing(scanProgress, {
        toValue: 1,
        duration: compact ? 2000 : 2400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    const orbitLoop = Animated.loop(
      Animated.timing(orbitProgress, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const calloutLoops = calloutAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 220),
          Animated.timing(anim, {
            toValue: 1,
            duration: 820,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.52,
            duration: 1100,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      )
    );

    scanProgress.setValue(0);
    pulseProgress.setValue(0);
    orbitProgress.setValue(0);
    calloutAnims.forEach((anim) => anim.setValue(0));

    scanLoop.start();
    pulseLoop.start();
    orbitLoop.start();
    calloutLoops.forEach((loop) => loop.start());

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
      orbitLoop.stop();
      calloutLoops.forEach((loop) => loop.stop());
    };
  }, [calloutAnims, compact, orbitProgress, pulseProgress, scanProgress]);

  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: compact ? [-72, 148] : [-96, 188],
  });

  const scanOpacity = scanProgress.interpolate({
    inputRange: [0, 0.08, 0.92, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });

  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });

  const orbitRotate = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const stageHeight = compact ? 220 : 300;
  const visibleCallouts = useMemo(() => callouts.slice(0, 3), [callouts]);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.stage, { height: stageHeight }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.stageTint} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbitRing,
            {
              transform: [{ rotate: orbitRotate }],
            },
          ]}
        />

        <View pointerEvents="none" style={styles.focusFrame}>
          <View style={[styles.focusCorner, styles.focusTopLeft]} />
          <View style={[styles.focusCorner, styles.focusTopRight]} />
          <View style={[styles.focusCorner, styles.focusBottomLeft]} />
          <View style={[styles.focusCorner, styles.focusBottomRight]} />
        </View>

        {visibleCallouts.map((label, index) => {
          const opacity = calloutAnims[index];
          if (!opacity) {
            return null;
          }
          const translateY = opacity.interpolate({
            inputRange: [0.52, 1],
            outputRange: [6, 0],
          });
          return (
            <Animated.View
              key={label}
              pointerEvents="none"
              style={[
                styles.callout,
                CALL_OUT_POSITIONS[index] ?? CALL_OUT_POSITIONS[0],
                {
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.calloutDot} />
              <Text variant="caption" weight="semibold" style={styles.calloutText}>
                {label}
              </Text>
            </Animated.View>
          );
        })}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanBand,
            {
              opacity: scanOpacity,
              transform: [{ translateY: scanTranslateY }],
            },
          ]}
        />

        <View pointerEvents="none" style={styles.stageBadges}>
          <View style={styles.modePill}>
            <Text variant="label" weight="bold" style={styles.modePillText}>
              {modeLabel}
            </Text>
          </View>
          <View style={styles.previewPill}>
            <Text variant="caption" weight="bold" style={styles.previewPillText}>
              Live recognition
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.copy}>
        <Text variant="heading3" weight="bold" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.phaseRow}>
        {phaseLabels.map((label, index) => {
          const isActive = activePhase >= index + 1;
          return (
            <View key={label} style={[styles.phasePill, isActive && styles.phasePillActive]}>
              <Text
                variant="caption"
                weight="bold"
                style={isActive ? [styles.phaseText, styles.phaseTextActive] : styles.phaseText}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const CALL_OUT_POSITIONS = [
  { top: 22, left: 18 },
  { top: 72, right: 18 },
  { bottom: 24, left: 24 },
] as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    padding: 14,
    gap: 14,
  },
  cardCompact: {
    padding: 12,
    gap: 12,
  },
  stage: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B',
  },
  stageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.36)',
  },
  pulseRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 138,
    height: 138,
    marginLeft: -69,
    marginTop: -69,
    borderRadius: 69,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  orbitRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 188,
    height: 188,
    marginLeft: -94,
    marginTop: -94,
    borderRadius: 94,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  focusFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 168,
    height: 168,
    marginLeft: -84,
    marginTop: -84,
  },
  focusCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  focusTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 12,
  },
  focusTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 12,
  },
  focusBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 12,
  },
  focusBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 12,
  },
  callout: {
    position: 'absolute',
    minHeight: 34,
    maxWidth: 160,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.secondary,
  },
  calloutText: {
    color: '#0F172A',
    flexShrink: 1,
  },
  scanBand: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  stageBadges: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(15,23,42,0.72)',
  },
  modePillText: {
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  previewPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  previewPillText: {
    color: '#111111',
  },
  copy: {
    gap: 4,
  },
  title: {
    color: '#0F172A',
  },
  subtitle: {
    color: '#6B7280',
    lineHeight: 18,
  },
  phaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: '#F1F5F9',
  },
  phasePillActive: {
    backgroundColor: 'rgba(15,118,110,0.12)',
  },
  phaseText: {
    color: '#64748B',
  },
  phaseTextActive: {
    color: '#0F766E',
  },
});

export default RecognitionProcessingHero;
