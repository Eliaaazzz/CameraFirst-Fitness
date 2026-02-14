export const APP_NAME = 'FitnessMVP';

/**
 * Brand + UI tokens
 * Light, warm-neutral palette with liquid-glass friendly surfaces.
 */
export const BRAND_COLORS = {
  // Primary - Orange (Vibrant, Fitness-focused)
  primary: '#F97316',        // Orange-500
  primaryDark: '#EA580C',    // Orange-600 (pressed)
  primaryTint: 'rgba(249, 115, 22, 0.10)', // 10% for hover states

  // Secondary - Cyan (Vibrant, Energetic)
  secondary: '#06B6D4',      // Cyan-500

  // Surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F8FAFC',

  // Text - Strong hierarchy (depth via weight/size, not gray fade)
  textPrimary: '#111827',     // Gray-900 (titles, headings)
  textSecondary: '#1F2937',   // Gray-800 (nav, descriptions) - deep, readable
  textMuted: '#374151',       // Gray-700 (hints, dates) - still clear
  textDisabled: '#9CA3AF',    // Gray-400 (disabled states only)

  // Borders
  border: '#E5E7EB',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Tab bar
  tabActive: '#F97316',       // Orange
  tabInactive: '#64748B',     // Slate-500

  // Liquid Glass material system
  // Inspired by Apple's iOS 26 Liquid Glass – translucent layers that
  // refract ambient color from underlying content.
  glassFill: 'rgba(255,255,255,0.52)',         // Primary glass surface
  glassFillStrong: 'rgba(255,255,255,0.72)',    // Elevated glass (tab bar, sheets)
  glassFillSubtle: 'rgba(255,255,255,0.38)',    // Recessed glass (badges, pills)
  glassStroke: 'rgba(255,255,255,0.48)',        // Inner edge highlight
  glassStrokeOuter: 'rgba(0,0,0,0.06)',         // Outer shadow-edge
  glassEdge: 'rgba(148,163,184,0.18)',          // Ambient edge tint
  glassSpecular: 'rgba(255,255,255,0.72)',      // Top specular highlight
  glassSpecularFade: 'rgba(255,255,255,0)',     // Specular gradient end

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
