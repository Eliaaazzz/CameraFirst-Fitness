import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/utils';
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

/**
 * EmptyStateCard - Premium empty state design
 * Inspired by Linear / Arc / Notion aesthetics
 * Includes entrance animations for a polished feel.
 */
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
    <Animated.View entering={FadeIn.duration(400)} style={[styles.outerCard, style]}>
      <Animated.View entering={SlideInDown.duration(400).delay(100)} style={contentStyles}>
        {/* Compact icon container */}
        <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.iconContainer}>
          {icon}
        </Animated.View>

        {/* Text content with clear hierarchy */}
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

      {/* CTA Button - render only when provided */}
      {ctaLabel && onCtaPress ? (
        <Animated.View entering={FadeIn.duration(400).delay(300)}>
          <Pressable
            onPress={onCtaPress}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <Text variant="body" weight="semibold" style={styles.ctaText}>
              {ctaLabel}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Outer surface - light card
  outerCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    // Subtle border for layering
    borderWidth: 1,
    borderColor: colors.light.border,
  },

  // Inner panel - slightly elevated surface
  innerPanel: {
    backgroundColor: colors.light.surfaceVariant,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  singlePanel: {
    alignItems: 'center',
    gap: spacing.lg,
  },

  // Compact icon container
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text with clear hierarchy
  textContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },

  title: {
    textAlign: 'center',
    color: colors.light.textPrimary,
  },

  subtitle: {
    textAlign: 'center',
    color: colors.light.textSecondary,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },

  // CTA button - contained style
  ctaButton: {
    backgroundColor: colors.light.primary,
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
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  ctaText: {
    color: '#FFFFFF',
  },
});
