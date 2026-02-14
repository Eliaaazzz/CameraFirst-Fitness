import React, { PropsWithChildren, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { Feather } from '@expo/vector-icons';

import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardCardProps extends PropsWithChildren {
  /** Card title displayed in the header */
  title: string;
  /** Optional subtitle text next to the title */
  subtitle?: string;
  /** Optional icon component to display before the title */
  icon?: React.ReactNode;
  /** Optional action button in the header (e.g., edit, expand) */
  headerAction?: {
    icon: string;
    onPress: () => void;
    label?: string;
  };
  /** Custom content to render in the header right area instead of headerAction */
  headerRight?: React.ReactNode;
  /** Whether the card is pressable */
  onPress?: () => void;
  /** Additional styles for the card container */
  style?: ViewStyle;
  /** Additional styles for the content area */
  contentStyle?: ViewStyle;
  /** Elevation level for the card shadow */
  elevation?: 'subtle' | 'card' | 'elevated';
  /** Whether to show the primary accent border */
  accentBorder?: boolean;
  /** Whether to fill available height (for flex layouts) */
  fillHeight?: boolean;
}

// ============================================================================
// ELEVATION STYLES
// ============================================================================

const elevationStyles = {
  subtle: saasShadows.subtle,
  card: saasShadows.card,
  elevated: saasShadows.cardElevated,
};

// ============================================================================
// DASHBOARD CARD COMPONENT
// ============================================================================

/**
 * DashboardCard - A unified card component for dashboard sections
 *
 * Features:
 * - Consistent header with title, optional icon, subtitle, and action
 * - White background with rounded corners
 * - Warm orange accent support for visual hierarchy
 * - Hover effects on web for interactive cards
 * - SaaS-style shadows for premium feel
 *
 * Usage:
 * ```tsx
 * <DashboardCard
 *   title="Today's Nutrition"
 *   subtitle="465 / 1900 kcal"
 *   headerAction={{ icon: 'more-horizontal', onPress: handleOptions }}
 * >
 *   <NutritionRings />
 * </DashboardCard>
 * ```
 */
export function DashboardCard({
  title,
  subtitle,
  icon,
  headerAction,
  headerRight,
  onPress,
  style,
  contentStyle,
  children,
  elevation = 'card',
  accentBorder = false,
  fillHeight = false,
}: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Web hover handlers for interactive cards
  const webHoverProps =
    Platform.OS === 'web' && onPress
      ? {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  const cardContent = (
    <View
      style={[
        styles.card,
        elevationStyles[elevation],
        accentBorder && styles.accentBorder,
        fillHeight && styles.fillHeight,
        isHovered && onPress && styles.cardHovered,
        style,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.headerTitles}>
            <Text variant="heading3" weight="semibold" style={styles.title}>
              {title}
            </Text>
            {subtitle && (
              <Text variant="caption" style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Header Right: Custom content or action button */}
        {headerRight ? (
          <View style={styles.headerRight}>{headerRight}</View>
        ) : headerAction ? (
          <HeaderActionButton
            icon={headerAction.icon}
            onPress={headerAction.onPress}
            label={headerAction.label}
          />
        ) : null}
      </View>

      {/* Content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  // Wrap in Pressable if onPress is provided
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          pressed ? styles.cardPressed : null,
        ]}
        onPress={onPress}
        {...webHoverProps}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

// ============================================================================
// HEADER ACTION BUTTON
// ============================================================================

interface HeaderActionButtonProps {
  icon: string;
  onPress: () => void;
  label?: string;
}

function HeaderActionButton({ icon, onPress, label }: HeaderActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      style={[styles.headerActionButton, isHovered && styles.headerActionButtonHovered]}
      onPress={onPress}
      accessibilityLabel={label}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      <Feather name={icon as any} size={16} color={BRAND_COLORS.primary} />
    </Pressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.48)',
    padding: spacing.lg,
    // Floating glass shadow
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    shadowOpacity: 0.06,
    elevation: 3,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-out',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
    }),
  },
  accentBorder: {
    borderColor: 'rgba(249, 115, 22, 0.18)',
  },
  fillHeight: {
    flex: 1,
  },
  cardHovered: {
    ...(Platform.OS === 'web' && {
      borderColor: 'rgba(255, 255, 255, 0.72)',
      boxShadow: '0 12px 36px rgba(15, 23, 42, 0.1)',
    }),
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
  },
  subtitle: {
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${BRAND_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  headerActionButtonHovered: {
    backgroundColor: `${BRAND_COLORS.primary}20`,
  },
  content: {
    // Content area - children control their own spacing
  },
});

export default DashboardCard;
