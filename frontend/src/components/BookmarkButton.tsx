/**
 * BookmarkButton - Material Design 3 Animated Bookmark Button
 *
 * Features:
 * - Material Motion animations (emphasized easing)
 * - Haptic feedback on save/remove
 * - Loading state with spinner
 * - Accessibility support
 * - Platform-aware styling
 */

import {
    MaterialAnimations,
    MaterialOpacity,
    MaterialScale,
    MaterialSprings,
    radii,
    spacing,
} from '@/utils';
import { BookmarkSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

type Props = {
  isSaved: boolean;
  isLoading: boolean;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BookmarkButton = ({
  isSaved,
  isLoading,
  onPress,
  color = '#EC4899',
  size = 24,
  accessibilityLabel,
  style,
}: Props) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Celebrate animation when bookmark is saved
  useEffect(() => {
    if (isSaved) {
      // Haptic feedback for success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        // Silently fail if haptics not available
      });

      // Celebration animation: bounce + slight rotation
      scale.value = withSequence(
        withSpring(MaterialScale.strongEmphasis, MaterialSprings.bouncy),
        withSpring(MaterialScale.normal, MaterialSprings.balanced)
      );

      rotation.value = withSequence(
        withTiming(5, MaterialAnimations.iconToggle),
        withTiming(-5, MaterialAnimations.iconToggle),
        withTiming(0, MaterialAnimations.iconToggle)
      );
    } else {
      // Reset animation when unsaved
      scale.value = withSpring(MaterialScale.normal, MaterialSprings.stiff);
      rotation.value = withTiming(0, MaterialAnimations.iconToggle);
    }
  }, [isSaved, scale, rotation]);

  // Press feedback animations
  const handlePressIn = () => {
    if (!isLoading) {
      scale.value = withTiming(MaterialScale.pressed, MaterialAnimations.buttonPress);
      opacity.value = withTiming(MaterialOpacity.secondary, MaterialAnimations.buttonPress);

      // Light haptic feedback on press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePressOut = () => {
    if (!isLoading) {
      scale.value = withSpring(
        isSaved ? MaterialScale.emphasized : MaterialScale.normal,
        MaterialSprings.balanced
      );
      opacity.value = withTiming(MaterialOpacity.full, MaterialAnimations.buttonRelease);
    }
  };

  const handlePress = () => {
    if (!isLoading) {
      onPress();
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  // Always use purple color - filled when saved, outline when not
  const iconColor = color;
  const styles = getStyles();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        (isLoading ? 'Saving...' : isSaved ? 'Remove bookmark' : 'Add bookmark')
      }
      accessibilityState={{ disabled: isLoading, checked: isSaved }}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isLoading}
      style={[styles.container, style, animatedStyle]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <BookmarkSimple
          size={size}
          color={iconColor}
          weight={isSaved ? 'fill' : 'regular'}
        />
      )}
    </AnimatedPressable>
  );
};

// Use getter function to avoid module initialization order issues
const getStyles = () => StyleSheet.create({
  container: {
    padding: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
});
