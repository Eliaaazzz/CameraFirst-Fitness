import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Responsive breakpoints for different device sizes
 * Following common web breakpoint conventions adapted for React Native
 */
export const Breakpoints = {
  mobile: 0,      // 0-639px (phones in portrait)
  tablet: 640,    // 640-1023px (large phones landscape, small tablets)
  desktop: 1024,  // 1024-1439px (tablets landscape, small desktops)
  wide: 1440,     // 1440px+ (large desktops)
} as const;

/**
 * Layout dimensions for desktop web design
 * Used for sidebar navigation and three-column layouts
 */
export const LAYOUT_DIMENSIONS = {
  sidebarWidth: 240,
  rightPanelWidth: 320,
  mainContentMaxWidth: 630,
  sidebarBreakpoint: 1024,   // Show sidebar at this width
  rightPanelBreakpoint: 1264, // Show right panel at this width
} as const;

/**
 * Layout mode types for responsive design
 */
export type LayoutMode = 'mobile' | 'sidebar' | 'three-column';

export type BreakpointKey = keyof typeof Breakpoints;

/**
 * Device type based on screen width
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Orientation type
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Responsive dimensions interface
 */
export interface ResponsiveDimensions {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isSmallMobile: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isWeb: boolean;
  isNative: boolean;
}

/**
 * Get device type based on width
 */
export function getDeviceType(width: number): DeviceType {
  if (width >= Breakpoints.wide) return 'wide';
  if (width >= Breakpoints.desktop) return 'desktop';
  if (width >= Breakpoints.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Get orientation based on dimensions
 */
export function getOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Hook to get current responsive dimensions and device info
 * Updates automatically when window is resized
 *
 * @example
 * const { isMobile, isDesktop, width } = useResponsive();
 *
 * return (
 *   <View style={{ padding: isMobile ? 16 : 32 }}>
 *     {isDesktop ? <SidebarLayout /> : <MobileLayout />}
 *   </View>
 * );
 */
export function useResponsive(): ResponsiveDimensions {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const deviceType = getDeviceType(width);
    const orientation = getOrientation(width, height);
    const isWeb = Platform.OS === 'web';

    return {
      width,
      height,
      deviceType,
      orientation,
      isSmallMobile: width < 375, // iPhone SE and smaller
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop' || deviceType === 'wide',
      isWide: deviceType === 'wide',
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape',
      isWeb,
      isNative: !isWeb,
    };
  }, [width, height]);
}

/**
 * Responsive value selector
 * Returns different values based on device type
 *
 * @example
 * const padding = useResponsiveValue({
 *   mobile: 16,
 *   tablet: 24,
 *   desktop: 32,
 * });
 */
export function useResponsiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}): T {
  const { deviceType } = useResponsive();

  // Extract individual values to avoid object reference comparison issues
  // This prevents infinite re-renders when inline objects are passed
  const { mobile, tablet, desktop, wide } = values;

  return useMemo(() => {
    switch (deviceType) {
      case 'wide':
        return wide ?? desktop ?? tablet ?? mobile;
      case 'desktop':
        return desktop ?? tablet ?? mobile;
      case 'tablet':
        return tablet ?? mobile;
      case 'mobile':
      default:
        return mobile;
    }
  }, [deviceType, mobile, tablet, desktop, wide]);
}

/**
 * Get number of columns for grid layouts based on screen width
 *
 * @example
 * const columns = useResponsiveColumns();
 * // Returns: 1 on mobile, 2 on tablet, 3 on desktop, 4 on wide
 */
export function useResponsiveColumns(options?: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  wide?: number;
}): number {
  return useResponsiveValue({
    mobile: options?.mobile ?? 1,
    tablet: options?.tablet ?? 2,
    desktop: options?.desktop ?? 3,
    wide: options?.wide ?? 4,
  });
}

/**
 * Calculate responsive spacing based on device type
 * Multiplies base spacing by device-specific scale
 */
export function useResponsiveSpacing(baseSpacing: number): number {
  return useResponsiveValue({
    mobile: baseSpacing,
    tablet: baseSpacing * 1.25,
    desktop: baseSpacing * 1.5,
    wide: baseSpacing * 1.75,
  });
}

/**
 * Calculate responsive font size based on device type
 * Multiplies base size by device-specific scale
 */
export function useResponsiveFontSize(baseSize: number): number {
  return useResponsiveValue({
    mobile: baseSize,
    tablet: baseSize * 1.1,
    desktop: baseSize * 1.15,
    wide: baseSize * 1.2,
  });
}

/**
 * Get container max width for centered layouts
 * Useful for preventing content from becoming too wide on large screens
 */
export function useContainerMaxWidth(): number | undefined {
  const { isDesktop, isWide } = useResponsive();

  if (isWide) return 1440;
  if (isDesktop) return 1200;
  return undefined; // No max width on mobile/tablet
}

