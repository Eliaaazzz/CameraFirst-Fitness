import { Platform } from 'react-native';

export const colors = {
  light: {
    primary: '#FF6B6B',
    primaryDark: '#F04A4A',
    secondary: '#4ECDC4',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    error: '#F87171',
    success: '#34D399',
    border: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.6)',
  },
  dark: {
    primary: '#FF8787',
    primaryDark: '#FF6B6B',
    secondary: '#67E8F9',
    background: '#0D1B2A',
    surface: '#1B263B',
    textPrimary: '#E2E8F0',
    textSecondary: '#CBD5F5',
    textMuted: '#64748B',
    error: '#FB7185',
    success: '#22D3EE',
    border: 'rgba(148, 163, 184, 0.24)',
    overlay: 'rgba(2, 6, 23, 0.7)',
  },
};

export const typography = {
  fontFamily: {
    regular: Platform.select({ ios: 'System', android: 'Roboto' }),
    medium: Platform.select({ ios: 'System', android: 'Roboto-Medium' }),
    bold: Platform.select({ ios: 'System', android: 'Roboto-Bold' }),
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
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
  pill: 24,
  full: 9999,
};

export const shadows = {
  light: {
    light: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      shadowOpacity: 0.06,
      elevation: 6,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      shadowOpacity: 0.08,
      elevation: 10,
    },
    heavy: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 48,
      shadowOpacity: 0.12,
      elevation: 16,
    },
  },
  dark: {
    light: {
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 24,
      shadowOpacity: 0.4,
      elevation: 6,
    },
    medium: {
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 32,
      shadowOpacity: 0.45,
      elevation: 10,
    },
    heavy: {
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 48,
      shadowOpacity: 0.5,
      elevation: 16,
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
