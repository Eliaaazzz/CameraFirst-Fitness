export const APP_NAME = 'FitnessMVP';

/**
 * Premium SaaS Theme - Linear/Stripe Inspired
 * Neutral background with purple primary accents
 */
export const BRAND_COLORS = {
  // Primary - Orange (Vibrant, Fitness-focused)
  primary: '#F97316',        // Orange-500
  primaryDark: '#EA580C',    // Orange-600 (pressed)
  primaryTint: 'rgba(249, 115, 22, 0.10)', // 10% for hover states

  // Secondary - Cyan (Vibrant, Energetic)
  secondary: '#06B6D4',      // Cyan-500

  // Surfaces - Neutral, Stripe-like
  background: '#F5F6FA',     // More gray, less purple
  surface: '#FFFFFF',
  surfaceVariant: '#FAFBFC',

  // Text - Strong hierarchy (depth via weight/size, not gray fade)
  textPrimary: '#111827',     // Gray-900 (titles, headings)
  textSecondary: '#1F2937',   // Gray-800 (nav, descriptions) - deep, readable
  textMuted: '#374151',       // Gray-700 (hints, dates) - still clear
  textDisabled: '#9CA3AF',    // Gray-400 (disabled states only)

  // Borders
  border: '#E9E6F5',          // Subtle purple tint

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Tab bar
  tabActive: '#F97316',       // Orange
  tabInactive: '#374151',     // Deeper gray for readability

  // Macro Colors - Consistent across the app for distinctness
  macros: {
    calories: '#F97316', // Orange (Brand Primary)
    protein: '#6366D8',  // Indigo (protein)
    carbs: '#4DAA72',    // Soft green (carbs)
    fat: '#E9A23B',      // Warm amber (fat)
    sugar: '#EC4899',    // Pink
  },
};

export const TAB_ICON_SIZE = {
  focused: 26,
  default: 22,
};

// "Graceful Degradation" scale hint for meal photos.
// If the device can't provide real-world scale (e.g., depth/LiDAR),
// we assume the captured frame roughly covers a standard dinner plate.
export const DEFAULT_MEAL_IMAGE_WIDTH_CM = 35;
