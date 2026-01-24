/**
 * SidebarDrawer - Mobile drawer with gesture support
 * - Swipe to open/close
 * - Overlay tap to close
 * - 180ms open, 150ms close (fast & responsive)
 */

import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '@/utils/theme';

// Animation config - fast & snappy
const EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const OPEN_DURATION = 180;
const CLOSE_DURATION = 150;
const OVERLAY_OPACITY = 0.35;

interface SidebarDrawerProps {
  open: boolean;
  onClose: () => void;
  drawerWidth?: number;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarDrawer({
  open,
  onClose,
  drawerWidth = 280,
  sidebar,
  children,
}: SidebarDrawerProps) {
  // x: -drawerWidth (closed) -> 0 (open)
  const x = useSharedValue(-drawerWidth);

  const openAnim = () => {
    x.value = withTiming(0, { duration: OPEN_DURATION, easing: EASING });
  };

  const closeAnim = () => {
    x.value = withTiming(
      -drawerWidth,
      { duration: CLOSE_DURATION, easing: EASING },
      (finished) => {
        if (finished) runOnJS(onClose)();
      }
    );
  };

  // Sync with external open state
  useEffect(() => {
    if (open) {
      openAnim();
    } else {
      x.value = withTiming(-drawerWidth, { duration: CLOSE_DURATION, easing: EASING });
    }
  }, [open, drawerWidth]);

  // Overlay fade animation
  const overlayStyle = useAnimatedStyle(() => {
    const progress = interpolate(x.value, [-drawerWidth, 0], [0, 1]);
    return {
      opacity: OVERLAY_OPACITY * progress,
      pointerEvents: progress > 0.01 ? 'auto' : 'none',
    } as any;
  });

  // Drawer slide animation
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  // Pan gesture for mobile (disabled on web desktop)
  const pan = useMemo(() => {
    if (Platform.OS === 'web') {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .onChange((e) => {
        // Clamp between closed and open positions
        const next = Math.min(0, Math.max(-drawerWidth, x.value + e.changeX));
        x.value = next;
      })
      .onEnd((e) => {
        // Snap based on velocity or position
        const shouldOpen = e.velocityX > 600 || x.value > -drawerWidth * 0.5;
        if (shouldOpen) {
          x.value = withTiming(0, { duration: OPEN_DURATION, easing: EASING });
        } else {
          closeAnim();
        }
      });
  }, [drawerWidth]);

  return (
    <View style={styles.root}>
      {/* Main content */}
      <View style={styles.content}>{children}</View>

      {/* Overlay - tap to close */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnim} />
      </Animated.View>

      {/* Drawer - slides from left */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.drawer, { width: drawerWidth }, drawerStyle]}>
          {sidebar}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.light.background,
    // No heavy shadow on moving container for performance
    // Use border instead (Stripe/Linear style)
    borderRightWidth: 1,
    borderRightColor: colors.light.border,
  },
});

export default SidebarDrawer;
