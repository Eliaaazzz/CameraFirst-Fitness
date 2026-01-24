/**
 * SidebarRail - Desktop collapsible sidebar (Linear-style)
 * - Expands/collapses between full width and rail mode
 * - 180ms animation with smooth easing
 * - Used for desktop web layout
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/utils/theme';
import { LAYOUT_DIMENSIONS } from '@/utils/responsive';

// Animation config
const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const DURATION = 180;

interface SidebarRailProps {
  collapsed: boolean;
  width?: number;      // Expanded width
  railWidth?: number;  // Collapsed width (rail mode)
  children: React.ReactNode;
}

export function SidebarRail({
  collapsed,
  width = LAYOUT_DIMENSIONS.sidebarWidth,
  railWidth = 72,
  children,
}: SidebarRailProps) {
  const w = useSharedValue(collapsed ? railWidth : width);

  useEffect(() => {
    w.value = withTiming(collapsed ? railWidth : width, {
      duration: DURATION,
      easing: EASING,
    });
  }, [collapsed, width, railWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: w.value,
  }));

  return (
    <Animated.View style={[styles.sidebar, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: '100%',
    backgroundColor: colors.light.background,
    // Stripe/Linear style: border instead of heavy shadow
    borderRightWidth: 1,
    borderRightColor: colors.light.border,
  },
});

export default SidebarRail;
