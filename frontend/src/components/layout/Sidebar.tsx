/**
 * Sidebar - Platform-style desktop navigation.
 *
 * Keeps the existing collapse behavior but swaps the soft SaaS treatment
 * for a harder black/white shell that matches the landing page.
 */

import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  HouseSimple,
  Barbell,
  BookOpenText,
  UserCircle,
  IconProps,
} from 'phosphor-react-native';



import { CommonActions, useNavigation, useNavigationState } from '@react-navigation/native';

import { Text } from '@/components/Text';
import useCurrentUser from '@/hooks/useCurrentUser';
import { APP_NAME, BRAND_COLORS, LAYOUT_DIMENSIONS, colors, spacing } from '@/utils';

// Animation config - fast & snappy
const SIDEBAR_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const OPEN_DURATION = 180;
const CLOSE_DURATION = 150;

// Animated Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Nav item config with Phosphor icons and theme colors
interface NavItemConfig {
  key: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { key: 'Dashboard', label: 'Home', Icon: HouseSimple },
  { key: 'Workouts', label: 'Workouts', Icon: Barbell },
  { key: 'Recipes', label: 'Recipes', Icon: BookOpenText },
  { key: 'Profile', label: 'Profile', Icon: UserCircle },
];
const NAV_KEYS = NAV_ITEMS.map(item => item.key);

// ============================================================================
// NAV ITEM COMPONENT
// ============================================================================

interface NavItemButtonProps {
  item: NavItemConfig;
  isActive: boolean;
  isCollapsed: boolean;
  isHovered: boolean;
  onPress: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
}

