import { chartColors, colors } from './theme';

export const APP_NAME = 'AuraFitness';

export const BRAND_COLORS = {
  ...colors.light,
  accent: colors.light.secondary,
  danger: colors.light.error,

  tabActive: colors.light.primaryDark,
  tabInactive: colors.light.textMuted,

  glassFill: 'rgba(255, 250, 244, 0.68)',
  glassFillStrong: 'rgba(255, 252, 248, 0.84)',
  glassFillSubtle: 'rgba(255, 250, 244, 0.52)',
  glassStroke: 'rgba(201, 106, 52, 0.08)',
  glassStrokeOuter: 'rgba(23, 21, 17, 0.06)',
  glassEdge: 'rgba(23, 21, 17, 0.04)',
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
    track: colors.light.borderSubtle,
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

