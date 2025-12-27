import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from './responsive';

/**
 * Hook to get consistent tab bar height across the app
 * Calculates height based on device type and safe area insets
 */
export const useTabBarHeight = () => {
  const { isDesktop, isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  // Base heights for different device types
  const baseTabBarHeight = isDesktop ? 60 : isTablet ? 56 : 52;
  
  // Calculate bottom padding with minimum for Android devices without safe area
  const tabBarPaddingBottom = Platform.select({
    ios: Math.max(insets.bottom, 8) + 4,
    android: Math.max(insets.bottom, 8) + 4,
    default: 12, // web
  });
  
  return baseTabBarHeight + tabBarPaddingBottom;
};

/**
 * Utility function to calculate bottom padding for content
 * Includes tab bar height and safe area insets
 */
export const useContentBottomPadding = (additionalPadding = 0) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  
  return tabBarHeight + insets.bottom + additionalPadding;
};

/**
 * Get FAB bottom position relative to tab bar
 */
export const useFABBottomPosition = (additionalSpacing = 0) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  
  return insets.bottom + tabBarHeight + additionalSpacing;
};