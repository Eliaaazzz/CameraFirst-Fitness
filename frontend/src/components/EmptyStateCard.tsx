import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

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
 * Inspired by Linear / Arc / Notion dark theme aesthetics
 *
 * Design principles:
 * - Layered surfaces (outer card > inner panel > icon container)
 * - Restrained use of color
 * - Clear visual hierarchy
 * - 8pt spacing grid
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
    <View style={[styles.outerCard, style]}>
      <View style={contentStyles}>
        {/* Compact icon container */}
        <View style={styles.iconContainer}>
          {icon}
        </View>

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
      </View>

      {/* CTA Button - render only when provided */}
      {ctaLabel && onCtaPress ? (
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
      ) : null}
    </View>
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
    // Web max-width handled by Container
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

  // Compact icon container - not oversized
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 205, 196, 0.12)',
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
    color: '#1A1F2E',
  },
});
