export const APP_NAME = 'FitnessMVP';

/**
 * Premium SaaS Theme - Linear/Stripe Inspired
 * Neutral background with purple primary accents
 */
export const BRAND_COLORS = {
  // Primary - Violet (accent color)
  primary: '#8B5CF6',        // Violet-500
  primaryDark: '#7C3AED',    // Violet-600 (pressed)
  primaryTint: 'rgba(139, 92, 246, 0.10)', // 10% for hover states

  // Secondary - Pink
  secondary: '#EC4899',      // Pink-500

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
  tabActive: '#8B5CF6',
  tabInactive: '#374151',     // Deeper gray for readability
};

export const TAB_ICON_SIZE = {
  focused: 26,
  default: 22,
};
