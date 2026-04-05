import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { BRAND_COLORS, radii, spacing } from '@/utils';

import { Text } from './Text';

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
  variant?: 'layered' | 'single';
}

export const EmptyStateCard = ({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
  style,
  variant = 'layered',
}: EmptyStateCardProps) => {
  const contentStyles = variant === 'single' ? styles.singlePanel : styles.innerPanel;

  return (
    <Animated.View entering={FadeIn.duration(260)} style={[styles.outerCard, style]}>
      <Animated.View entering={SlideInDown.duration(260)} style={contentStyles}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.textContainer}>
          <Text variant="heading3" weight="semibold" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      {ctaLabel && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text variant="body" weight="semibold" style={styles.ctaText}>
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerCard: {
    backgroundColor: BRAND_COLORS.surfaceElevated,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
  },
  innerPanel: {
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  singlePanel: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BRAND_COLORS.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
    color: BRAND_COLORS.textPrimary,
  },
  subtitle: {
    textAlign: 'center',
    color: BRAND_COLORS.textSecondary,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  ctaButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'transform 0.15s ease, opacity 0.15s ease',
    }),
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#FFFFFF',
  },
});

