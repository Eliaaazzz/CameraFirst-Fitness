import { BORDER_RADIUS, COLORS } from '@/utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'dark' | 'surface' | 'overlay';
  direction?: 'vertical' | 'horizontal' | 'diagonal';
  intensity?: 'subtle' | 'medium' | 'strong';
}

const gradientConfigs = {
  primary: {
    subtle: [COLORS.primary.main + '20', COLORS.primary.dark + '10'],
    medium: [COLORS.primary.main + '40', COLORS.primary.dark + '20'],
    strong: [COLORS.primary.main, COLORS.primary.dark],
  },
  secondary: {
    subtle: [COLORS.secondary.main + '20', COLORS.primary.main + '10'],
    medium: [COLORS.secondary.main + '40', COLORS.primary.main + '20'],
    strong: [COLORS.secondary.main, COLORS.primary.main],
  },
  dark: {
    subtle: [COLORS.dark.surface, COLORS.dark.background],
    medium: [COLORS.dark.surfaceElevated, COLORS.dark.surface],
    strong: [COLORS.dark.surfaceElevated, COLORS.dark.background],
  },
  surface: {
    subtle: ['rgba(124,58,237,0.05)', 'rgba(124,58,237,0.02)'],
    medium: ['rgba(124,58,237,0.12)', 'rgba(124,58,237,0.05)'],
    strong: ['rgba(124,58,237,0.20)', 'rgba(124,58,237,0.08)'],
  },
  overlay: {
    subtle: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'],
    medium: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'],
    strong: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'],
  },
};

const directionConfigs = {
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  variant = 'primary',
  direction = 'vertical',
  intensity = 'medium',
}) => {
  const colors = gradientConfigs[variant][intensity] as [string, string];
  const { start, end } = directionConfigs[direction];

  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

// Hero gradient for screen headers
export const HeroGradient: React.FC<{
  children?: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => (
  <LinearGradient
    colors={[COLORS.primary.main + '30', COLORS.dark.background] as [string, string]}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
    style={[styles.hero, style]}
  >
    {children}
  </LinearGradient>
);

// Card overlay gradient for images
export const CardOverlay: React.FC<{
  style?: ViewStyle;
  position?: 'bottom' | 'top' | 'full';
}> = ({ style, position = 'bottom' }) => {
  const colors: [string, string] = position === 'top'
    ? ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']
    : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'];

  return (
    <LinearGradient
      colors={colors}
      style={[
        styles.overlay,
        position === 'full' && styles.overlayFull,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: BORDER_RADIUS,
  },
  hero: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: BORDER_RADIUS,
    borderBottomRightRadius: BORDER_RADIUS,
  },
  overlayFull: {
    top: 0,
    height: '100%',
    borderRadius: BORDER_RADIUS,
  },
});
