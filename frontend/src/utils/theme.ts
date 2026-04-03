import { Platform } from 'react-native';

/**
 * App theme tokens.
 * Light mode is tuned for a soft "liquid glass" visual language.
 */
export const colors = {
  light: {
    // Primary - Orange (Vibrant, Fitness-focused)
    primary: '#F97316',           // Orange-500
    primaryDark: '#EA580C',       // Orange-600 (pressed state, text)
    primaryLight: '#FDBA74',      // Orange-300
    primaryContainer: '#FFF7ED',  // Orange-50
    primaryTint: 'rgba(249, 115, 22, 0.10)', // 10% primary for hover backgrounds

    secondary: '#06B6D4',         // Cyan-500
    secondaryContainer: '#CFFAFE',

    // Surfaces - warm-neutral white
    background: '#FFFFFF',
    backgroundGradient: ['#FFFFFF', '#FFF9F2', '#F8FCFF'],
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',

    // Text - Strong hierarchy, readable on neutral background
    // Using deeper grays for clarity - hierarchy via weight/size, not fading
    textPrimary: '#111827',       // Gray-900 (titles, headings)
    textSecondary: '#1F2937',     // Gray-800 (nav, descriptions) - deep, not faded
    textMuted: '#374151',         // Gray-700 (hints, dates) - still readable
    textDisabled: '#9CA3AF',      // Gray-400 (disabled states only)

    // States - Playful accents only for streak/actions
    error: '#EF4444',             // danger
    success: '#10B981',           // protein color
    warning: '#F59E0B',           // streak/carbs color
    info: '#3B82F6',

    // Borders - clean neutral
    border: '#E6ECF2',
    borderSubtle: '#EEF3F8',

    // Shadow color for consistency
    shadow: 'rgba(15, 23, 42, 0.06)',

    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    // Primary - Purple (brighter on dark background)
    primary: '#A78BFA',           // Violet-400
    primaryDark: '#8B5CF6',       // Violet-500
    primaryLight: '#C4B5FD',      // Violet-300
    primaryContainer: '#4C1D95',  // Violet-900
    
    secondary: '#22D3EE',         // Cyan-400
    secondaryContainer: '#164E63', // Cyan-900
    
    // Surfaces - Material Dark
    background: '#1A1A1A',        // Dark Gray (Not pure black)
    surface: '#252525',           // Elevated surface
    surfaceVariant: '#333333',    // Higher elevation
    
    // Text
    textPrimary: '#F9FAFB',       // Gray-50
    textSecondary: '#D1D5DB',     // Gray-300
    textMuted: '#9CA3AF',         // Gray-400
    
    // States
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
    
    // Borders - subtle
    border: 'rgba(255, 255, 255, 0.12)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

export const typography = {
  fontFamily: {
    // System fonts with better fallbacks
    regular: Platform.select({ ios: 'System', android: 'Roboto', default: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }),
    bold: Platform.select({ ios: 'System', android: 'Roboto-Bold', default: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }),
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },
  // Letter spacing for premium feel
  letterSpacing: {
    tight: -0.5,    // For headlines - compact, powerful
    normal: 0,
    wide: 0.5,      // For labels - elegant
    widest: 1.5,    // For small caps - luxurious
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 22,
  pill: 24,
  full: 9999,
};

/**
 * Liquid Glass Shadows
 * Deeper offsets & wider radii create the "floating above content" feel
 * central to Apple's Liquid Glass language.
 */
export const shadows = {
  light: {
    light: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 10,
      shadowOpacity: 0.04,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 18,
      shadowOpacity: 0.06,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 28,
      shadowOpacity: 0.08,
      elevation: 8,
    },
    // Liquid glass floating shadow for elevated controls (tab bar, FAB)
    glass: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      shadowOpacity: 0.12,
      elevation: 10,
    },
    // Premium glow effect for cards
    glow: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 40,
      shadowOpacity: 0.15,
      elevation: 0,
    },
  },
  dark: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      shadowOpacity: 0.3,
      elevation: 4,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      shadowOpacity: 0.4,
      elevation: 8,
    },
    heavy: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      shadowOpacity: 0.5,
      elevation: 12,
    },
    // Premium glow effect for dark mode
    glow: {
      shadowColor: '#34D399',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 60,
      shadowOpacity: 0.2,
      elevation: 0,
    },
  },
};

export const getTheme = (mode: 'light' | 'dark') => ({
  colors: colors[mode],
  typography,
  spacing,
  radii,
  shadows: shadows[mode],
});

/**
 * Liquid Glass Shadows
 * Floating glass elements need soft, diffused shadows to feel elevated.
 */
export const saasShadows = {
  // Standard card shadow - soft floating
  card: Platform.select({
    web: {
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
    } as any,
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      shadowOpacity: 0.05,
      elevation: 3,
    },
  }),
  // Elevated card shadow - more prominent float
  cardElevated: Platform.select({
    web: {
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    } as any,
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      shadowOpacity: 0.08,
      elevation: 6,
    },
  }),
  // Subtle shadow - barely there
  subtle: Platform.select({
    web: {
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
    } as any,
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      shadowOpacity: 0.03,
      elevation: 1,
    },
  }),
};

/**
 * Liquid Glass Card Styles
 * Semi-transparent backgrounds with soft borders create the glass layer effect.
 * Content shows through subtly, reinforcing depth & elevation.
 */
export const cardStyles = {
  // Standard card - translucent glass surface
  standard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: radii['2xl'],
    ...saasShadows.card,
  },
  // Interactive card - glass with hover feedback
  interactive: Platform.select({
    web: {
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      borderRadius: radii['2xl'],
      cursor: 'pointer' as const,
      transition: 'border-color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.2s ease-out',
      ...saasShadows.card,
    } as any,
    default: {
      backgroundColor: 'rgba(255,255,255,0.78)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      borderRadius: radii['2xl'],
      ...saasShadows.card,
    },
  }),
  // Hover state for interactive glass cards (web only)
  hover: Platform.select({
    web: {
      boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.08), 0 0 0 1px rgba(249,115,22,0.08)',
      transform: 'scale(1.02)',
      borderColor: 'rgba(249,115,22,0.15)',
    } as any,
    default: {},
  }),
  // Default resting state shadow for content cards (web only)
  rest: Platform.select({
    web: {
      boxShadow: '0 2px 8px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    } as any,
    default: {},
  }),
};

/**
 * Premium Animation Timing
 * Smooth, not snappy - feels more luxurious
 */
export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,
  },
  easing: {
    // Bezier curves for smooth animations
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
