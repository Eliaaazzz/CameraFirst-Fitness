import { Platform } from 'react-native';

/**
 * Premium SaaS Color Palette - Linear + Stripe Inspired
 * Neutral background with purple primary accents
 */
export const colors = {
  light: {
    // Primary - Purple (kept as accent)
    primary: '#8B5CF6',           // Violet-500
    primaryDark: '#7C3AED',       // Violet-600 (pressed state)
    primaryLight: '#A78BFA',      // Violet-400
    primaryContainer: '#EDE9FE',  // Violet-100
    primaryTint: 'rgba(139, 92, 246, 0.10)', // 10% primary for hover backgrounds

    secondary: '#EC4899',         // Pink-500
    secondaryContainer: '#FCE7F3',

    // Surfaces - Neutral, premium feel (Linear/Stripe style)
    background: '#F5F6FA',        // More gray, less purple (Stripe-like)
    backgroundGradient: ['#F5F6FA', '#FAFBFC'],
    surface: '#FFFFFF',
    surfaceVariant: '#FAFBFC',    // Very light neutral

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

    // Borders - Subtle, professional
    border: '#E9E6F5',            // Slight purple tint for cohesion
    borderSubtle: '#F3F4F6',

    // Shadow color for consistency
    shadow: 'rgba(17, 24, 39, 0.08)', // Gray-900 at 8%

    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    // Primary - Purple (brighter on dark background)
    primary: '#A78BFA',           // Violet-400
    primaryDark: '#8B5CF6',       // Violet-500
    primaryLight: '#C4B5FD',      // Violet-300
    primaryContainer: '#4C1D95',  // Violet-900
    
    secondary: '#F472B6',         // Pink-400
    secondaryContainer: '#831843',
    
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
  '2xl': 20,
  pill: 24,
  full: 9999,
};

/**
 * Premium Shadows - Softer, more diffused
 * Key: Lower opacity, larger radius for that "floating" feel
 */
export const shadows = {
  light: {
    light: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      shadowOpacity: 0.04,
      elevation: 4,
    },
    medium: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      shadowOpacity: 0.06,
      elevation: 8,
    },
    heavy: {
      shadowColor: '#18181B',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      shadowOpacity: 0.08,
      elevation: 12,
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
 * SaaS-style Shadows - Stripe/Linear inspired
 * Key: Very subtle shadows + 1px border = professional "grounded" feel
 */
export const saasShadows = {
  // Standard card shadow - very subtle, relies on border for definition
  card: Platform.select({
    web: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
    } as any,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
  }),
  // Elevated card shadow - slightly more visible for emphasis
  cardElevated: Platform.select({
    web: {
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 8px 0 rgba(0, 0, 0, 0.04)',
    } as any,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
  // Subtle shadow - barely visible
  subtle: Platform.select({
    web: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
    } as any,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
};

/**
 * Premium Card Styles - Stripe/Linear inspired
 * Key: 1px border + minimal shadow = clean, grounded cards
 */
export const cardStyles = {
  // Standard card - white bg, 1px border, subtle shadow
  standard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E6F5', // Subtle purple-gray border
    borderRadius: radii.xl,
    ...saasShadows.card,
  },
  // Interactive card - with hover states for web
  interactive: Platform.select({
    web: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E9E6F5',
      borderRadius: radii.xl,
      cursor: 'pointer' as const,
      transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
      ...saasShadows.card,
    } as any,
    default: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E9E6F5',
      borderRadius: radii.xl,
      ...saasShadows.card,
    },
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