function NavItemButton({
  item,
  isActive,
  isCollapsed,
  isHovered,
  onPress,
  onHoverIn,
  onHoverOut,
}: NavItemButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 80 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = isActive
    ? '#FFFFFF'
    : isHovered
      ? colors.light.textPrimary
      : colors.light.textSecondary;

  const labelColor = isActive
    ? '#FFFFFF'
    : isHovered
      ? colors.light.textPrimary
      : colors.light.textSecondary;

  const rowBg = isActive
    ? '#111111'
    : isHovered
      ? colors.light.surfaceVariant
      : 'transparent';

  const chipBg = isActive
    ? 'rgba(255,255,255,0.12)'
    : isHovered
      ? 'rgba(17,17,17,0.06)'
      : 'transparent';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.navItem,
        {
          backgroundColor: rowBg,
          borderColor: isActive
            ? '#111111'
            : isHovered
              ? colors.light.border
              : 'transparent',
          ...(Platform.OS === 'web' && ({
            boxShadow: isActive
              ? '0 12px 24px rgba(17,17,17,0.08)'
              : isHovered
                ? '0 6px 18px rgba(17,17,17,0.04)'
                : 'none',
          } as any)),
        },
        isCollapsed && styles.navItemCollapsed,
        animatedStyle,
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: onHoverIn,
        onMouseLeave: onHoverOut,
      })}
    >
      {/* Icon chip */}
      <View
        style={[
          styles.chip,
          {
            backgroundColor: chipBg,
            borderColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
          },
        ]}
      >
        <item.Icon
          size={20}
          weight={isActive ? 'fill' : 'regular'} // Filled icon for active state
          color={iconColor}
        />
      </View>

      {/* Label - hidden when collapsed */}
      {!isCollapsed && (
        <Text
          variant="body"
          weight={isActive ? 'bold' : 'medium'}
          style={[styles.navLabel, { color: labelColor }]}
        >
          {item.label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// MAIN SIDEBAR COMPONENT
// ============================================================================

interface SidebarProps {
  onLogFood?: () => void;
}

export function Sidebar({ onLogFood: _onLogFood }: SidebarProps) {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Animation value for collapse
  const collapseProgress = useSharedValue(0);

  // Get current route
  const currentRouteName = useNavigationState((state) => {
    if (!state?.routes) return 'Dashboard';

    const getActiveTab = (node: any): string | null => {
      if (!node?.routes?.length) return null;
      const active = node.routes[node.index ?? 0];
      if (!active) return null;
      if (NAV_KEYS.includes(active.name)) return active.name;
      // Dive deeper into nested navigator states if present
      return getActiveTab((active as any).state);
    };

    // Start from top-level (Stack: Splash/Login/Main)
    const topRoute = state.routes[state.index];
    if (!topRoute) return 'Dashboard';

    // If we're on the Main stack entry, try to read its nested tab state
    const nestedTab = getActiveTab((topRoute as any).state);
    if (nestedTab) return nestedTab;

    return NAV_KEYS.includes(topRoute.name) ? topRoute.name : 'Dashboard';
  });

  const handleNavPress = (routeName: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: { screen: routeName },
      })
    );
  };

  const toggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    collapseProgress.value = withTiming(newCollapsed ? 1 : 0, {
      duration: newCollapsed ? CLOSE_DURATION : OPEN_DURATION,
      easing: SIDEBAR_EASING,
    });
  }, [isCollapsed]);

  // Animated width
  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(
      collapseProgress.value,
      [0, 1],
      [LAYOUT_DIMENSIONS.sidebarWidth, 72]
    ),
  }));

  // Animated text opacity
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseProgress.value, [0, 0.3], [1, 0]),
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Header - Toggle collapse */}
      <Pressable
        onPress={toggleCollapse}
        style={({ pressed }) => [
          styles.header,
          isCollapsed && styles.headerCollapsed,
          pressed && styles.headerPressed,
        ]}
      >
        <View style={styles.toggleIcon}>
          <Text variant="heading3" weight="bold" style={{ color: colors.light.textPrimary, fontSize: 18 }}>A</Text>
        </View>
        {!isCollapsed && (
          <Animated.View style={[styles.brandContainer, textStyle]}>
            <Text variant="heading3" weight="bold" style={styles.brandText}>
              {APP_NAME}
            </Text>
          </Animated.View>
        )}
      </Pressable>

      {/* Navigation Items */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItemButton
            key={item.key}
            item={item}
            isActive={currentRouteName === item.key}
            isCollapsed={isCollapsed}
            isHovered={hoveredItem === item.key}
            onPress={() => handleNavPress(item.key)}
            onHoverIn={() => setHoveredItem(item.key)}
            onHoverOut={() => setHoveredItem(null)}
          />
        ))}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* User Footer */}
      <Pressable
        style={[styles.userFooter, isCollapsed && styles.userFooterCollapsed]}
        onPress={() => handleNavPress('Profile')}
      >
        <View style={styles.userAvatar}>
          <UserCircle size={24} weight="fill" color={BRAND_COLORS.textPrimary} />
        </View>
        {!isCollapsed && (
          <Animated.View style={[styles.userInfo, textStyle]}>
            <Text variant="body" weight="semibold" numberOfLines={1}>
              {currentUser.data?.username || 'User'}
            </Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: LAYOUT_DIMENSIONS.sidebarWidth,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: colors.light.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...(Platform.OS === 'web' && ({
      boxShadow: 'inset -1px 0 0 rgba(17,17,17,0.04)',
    } as any)),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.xs,
    borderRadius: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'background-color 0.15s ease-out',
      outlineStyle: 'none' as any,
      outlineWidth: 0,
    }),
  },
  headerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  headerPressed: {
    backgroundColor: colors.light.surfaceVariant,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.light.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  brandText: {
    color: colors.light.textPrimary,
    letterSpacing: -0.3,
  },

  // Navigation
  nav: {
    gap: 0, // Items handle their own spacing via marginTop
  },
  navItem: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xs,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.12s ease-out',
    }),
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginHorizontal: spacing.xs,
  },

  // Icon chip - ✅ always has faint theme tint (never dead gray)
  chip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  navLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  spacer: {
    flex: 1,
  },

  // User Footer
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderSubtle,
    marginTop: spacing.md,
    gap: spacing.sm,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
    }),
  },
  userFooterCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 0,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
});

export default Sidebar;
