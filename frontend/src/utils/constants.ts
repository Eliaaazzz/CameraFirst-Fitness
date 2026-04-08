import { chartColors, colors } from './theme';

export const APP_NAME = 'Metriful';

export const BRAND_COLORS = {
  ...colors.light,
  accent: colors.light.secondary,
  danger: colors.light.error,

  tabActive: colors.light.primaryDark,
  tabInactive: colors.light.textMuted,

  glassFill: 'rgba(250, 249, 246, 0.76)',
  glassFillStrong: 'rgba(255, 255, 255, 0.9)',
  glassFillSubtle: 'rgba(248, 247, 244, 0.64)',
  glassStroke: 'rgba(17, 17, 17, 0.06)',
  glassStrokeOuter: 'rgba(17, 17, 17, 0.08)',
  glassEdge: 'rgba(17, 17, 17, 0.04)',
  glassSpecular: 'rgba(255,255,255,0.72)',
  glassSpecularFade: 'rgba(255,255,255,0)',

  charts: chartColors,
  macros: {
    calories: '#C96A34',
    protein: '#2F7A6A',
    carbs: '#8A9B4F',
    fat: '#B88428',
    sugar: '#8F5E7C',
  },

  semantic: {
    success: colors.light.success,
    successTint: 'rgba(47,133,90,0.12)',
    warning: colors.light.warning,
    warningTint: 'rgba(184,132,40,0.12)',
    error: colors.light.error,
    errorTint: 'rgba(208,92,65,0.12)',
    info: colors.light.info,
    infoTint: 'rgba(74,111,165,0.12)',
  },
  rings: {
    protein: colors.light.secondary,
    fat: colors.light.primary,
    carbs: '#8A9B4F',
    track: 'rgba(249,115,22,0.10)',
    bloodSugar: colors.light.error,
  },
  streak: {
    gray: colors.light.textMuted,
    orange: colors.light.primary,
    gold: colors.light.warning,
    red: colors.light.error,
  },
};

export const TAB_ICON_SIZE = {
  focused: 24,
  default: 22,
};

export const DEFAULT_MEAL_IMAGE_WIDTH_CM = 35;

/**
 * Landing page design system — intentionally separate from the app's warm
 * glass-morphism palette.  The landing page follows an Uber-style black/white
 * editorial aesthetic.  Every value is an explicit design decision; changing one
 * of these tokens updates every landing component at once.
 */
export const LANDING_COLORS = {
  /* ── text ────────────────────────────────────────────── */
  text: '#111111',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.82)',
  textOnDarkSubtle: 'rgba(255,255,255,0.76)',
  textOnDarkFaint: 'rgba(255,255,255,0.58)',
  textOnDarkLegal: 'rgba(255,255,255,0.56)',
  textOnAccent: '#2D2D2B',
  fieldLabel: 'rgba(17,17,17,0.62)',

  /* ── backgrounds & surfaces ─────────────────────────── */
  bg: '#FFFFFF',
  surface: '#F2F1ED',
  surfaceChip: '#F4F3EF',
  navBg: '#000000',
  footerBg: '#000000',

  /* ── CTA / buttons ──────────────────────────────────── */
  ctaBg: '#000000',
  ctaText: '#FFFFFF',
  pillBg: '#FFFFFF',
  pillText: '#111111',

  /* ── borders ────────────────────────────────────────── */
  border: 'rgba(17,17,17,0.06)',
  borderField: 'rgba(17,17,17,0.08)',
  borderLink: 'rgba(17,17,17,0.18)',
  borderFooter: 'rgba(255,255,255,0.12)',
  borderStoreBadge: 'rgba(255,255,255,0.18)',

  /* ── accent cards ───────────────────────────────────── */
  accent: {
    teal: '#FDEBD0',
    warm: '#C98A78',
  },

  /* ── stars ───────────────────────────────────────────── */
  star: '#F59E0B',
} as const;

/**
 * Shared bright-experience palette used for the refreshed mobile landing,
 * auth, and dashboard surfaces. It keeps the product feeling energetic and
 * premium without rewriting the whole app theme.
 */
export const EXPERIENCE_COLORS = {
  ink: '#0F1C36',
  inkSoft: '#36507C',
  sky: '#E8F7FF',
  skyStrong: '#D7F0FF',
  cloud: '#F9FDFF',
  mint: '#DAF9D2',
  lime: '#D4FF72',
  coral: '#FF844B',
  coralStrong: '#FF6A3D',
  pink: '#FF5E8A',
  violet: '#7A7CFF',
  teal: '#2BBFCF',
  gold: '#FFC247',
  navy: '#091A38',
  glass: 'rgba(255,255,255,0.72)',
  glassStrong: 'rgba(255,255,255,0.90)',
  glassSoft: 'rgba(255,255,255,0.56)',
  stroke: 'rgba(15,28,54,0.08)',
  strokeStrong: 'rgba(15,28,54,0.14)',
  shadow: 'rgba(26,60,109,0.16)',
  shadowSoft: 'rgba(26,60,109,0.08)',
  glow: 'rgba(255,132,75,0.28)',
  gradientTop: '#F8FDFF',
  gradientMid: '#EDF7FF',
  gradientBottom: '#FFF5EB',
} as const;
