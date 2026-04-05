/**
 * Material Design 3 Motion System
 *
 * Based on Material Design 3 specifications:
 * https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
 *
 * Motion Principles:
 * 1. Informative - Highlights relationships and action outcomes
 * 2. Focused - Shows what's essential without distractions
 * 3. Expressive - Celebrates moments and adds character
 */

import { Easing } from 'react-native-reanimated';

/**
 * Material Design 3 Easing Curves
 *
 * - Emphasized: For attention-grabbing transitions (e.g., dialogs, important state changes)
 * - Standard: For most UI transitions
 * - Legacy: For compatibility with older Material Design patterns
 */
export const MaterialEasing = {
  // Emphasized Easing (Material 3 default for important transitions)
  emphasized: Easing.bezier(0.2, 0.0, 0, 1.0),
  emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),
  emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),

  // Standard Easing (for common transitions)
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  standardDecelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  standardAccelerate: Easing.bezier(0.4, 0.0, 1, 1),

  // Legacy Easing (Material 2 compatibility)
  legacy: Easing.bezier(0.4, 0.0, 0.6, 1),
  legacyDecelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  legacyAccelerate: Easing.bezier(0.4, 0.0, 1, 1),
} as const;

/**
 * Material Design 3 Duration Tokens (milliseconds)
 *
 * Guidelines:
 * - Short1/Short2/Short3/Short4: For small elements (icons, chips, buttons)
 * - Medium1/Medium2/Medium3/Medium4: For medium elements (cards, sheets)
 * - Long1/Long2/Long3/Long4: For large elements (dialogs, full-screen transitions)
 * - ExtraLong1-4: For complex transitions (shared element transitions)
 *
 * Mobile durations (wearables should be ~30% shorter)
 */
export const MaterialDuration = {
  // Short durations (50-200ms) - Small UI elements
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,

  // Medium durations (250-400ms) - Medium UI elements
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,

  // Long durations (450-600ms) - Large UI elements
  long1: 450,
  long2: 500,
  long3: 550,
  long4: 600,

  // Extra long durations (700-1000ms) - Complex transitions
  extraLong1: 700,
  extraLong2: 800,
  extraLong3: 900,
  extraLong4: 1000,
} as const;

/**
 * Common Material Animation Presets
 * Combines easing + duration for common use cases
 */
export const MaterialAnimations = {
  /**
   * Button Press/Release
   * Fast, responsive feedback for touch interactions
   */
  buttonPress: {
    duration: MaterialDuration.short1,
    easing: MaterialEasing.standardAccelerate,
  },
  buttonRelease: {
    duration: MaterialDuration.short2,
    easing: MaterialEasing.standardDecelerate,
  },

  /**
   * Icon State Change (e.g., bookmark toggle)
   * Emphasized for user feedback on important actions
   */
  iconToggle: {
    duration: MaterialDuration.short4,
    easing: MaterialEasing.emphasized,
  },

  /**
   * Card Enter/Exit
   * Smooth, natural motion for list items
   */
  cardEnter: {
    duration: MaterialDuration.medium2,
    easing: MaterialEasing.emphasizedDecelerate,
  },
  cardExit: {
    duration: MaterialDuration.medium1,
    easing: MaterialEasing.emphasizedAccelerate,
  },

  /**
   * Modal/Dialog Appearance
   * Draws attention to important content
   */
  modalEnter: {
    duration: MaterialDuration.medium4,
    easing: MaterialEasing.emphasizedDecelerate,
  },
  modalExit: {
    duration: MaterialDuration.medium2,
    easing: MaterialEasing.emphasizedAccelerate,
  },

  /**
   * Snackbar/Toast
   * Quick, unobtrusive feedback
   */
  snackbarEnter: {
    duration: MaterialDuration.medium2,
    easing: MaterialEasing.emphasizedDecelerate,
  },
  snackbarExit: {
    duration: MaterialDuration.short4,
    easing: MaterialEasing.emphasizedAccelerate,
  },

  /**
   * Loading Spinner
   * Continuous, smooth rotation
   */
  spinner: {
    duration: MaterialDuration.long2,
    easing: Easing.linear,
  },

  /**
   * Ripple Effect
   * Fast, expanding feedback
   */
  ripple: {
    duration: MaterialDuration.medium1,
    easing: MaterialEasing.standardDecelerate,
  },

  /**
   * Scroll-to-Top FAB
   * Quick, responsive action
   */
  fabAppear: {
    duration: MaterialDuration.short4,
    easing: MaterialEasing.emphasizedDecelerate,
  },
  fabDisappear: {
    duration: MaterialDuration.short3,
    easing: MaterialEasing.emphasizedAccelerate,
  },

  /**
   * Swipe-to-Delete
   * Smooth, controlled gesture
   */
  swipeReveal: {
    duration: MaterialDuration.medium1,
    easing: MaterialEasing.standard,
  },
  swipeDelete: {
    duration: MaterialDuration.medium2,
    easing: MaterialEasing.emphasizedAccelerate,
  },
} as const;

/**
 * Helper function to create spring animations with Material-like feel
 *
 * @param damping - Controls oscillation (10 = bouncy, 20 = balanced, 40 = stiff)
 * @param stiffness - Controls speed (50 = slow, 100 = medium, 200 = fast)
 */
export const createMaterialSpring = (damping = 20, stiffness = 100) => ({
  damping,
  stiffness,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
});

/**
 * Named spring presets for common interaction patterns.
 * Use these instead of ad-hoc withSpring configs for consistency.
 */
export const SpringPresets = {
  press: { damping: 15, stiffness: 300 },
  tabBounce: { damping: 12, stiffness: 150 },
  cardReveal: { damping: 18, stiffness: 100 },
  celebrate: { damping: 12, stiffness: 200 },
} as const;

/**
 * Predefined spring configurations for common Material animations
 */
export const MaterialSprings = {
  // Gentle bounce for non-critical feedback
  gentle: createMaterialSpring(15, 80),

  // Balanced spring for most UI interactions
  balanced: createMaterialSpring(20, 100),

  // Stiff spring for snappy, responsive feedback
  stiff: createMaterialSpring(40, 200),

  // Bouncy spring for playful interactions
  bouncy: createMaterialSpring(10, 100),
} as const;

/**
 * Scale animation values following Material Design principles
 */
export const MaterialScale = {
  // Pressed state (button, card)
  pressed: 0.95,

  // Emphasis (selected item, important action)
  emphasized: 1.05,

  // Strong emphasis (celebration, achievement)
  strongEmphasis: 1.1,

  // Hidden/minimized
  hidden: 0,

  // Normal state
  normal: 1,
} as const;

/**
 * Opacity values for Material transitions
 */
export const MaterialOpacity = {
  transparent: 0,
  disabled: 0.38,
  secondary: 0.6,
  primary: 0.87,
  full: 1,
} as const;

/**
 * Example Usage:
 *
 * ```tsx
 * import { withTiming, withSpring } from 'react-native-reanimated';
 * import { MaterialAnimations, MaterialSprings, MaterialScale } from '@/utils/materialMotion';
 *
 * // Icon toggle animation
 * scale.value = withSpring(
 *   isSaved ? MaterialScale.emphasized : MaterialScale.normal,
 *   MaterialSprings.bouncy
 * );
 *
 * // Button press animation
 * opacity.value = withTiming(
 *   pressed ? MaterialOpacity.secondary : MaterialOpacity.full,
 *   MaterialAnimations.buttonPress
 * );
 * ```
 */
