import { colors, radii, spacing } from '@/utils';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, useState } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

type GlowColor = 'emerald' | 'indigo' | 'amber' | 'rose' | 'none';

interface PremiumCardProps extends PropsWithChildren {
  style?: ViewStyle;
  onPress?: () => void;
  glowColor?: GlowColor;
  /** Show glow on hover/press only */
  glowOnHover?: boolean;
  /** Enable subtle gradient border */
  gradientBorder?: boolean;
}

const GLOW_COLORS: Record<GlowColor, string> = {
  emerald: 'rgba(52, 211, 153, 0.12)',
  indigo: 'rgba(129, 140, 248, 0.12)',
  amber: 'rgba(251, 191, 36, 0.12)',
  rose: 'rgba(251, 113, 133, 0.12)',
  none: 'transparent',
};

/**
 * PremiumCard - Linear/Vercel style card component
 * 
 * Features:
 * - Ultra-thin borders (1px, white/5 → white/10 on hover)
 * - Subtle background gradient
 * - Diffused glow effect on interaction
 * - Smooth transitions
 */
export const PremiumCard = ({
  children,
  style,
  onPress,
  glowColor = 'emerald',
  glowOnHover = true,
  gradientBorder = true,
}: PremiumCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const darkColors = colors.dark;
  const showGlow = glowOnHover ? (isHovered || isPressed) : true;

  const cardContent = (
    <View style={styles.innerContainer}>
      {/* Gradient border overlay - subtle, elegant */}
      {gradientBorder && (
        <LinearGradient
          colors={[
            isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        />
      )}

      {/* Main content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Glow effect - only visible on hover/press */}
      {showGlow && glowColor !== 'none' && (
        <View style={styles.glowContainer} pointerEvents="none">
          <View
            style={[
              styles.glowOrb,
              { backgroundColor: GLOW_COLORS[glowColor] },
            ]}
          />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: pressed
              ? 'rgba(39, 39, 42, 0.8)' // zinc-800/80
              : isHovered
              ? 'rgba(39, 39, 42, 0.5)' // zinc-800/50
              : 'rgba(24, 24, 27, 0.3)', // zinc-900/30
            borderColor: pressed || isHovered
              ? darkColors.borderHover
              : darkColors.border,
          },
          style,
        ]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(24, 24, 27, 0.3)',
          borderColor: darkColors.border,
        },
        style,
      ]}
    >
      {cardContent}
    </View>
  );
};

/**
 * PremiumCardLight - For light mode
 */
export const PremiumCardLight = ({
  children,
  style,
  onPress,
}: PremiumCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const lightColors = colors.light;

  const content = (
    <View style={styles.content}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        style={[
          styles.containerLight,
          {
            backgroundColor: isHovered ? lightColors.surfaceElevated : lightColors.surface,
            borderColor: isHovered ? lightColors.border : lightColors.borderSubtle,
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.containerLight,
        {
          backgroundColor: lightColors.surface,
          borderColor: lightColors.borderSubtle,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    // Smooth transitions (web only)
    ...(Platform.OS === 'web' && {
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
  },
  containerLight: {
    borderRadius: radii['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
    }),
  },
  innerContainer: {
    position: 'relative',
  },
  gradientBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii['2xl'],
    opacity: 1,
  },
  content: {
    padding: spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: radii['2xl'],
  },
  glowOrb: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 200,
    height: 200,
    borderRadius: 100,
    transform: [{ translateX: -100 }, { translateY: -100 }],
    // Blur effect (web only, on native we rely on opacity)
    ...(Platform.OS === 'web' && {
      filter: 'blur(60px)',
    }),
    opacity: Platform.OS === 'web' ? 1 : 0.6,
  },
});
