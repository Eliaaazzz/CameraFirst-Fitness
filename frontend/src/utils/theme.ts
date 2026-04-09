import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

const lightColors = {
  primary: '#C96A34',
  primaryDark: '#A7552A',
  primaryLight: '#E6B799',
  primaryContainer: '#F1ECE4',
  primaryTint: 'rgba(201, 106, 52, 0.10)',

  secondary: '#2F7A6A',
  secondaryContainer: '#E4F0EB',

  background: '#F8F7F3',
  backgroundGradient: ['#F8F7F3', '#F8F7F3', '#F8F7F3'],
  surface: '#F4F2ED',
  surfaceElevated: '#FFFFFF',
  surfaceVariant: '#F6F4EF',
  surfaceMuted: '#EEEAE3',

  textPrimary: '#111111',
  textSecondary: '#3E3C38',
  textMuted: '#6D6860',
  textWarm: '#6D6258',
  textDisabled: '#999387',

  error: '#D05C41',
  success: '#2F855A',
  warning: '#B88428',
  info: '#4A6FA5',

  border: 'rgba(17,17,17,0.08)',
  borderStrong: 'rgba(17,17,17,0.14)',
  borderSubtle: 'rgba(17,17,17,0.05)',
  borderHover: 'rgba(17,17,17,0.18)',

  shadow: 'rgba(17, 17, 17, 0.07)',
  overlay: 'rgba(15, 13, 10, 0.42)',
};

const darkColors = {
  primary: '#E2A479',
  primaryDark: '#C68457',
  primaryLight: '#F3C6A7',
  primaryContainer: '#3A2618',
  primaryTint: 'rgba(226, 164, 121, 0.12)',

  secondary: '#78B6A5',
  secondaryContainer: '#183A33',

  background: '#12100E',
  backgroundGradient: ['#12100E', '#181614', '#1F1C19'],
  surface: '#1B1815',
  surfaceElevated: '#221E1B',
  surfaceVariant: '#2B2521',
  surfaceMuted: '#312A25',

  textPrimary: '#F7F2EC',
  textSecondary: '#D2C8BD',
  textMuted: '#A79C8E',
  textWarm: '#D6B18E',
  textDisabled: '#7E756A',

  error: '#F28D72',
  success: '#69C08C',
  warning: '#D5AC5D',
  info: '#86A7D5',

  border: 'rgba(255, 248, 239, 0.12)',
  borderStrong: 'rgba(255, 248, 239, 0.18)',
  borderSubtle: 'rgba(255, 248, 239, 0.08)',
  borderHover: 'rgba(255, 248, 239, 0.22)',

  shadow: 'rgba(0, 0, 0, 0.32)',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

export const colors = {
  light: lightColors,
  dark: darkColors,
};

export const typography = {
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }),
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 42,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    '2xl': 32,
    '3xl': 40,
    '4xl': 50,
  },
  letterSpacing: {
    tight: -0.7,
    medium: -0.35,
    normal: 0,
    wide: 0.25,
    caps: 1.2,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 999,
  full: 9999,
};

export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
};

/** Reusable spring animation presets — use these instead of inline damping/stiffness. */
export const springPresets = {
  /** Snappy tab/button bounce */
  tabBounce: { damping: 12, stiffness: 150 },
  /** Gentle content appearance */
  gentle: { damping: 20, stiffness: 120 },
  /** Quick micro-interaction */
  quick: { damping: 18, stiffness: 200 },
  /** Slow, luxurious entrance */
  slow: { damping: 24, stiffness: 90 },
} as const;

export const shadows = {
  light: {
    light: {
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      shadowOpacity: 0.04,
      elevation: 1,
    },
    medium: {
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 18,
      shadowOpacity: 0.06,
      elevation: 4,
    },
    heavy: {
      shadowColor: '#111111',
      shadowOffset: { width: 0, height: 14 },
      shadowRadius: 28,
      shadowOpacity: 0.08,
      elevation: 8,
    },
    glass: {
      shadowColor: '#171511',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 30,
      shadowOpacity: 0.09,
      elevation: 6,
    },
    glow: {
      shadowColor: '#C96A34',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 28,
      shadowOpacity: 0.16,
      elevation: 0,
    },
  },
  dark: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.22,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 24,
      shadowOpacity: 0.28,
      elevation: 6,
    },
    heavy: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 18 },
      shadowRadius: 34,
      shadowOpacity: 0.34,
      elevation: 10,
    },
    glass: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 28,
      shadowOpacity: 0.3,
      elevation: 8,
    },
    glow: {
      shadowColor: '#E2A479',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 38,
      shadowOpacity: 0.18,
      elevation: 0,
    },
  },
};

export const chartColors = [
  '#C96A34',
  '#2F7A6A',
  '#8A9B4F',
  '#B88428',
  '#8F5E7C',
];

export const glass = {
  shell: 'rgba(250, 249, 246, 0.8)',
  shellStrong: 'rgba(255, 255, 255, 0.9)',
  shellSubtle: 'rgba(248, 247, 244, 0.7)',
  stroke: 'rgba(17, 17, 17, 0.06)',
  edge: 'rgba(17, 17, 17, 0.05)',
};

export const getTheme = (mode: ThemeMode) => ({
  colors: colors[mode],
  typography,
  spacing,
  radii,
  motion,
  shadows: shadows[mode],
  chartColors,
  glass,
});

export const saasShadows = {
  subtle: Platform.select({
    web: {
      boxShadow: '0 3px 10px rgba(23, 21, 17, 0.04)',
    } as any,
    default: {
      shadowColor: '#171511',
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      shadowOpacity: 0.04,
      elevation: 1,
    },
  }),
  card: Platform.select({
    web: {
      boxShadow: '0 14px 34px rgba(23, 21, 17, 0.06)',
    } as any,
    default: {
      shadowColor: '#171511',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 22,
      shadowOpacity: 0.07,
      elevation: 4,
    },
  }),
  cardElevated: Platform.select({
    web: {
      boxShadow: '0 22px 42px rgba(23, 21, 17, 0.08)',
    } as any,
    default: {
      shadowColor: '#171511',
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 30,
      shadowOpacity: 0.09,
      elevation: 8,
    },
  }),
};

/**
 * Mobile-safe layout helpers — apply to any element containing text or flexible content.
 * Prevents overflow on narrow containers.
 */
export const MOBILE_SAFE_TEXT = {
  minWidth: 0,
  flexShrink: 1,
} as const;

/** Apply to any horizontal row that must wrap gracefully on mobile */
export const MOBILE_SAFE_ROW = {
  minWidth: 0,
  flexShrink: 1,
  flexWrap: 'wrap' as const,
} as const;

export const cardStyles = {
  rest: {
    boxShadow: '0 12px 24px rgba(23, 21, 17, 0.05)',
    borderColor: colors.light.borderSubtle,
  },
  hover: {
    boxShadow: '0 18px 32px rgba(23, 21, 17, 0.08)',
    borderColor: colors.light.border,
  },
};
