/**
 * WelcomeTourCard Component
 * Dismissable welcome card that appears on Dashboard for new users
 * Provides "Take a Tour" and "Skip" options
 * Features smooth collapse animation that reflows content below
 */

import { Camera, PlayCircle, X } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { Card, Text } from '@/components';
import { BRAND_COLORS, saasShadows, spacing } from '@/utils';

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
        {/* Bento Layout Container */}
        <View style={styles.bentoContainer}>
          {/* Left Column: Content & Actions */}
          <View style={styles.contentColumn}>
            <View style={styles.textContainer}>
              <Text variant="heading3" weight="bold" style={styles.title}>
                Welcome to AuraFitness!
              </Text>
              <Text variant="body" style={styles.subtitle} numberOfLines={3}>
                Track meals with our AI camera, discover workouts, and hit your goals.
              </Text>
            </View>

            {/* Compact Action Buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.tourButtonCompact,
                  pressed && styles.tourButtonPressed,
                ]}
                onPress={handleStartTour}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#FFFFFF']} // White background for outline style
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tourButtonGradientCompact}
                >
                  <PlayCircle size={16} color="#111827" />
                  <Text variant="caption" weight="bold" style={styles.tourButtonTextCompact}>
                    Take Tour
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [
                  styles.skipButtonCompact,
                  pressed && styles.skipButtonPressed,
                ]}
                hitSlop={12}
              >
                <Text variant="caption" weight="semibold" style={styles.skipButtonTextCompact}>
                  Skip
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Right Column: Visual (Camera Icon) */}
          <View style={styles.visualColumn}>
            <Animated.View style={[styles.cameraBentoBox, waveIconStyle]}>
              <LinearGradient
                colors={['rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.2)']} // Light orange tints
                style={styles.cameraIconBackground}
              >
                <Camera size={36} color={BRAND_COLORS.primary} />
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* Absolute Close Button */}
        <Pressable 
          onPress={handleSkip} 
          style={styles.absoluteCloseButton} 
          hitSlop={12}
        >
          <X size={18} color={BRAND_COLORS.textSecondary} />
        </Pressable>
      </AnimatedCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Golden Standard
    // Golden Standard Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } : {}),
    overflow: 'hidden',
  },
  bentoContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 130,
  },
  contentColumn: {
    flex: 1,
    padding: spacing.lg,
    paddingRight: spacing.sm,
    justifyContent: 'center',
    gap: spacing.md,
  },
  textContainer: {
    gap: 4,
  },
  visualColumn: {
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA', // Subtle contrast
  },
  cameraBentoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...saasShadows.card,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
  },
  cameraIconBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteCloseButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: 4,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  header: {
    // Legacy style, removed
  },
  iconContainer: {
     // Legacy style, removed
  },
  closeButton: {
     // Legacy style, removed
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 17,
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
     // Legacy style, removed
  },
  // Compact Button Styles
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tourButtonCompact: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Gray-200 border
  },
  tourButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
    backgroundColor: '#F9FAFB', // Slight highlight on press
  },
  tourButtonGradientCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7, // Reduced by 1px to account for border
    paddingHorizontal: 13,
    gap: 6,
  },
  tourButtonTextCompact: {
    color: '#111827', // Dark text
    fontSize: 13,
  },
  skipButtonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipButtonTextCompact: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 13,
  },
  // Keep legacy styles just in case to avoid crash if referenced elsewhere (unlikely)
  tourButton: {},
  tourButtonGradient: {},
  tourButtonText: {},
  skipButton: {},
  skipButtonText: {},
});

export default WelcomeTourCard;
