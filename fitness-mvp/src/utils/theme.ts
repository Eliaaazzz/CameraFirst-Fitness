/**
 * Aurafitness Design System - Material 3 Purple Theme
 */

export const COLORS = {
  primary: {
    main: '#7C3AED',
    dark: '#5B21B6',
    light: '#C4A1FF',
    surfaceTint: 'rgba(124,58,237,0.12)',
  },
  secondary: {
    main: '#A855F7',
    accent: '#F97316',
  },
  neutral: {
    background: '#F5F0FF',
    surface: '#FFFFFF',
    surfaceElevated: '#1F1635',
    divider: 'rgba(0,0,0,0.08)',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6366F1',
  },
  dark: {
    background: '#0F0A1A',
    surface: '#1F1635',
    surfaceElevated: '#2D2145',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
  },
  // Convenience nested accessors
  background: {
    light: '#F5F0FF',
    dark: '#0F0A1A',
  },
  surface: {
    primary: '#1F1635',
    secondary: '#2D2145',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    tertiary: '#64748B',
  },
};

export const BRAND_COLORS = {
  primary: COLORS.primary.main,
  primaryDark: COLORS.primary.dark,
  primaryLight: COLORS.primary.light,
  secondary: COLORS.secondary.main,
  accent: COLORS.secondary.accent,
  background: COLORS.dark.background,
  surface: COLORS.dark.surface,
  surfaceElevated: COLORS.dark.surfaceElevated,
  textPrimary: COLORS.dark.textPrimary,
  textSecondary: COLORS.dark.textSecondary,
  textMuted: COLORS.neutral.textMuted,
  divider: COLORS.neutral.divider,
  success: COLORS.semantic.success,
  warning: COLORS.semantic.warning,
  error: COLORS.semantic.error,
  info: COLORS.semantic.info,
  tabInactive: '#64748B',
};

export const TYPOGRAPHY = {
  sizes: {
    display: 48,
    h1: 32,
    h2: 24,
    h3: 20,
    bodyL: 16,
    bodyM: 14,
    bodyS: 13,
    caption: 12,
    small: 11,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = 24;

export const SHAPE = {
  borderRadius: {
    none: 0,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },
};

export const ELEVATION = {
  level1: {
    shadowColor: COLORS.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  level2: {
    shadowColor: COLORS.primary.main,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 8,
  },
  level3: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.26,
    shadowRadius: 64,
    elevation: 16,
  },
};

export const ANIMATION = {
  duration: {
    instant: 80,
    fast: 150,
    normal: 250,
    slow: 350,
    pageTransition: 320,
  },
  stagger: { delay: 0.06 },
  tap: { scale: 0.97 },
  hover: { translateY: -4 },
};

export const TAB_ICON_SIZE = {
  default: 22,
  focused: 24,
};

export const LAYOUT = {
  maxWidth: 1280,
  bottomNavHeight: 60,
  headerHeight: 56,
  pagePadding: SPACING.md,
};

// Compatibility aliases for existing components
export const spacing = {
  xs: SPACING.xs,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
  xl: SPACING.xl,
  '2xl': SPACING.xxl,
  '3xl': 64,
};

export const radii = {
  sm: SHAPE.borderRadius.sm,
  md: SHAPE.borderRadius.md,
  lg: SHAPE.borderRadius.lg,
  xl: SHAPE.borderRadius.xl,
  '2xl': 32,
  full: SHAPE.borderRadius.full,
};

// Additional helper exports for existing screens
export const colors = {
  primary: COLORS.primary.main,
  primaryDark: COLORS.primary.dark,
  background: {
    light: COLORS.neutral.background,
    dark: COLORS.dark.background,
  },
  surface: {
    primary: COLORS.dark.surface,
    secondary: COLORS.dark.surfaceElevated,
  },
  text: {
    primary: COLORS.dark.textPrimary,
    secondary: COLORS.dark.textSecondary,
    tertiary: COLORS.neutral.textMuted,
  },
};

// Legacy exports for backwards compatibility
export const typography = TYPOGRAPHY;
export const getTheme = () => ({
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
});
