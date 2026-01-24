/**
 * LogMealButton Component
 * Enhanced primary action button with loading state and spring animations
 * Inspired by Shadcn UI Button + Framer Motion interactions
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

// Animated Pressable for smooth interactions
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LogMealButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'compact' | 'fab';
  disabled?: boolean;
}

/**
 * LogMealButton - Primary action button with S-tier UX
 * Features:
 * - Spring scale animation on press
 * - Loading state with spinner
 * - Hover effects on web
 * - Glow pulse animation when idle
 */
export function LogMealButton({
  onPress,
  isLoading = false,
  loadingText = 'Analyzing...',
  variant = 'primary',
  disabled = false,
}: LogMealButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);

  // Subtle idle pulse animation (glow effect)
  useEffect(() => {
    if (!isLoading && !disabled) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite
        false
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading, disabled, glowOpacity]);

  // Loading spinner rotation
  useEffect(() => {
    if (isLoading) {
      iconRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      iconRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading, iconRotation]);

  // Hover effect
  useEffect(() => {
    bgOpacity.value = withTiming(isHovered && !isLoading ? 1.1 : 1, { duration: 150 });
  }, [isHovered, isLoading, bgOpacity]);

  const handlePressIn = useCallback(() => {
    if (!isLoading && !disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  }, [isLoading, disabled, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (!isLoading && !disabled) {
      onPress();
    }
  }, [isLoading, disabled, onPress]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 0.4], [1, 1.15]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  // Variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return styles.compact;
      case 'fab':
        return styles.fab;
      default:
        return styles.primary;
    }
  };

  const isDisabledOrLoading = disabled || isLoading;

  return (
    <View style={styles.wrapper}>
      {/* Glow effect background */}
      <Animated.View style={[styles.glow, getVariantStyles(), glowStyle]} />
      
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabledOrLoading}
        style={[
          styles.button,
          getVariantStyles(),
          containerStyle,
          isDisabledOrLoading && styles.buttonDisabled,
          isHovered && !isDisabledOrLoading && styles.buttonHovered,
        ]}
        {...(Platform.OS === 'web' && {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        })}
      >
        {isLoading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text variant="body" weight="semibold" style={styles.text}>
              {loadingText}
            </Text>
          </>
        ) : (
          <>
            <Animated.View style={iconStyle}>
              <MaterialCommunityIcons
                name={variant === 'fab' ? 'plus' : 'camera'}
                size={variant === 'compact' ? 16 : 20}
                color="#FFFFFF"
              />
            </Animated.View>
            <Text
              variant={variant === 'compact' ? 'caption' : 'body'}
              weight="semibold"
              style={styles.text}
            >
              Log Meal
            </Text>
          </>
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primary,
    gap: spacing.sm,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'background-color 0.15s ease-out, box-shadow 0.2s ease-out',
    }),
  },
  primary: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  fab: {
    borderRadius: 28,
    width: 56,
    height: 56,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  buttonHovered: {
    backgroundColor: BRAND_COLORS.secondary,
    ...(Platform.OS === 'web' && {
      boxShadow: `0 4px 12px ${BRAND_COLORS.primary}40`,
    }),
  },
  text: {
    color: '#FFFFFF',
  },
});

export default LogMealButton;
