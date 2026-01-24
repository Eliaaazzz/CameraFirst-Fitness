/**
 * WelcomeTourCard Component
 * Dismissable welcome card that appears on Dashboard for new users
 * Provides "Take a Tour" and "Skip" options
 * Features smooth collapse animation that reflows content below
 */

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

import { Card, Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

// Animated Card component
const AnimatedCard = Animated.createAnimatedComponent(Card);

// Animation durations (ms)
const COLLAPSE_DURATION = 200;
const FADE_DURATION = 120;

interface WelcomeTourCardProps {
  onStartTour: () => void;
  onSkip: () => void;
}

export const WelcomeTourCard: React.FC<WelcomeTourCardProps> = ({
  onStartTour,
  onSkip,
}) => {
  // Animation values - 1 = visible, 0 = collapsed
  const animationProgress = useSharedValue(0);
  const heightProgress = useSharedValue(0);
  const [isExiting, setIsExiting] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  // Entrance animation on mount
  useEffect(() => {
    // Animate in
    animationProgress.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
    heightProgress.value = withTiming(1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  // Animated styles for the card - handles opacity and scale
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animationProgress.value, [0, 1], [0.95, 1]);
    return {
      opacity: animationProgress.value,
      transform: [{ scale }],
    };
  });

  // Animated styles for the container - handles height collapse
  const containerAnimatedStyle = useAnimatedStyle(() => {
    // When measured, animate height. Otherwise use auto via opacity
    if (measuredHeight > 0) {
      const height = interpolate(heightProgress.value, [0, 1], [0, measuredHeight]);
      const marginBottom = interpolate(heightProgress.value, [0, 1], [0, spacing.lg]);
      return {
        height,
        marginBottom,
        overflow: 'hidden' as const,
      };
    }
    return {
      marginBottom: spacing.lg,
    };
  });

  // Wave icon bounce animation
  const waveIconStyle = useAnimatedStyle(() => {
    const rotate = interpolate(animationProgress.value, [0, 0.5, 1], [0, 15, 0]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  // Callback after collapse animation completes
  const onCollapseComplete = useCallback((callback: () => void) => {
    callback();
  }, []);

  // Handle exit animation with height collapse
  const handleDismiss = useCallback((callback: () => void) => {
    if (isExiting) return;
    setIsExiting(true);

    // First fade out content quickly
    animationProgress.value = withTiming(0, {
      duration: FADE_DURATION,
      easing: Easing.out(Easing.quad),
    });

    // Then collapse height
    heightProgress.value = withTiming(0, {
      duration: COLLAPSE_DURATION,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    }, () => {
      runOnJS(onCollapseComplete)(callback);
    });
  }, [isExiting, onCollapseComplete]);

  const handleSkip = useCallback(() => {
    handleDismiss(onSkip);
  }, [handleDismiss, onSkip]);

  const handleStartTour = useCallback(() => {
    handleDismiss(onStartTour);
  }, [handleDismiss, onStartTour]);

  // Measure card height for collapse animation
  const handleLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    if (measuredHeight === 0 && event.nativeEvent.layout.height > 0) {
      setMeasuredHeight(event.nativeEvent.layout.height + spacing.lg); // Include margin
    }
  }, [measuredHeight]);

  return (
    <Animated.View style={containerAnimatedStyle}>
      <AnimatedCard
        style={[styles.container, cardAnimatedStyle]}
        onLayout={handleLayout}
      >
        {/* Header with icon */}
        <View style={styles.header}>
          <Animated.View style={[styles.iconContainer, waveIconStyle]}>
            <MaterialCommunityIcons
              name="hand-wave"
              size={28}
              color={BRAND_COLORS.primary}
            />
          </Animated.View>
          <Pressable onPress={handleSkip} style={styles.closeButton} hitSlop={8}>
            <Feather name="x" size={20} color={BRAND_COLORS.textSecondary} />
          </Pressable>
        </View>

        {/* Welcome text */}
        <Text variant="heading3" weight="bold" style={styles.title}>
          Welcome to AuraFitness!
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Take a quick tour to learn how to track your meals, discover workouts, and reach your fitness goals.
        </Text>

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.tourButton,
              pressed && styles.tourButtonPressed,
            ]}
            onPress={handleStartTour}
          >
            <LinearGradient
              colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tourButtonGradient}
            >
              <MaterialCommunityIcons name="compass" size={20} color="#FFF" />
              <Text variant="body" weight="semibold" style={styles.tourButtonText}>
                Take a Tour
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
          >
            <Text variant="body" style={styles.skipButtonText}>
              Skip for now
            </Text>
          </Pressable>
        </View>
      </AnimatedCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    // marginBottom handled by container animated style
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.6)',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${BRAND_COLORS.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    gap: spacing.sm,
  },
  tourButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tourButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  tourButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tourButtonText: {
    color: '#FFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipButtonText: {
    color: BRAND_COLORS.textSecondary,
  },
});

export default WelcomeTourCard;
