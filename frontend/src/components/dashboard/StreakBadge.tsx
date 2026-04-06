/**
 * StreakBadge - Enhanced streak display with milestone tiers
 *
 * Tiers:
 *   0-2  days: Gray (getting started)
 *   3-6  days: Orange (warming up)
 *   7-13 days: Gold (on fire)
 *   14-29 days: Gradient (unstoppable)
 *   30+ days: Special glow (legendary)
 */
import * as Haptics from 'expo-haptics';
import { Flame } from 'phosphor-react-native';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing, SpringPresets } from '@/utils';

interface StreakBadgeProps {
  streak: number;
  /** Compact mode for inline display */
  compact?: boolean;
}

function getStreakTier(streak: number) {
  if (streak >= 30) return { label: 'Legendary', color: BRAND_COLORS.streak.red, bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.25)', glow: true };
  if (streak >= 14) return { label: 'Unstoppable', color: BRAND_COLORS.streak.orange, bg: 'rgba(234,88,12,0.12)', border: 'rgba(234,88,12,0.2)', glow: false };
  if (streak >= 7) return { label: 'On Fire', color: BRAND_COLORS.streak.gold, bg: 'rgba(217,119,6,0.12)', border: 'rgba(217,119,6,0.2)', glow: false };
  if (streak >= 3) return { label: 'Warming Up', color: BRAND_COLORS.streak.orange, bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.15)', glow: false };
  return { label: '', color: BRAND_COLORS.streak.gray, bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.15)', glow: false };
}

function getNextMilestone(streak: number): number {
  if (streak < 3) return 3;
  if (streak < 7) return 7;
  if (streak < 14) return 14;
  if (streak < 30) return 30;
  return streak; // At max tier
}

export function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  const tier = getStreakTier(streak);
  const scale = useSharedValue(0.8);
  const prevStreak = useRef(streak);

  useEffect(() => {
    // Fire haptic on tier milestone transitions
    if (Platform.OS !== 'web' && streak !== prevStreak.current) {
      const milestones = [3, 7, 14, 30];
      if (milestones.includes(streak)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    prevStreak.current = streak;
    scale.value = withSpring(1, SpringPresets.tabBounce);
  }, [streak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const compactA11yLabel = tier.label
    ? `${streak} day streak, ${tier.label.toLowerCase()} tier`
    : `${streak} day streak`;

  if (compact) {
    return (
      <Animated.View
        style={[styles.compactBadge, { backgroundColor: tier.bg, borderColor: tier.border }, animatedStyle]}
        accessibilityRole="text"
        accessibilityLabel={compactA11yLabel}
      >
        <Flame size={14} color={tier.color} weight="fill" />
        <Text variant="caption" weight="bold" style={{ color: tier.color, fontSize: 13 }}>
          {streak}
        </Text>
      </Animated.View>
    );
  }

  const nextMilestone = getNextMilestone(streak);
  const milestoneProgress = nextMilestone > streak ? (streak / nextMilestone) : 1;

  const fullA11yLabel = tier.label
    ? `${streak} day streak, ${tier.label.toLowerCase()} tier${nextMilestone > streak ? `, next milestone at ${nextMilestone} days` : ''}`
    : `${streak} day streak${nextMilestone > streak ? `, next milestone at ${nextMilestone} days` : ''}`;

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: tier.bg, borderColor: tier.border }, animatedStyle]}
      accessibilityRole="text"
      accessibilityLabel={fullA11yLabel}
    >
      <View style={styles.badgeRow}>
        <Flame size={18} color={tier.color} weight="fill" />
        <View style={styles.badgeInfo}>
          <View style={styles.badgeTopRow}>
            <Text variant="body" weight="bold" style={{ color: tier.color, fontSize: 18 }}>
              {streak}
            </Text>
            <Text variant="caption" style={{ color: tier.color, opacity: 0.7 }}> day streak</Text>
          </View>
          {tier.label !== '' && (
            <Text variant="caption" weight="medium" style={{ color: tier.color, fontSize: 10, letterSpacing: 0.5 }}>
              {tier.label.toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      {/* Progress to next milestone */}
      {nextMilestone > streak && (
        <View style={styles.milestoneRow}>
          <View style={styles.milestoneTrack}>
            <View style={[styles.milestoneFill, { width: `${milestoneProgress * 100}%`, backgroundColor: tier.color }]} />
          </View>
          <Text variant="caption" style={styles.milestoneLabel}>{nextMilestone}d</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badge: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  milestoneTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    borderRadius: 2,
  },
  milestoneLabel: {
    color: BRAND_COLORS.textDisabled,
    fontSize: 10,
  },
});

export default StreakBadge;