/**
 * Responsive padding helper
 * Returns horizontal padding that scales with device size
 */
export function useResponsivePadding() {
  return useResponsiveValue({
    mobile: 16,
    tablet: 24,
    desktop: 32,
    wide: 48,
  });
}

/**
 * Check if touch device (useful for web)
 * On native, always returns true
 * On web, checks for touch support
 */
export function useIsTouchDevice(): boolean {
  const { isWeb } = useResponsive();

  if (!isWeb) return true;

  // On web, check for touch support
  if (typeof window !== 'undefined') {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0
    );
  }

  return false;
}

/**
 * Utility to create responsive styles
 * Returns a function that can be called with responsive dimensions
 *
 * @example
 * const styles = createResponsiveStyles((r) => ({
 *   container: {
 *     padding: r.isMobile ? 16 : 32,
 *     flexDirection: r.isDesktop ? 'row' : 'column',
 *   },
 * }));
 *
 * // In component:
 * const responsive = useResponsive();
 * const style = styles(responsive);
 */
export function createResponsiveStyles<T>(
  stylesFn: (responsive: ResponsiveDimensions) => T
): (responsive: ResponsiveDimensions) => T {
  return stylesFn;
}

/**
 * Platform-aware hover styles
 * Only applies hover styles on web with mouse support
 */
export function getHoverStyle(
  baseStyle: object,
  hoverStyle: object,
  isHovered: boolean
): object {
  const isWeb = Platform.OS === 'web';
  const isTouchDevice = useIsTouchDevice();

  // Only apply hover on web with mouse
  if (isWeb && !isTouchDevice && isHovered) {
    return { ...baseStyle, ...hoverStyle };
  }

  return baseStyle;
}

/**
 * Calculate grid item width based on number of columns and spacing
 */
export function calculateGridItemWidth(
  containerWidth: number,
  columns: number,
  spacing: number
): number {
  const totalSpacing = spacing * (columns - 1);
  return (containerWidth - totalSpacing) / columns;
}

/**
 * Helper to conditionally render components based on device type
 *
 * @example
 * <ResponsiveRender
 *   mobile={<MobileNav />}
 *   desktop={<DesktopNav />}
 * />
 */
export function ResponsiveRender({
  mobile,
  tablet,
  desktop,
  wide,
}: {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  wide?: React.ReactNode;
}) {
  const { deviceType } = useResponsive();

  switch (deviceType) {
    case 'wide':
      return wide ?? desktop ?? tablet ?? mobile ?? null;
    case 'desktop':
      return desktop ?? tablet ?? mobile ?? null;
    case 'tablet':
      return tablet ?? mobile ?? null;
    case 'mobile':
    default:
      return mobile ?? null;
  }
}

// Tab bar height constant (approximate)
const TAB_BAR_HEIGHT = 80;

/**
 * Hook to calculate bottom padding for content that needs to avoid the tab bar
 * Accounts for safe area insets and tab bar height
 *
 * @param extraPadding - Additional padding to add (e.g., spacing.lg)
 * @returns The total bottom padding needed
 *
 * @example
 * const bottomPadding = useContentBottomPadding(spacing.lg);
 * <FlatList contentContainerStyle={{ paddingBottom: bottomPadding }} />
 */
export function useContentBottomPadding(extraPadding: number = 0): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + extraPadding;
}

/**
 * Hook to calculate FAB bottom position to avoid the tab bar
 * Accounts for safe area insets and tab bar height
 *
 * @param extraMargin - Additional margin from the tab bar (e.g., spacing.md)
 * @returns The bottom position for the FAB
 *
 * @example
 * const fabBottom = useFABBottomPosition(spacing.md);
 * <FAB style={{ bottom: fabBottom }} />
 */
export function useFABBottomPosition(extraMargin: number = 0): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_HEIGHT + extraMargin;
}

/**
 * Hook to determine the current layout mode based on screen width
 * - 'mobile': Bottom tab navigation (< 1024px)
 * - 'sidebar': Sidebar navigation only (1024px - 1263px)
 * - 'three-column': Sidebar + main content + right panel (>= 1264px)
 */
export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    if (!isWeb || width < LAYOUT_DIMENSIONS.sidebarBreakpoint) {
      return 'mobile';
    }
    if (width < LAYOUT_DIMENSIONS.rightPanelBreakpoint) {
      return 'sidebar';
    }
    return 'three-column';
  }, [width, isWeb]);
}

/**
 * Hook to determine if sidebar should be visible
 * Returns true on desktop web (>= 1024px)
 */
export function useSidebarVisible(): boolean {
  const layoutMode = useLayoutMode();
  return layoutMode !== 'mobile';
}

/**
 * Hook to determine if right panel should be visible
 * Returns true on wide web screens (>= 1264px)
 */
export function useRightPanelVisible(): boolean {
  const layoutMode = useLayoutMode();
  return layoutMode === 'three-column';
}
