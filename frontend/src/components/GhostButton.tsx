/**
 * GhostButton Component
 * Shadcn UI-inspired ghost button with hover & press animations
 * Perfect for sidebars, menus, and secondary actions
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, spacing } from '@/utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type GhostButtonVariant = 'default' | 'sidebar' | 'menu' | 'danger';

interface GhostButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showChevron?: boolean;
  isActive?: boolean;
  variant?: GhostButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * GhostButton - Transparent button with hover/press feedback
 * Matches Shadcn UI's ghost variant behavior
 */
export function GhostButton({
  children,
  onPress,
  leftIcon,
  rightIcon,
  showChevron = false,
  isActive = false,
  variant = 'default',
  disabled = false,
  style,
}: GhostButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isActive ? 1 : 0);
  const chevronX = useSharedValue(0);

  // Update background on hover/active state changes
  useEffect(() => {
    if (isActive) {
      bgOpacity.value = withTiming(1, { duration: 150 });
    } else {
      bgOpacity.value = withTiming(isHovered ? 0.6 : 0, { duration: 150 });
    }
    chevronX.value = withSpring(isHovered ? 3 : 0, { damping: 15, stiffness: 200 });
  }, [isHovered, isActive, bgOpacity, chevronX]);

  const handlePressIn = useCallback(() => {
    if (!disabled) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    }
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, [scale]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronX.value }],
    opacity: interpolate(chevronX.value, [0, 3], [0.4, 1]),
  }));

  // Get variant-specific colors
  const getVariantColors = () => {
    switch (variant) {
      case 'sidebar':
        return {
          bgActive: BRAND_COLORS.primary + '15',
          bgHover: colors.light.surfaceVariant,
          textActive: BRAND_COLORS.primary,
          textHover: BRAND_COLORS.textPrimary,
          textDefault: colors.light.textSecondary,
        };
      case 'menu':
        return {
          bgActive: BRAND_COLORS.primary + '10',
          bgHover: colors.light.surfaceVariant,
          textActive: BRAND_COLORS.primary,
          textHover: BRAND_COLORS.textPrimary,
          textDefault: BRAND_COLORS.textPrimary,
        };
      case 'danger':
        return {
          bgActive: '#EF444415',
          bgHover: '#EF444410',
          textActive: '#EF4444',
          textHover: '#EF4444',
          textDefault: colors.light.textSecondary,
        };
      default:
        return {
          bgActive: colors.light.surfaceVariant,
          bgHover: colors.light.surfaceVariant,
          textActive: BRAND_COLORS.textPrimary,
          textHover: BRAND_COLORS.textPrimary,
          textDefault: colors.light.textSecondary,
        };
    }
  };

  const variantColors = getVariantColors();
  const currentTextColor = isActive
    ? variantColors.textActive
    : isHovered
    ? variantColors.textHover
    : variantColors.textDefault;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.container, containerStyle, disabled && styles.disabled, style]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      {/* Ghost background */}
      <Animated.View
        style={[
          styles.background,
          { backgroundColor: isActive ? variantColors.bgActive : variantColors.bgHover },
          bgStyle,
        ]}
      />

      {/* Active indicator (for sidebar variant) */}
      {variant === 'sidebar' && isActive && (
        <View style={styles.activeIndicator} />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Left icon */}
        {leftIcon && (
          <View style={styles.leftIcon}>
            {React.isValidElement(leftIcon)
              ? React.cloneElement(leftIcon as React.ReactElement<any>, {
                  color: currentTextColor,
                })
              : leftIcon}
          </View>
        )}

        {/* Text content */}
        <View style={styles.textContainer}>
          {typeof children === 'string' ? (
            <Text
              variant="body"
              weight={isActive ? 'semibold' : 'regular'}
              style={{ color: currentTextColor }}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>

        {/* Right icon or chevron */}
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        {showChevron && (
          <Animated.View style={[styles.chevron, chevronStyle]}>
            <Feather
              name="chevron-right"
              size={14}
              color={isHovered ? currentTextColor : '#CCC'}
            />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GhostButton;
