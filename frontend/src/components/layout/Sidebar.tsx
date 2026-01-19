import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Text';
import useCurrentUser from '@/hooks/useCurrentUser';
import { BRAND_COLORS, LAYOUT_DIMENSIONS, colors, spacing } from '@/utils';

interface NavItem {
  name: string;
  label: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Feather';
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    label: 'Home',
    icon: 'home',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Workouts',
    label: 'Workouts',
    icon: 'dumbbell',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Recipes',
    label: 'Recipes',
    icon: 'book-open-variant',
    iconFamily: 'MaterialCommunityIcons',
  },
  {
    name: 'Profile',
    label: 'Profile',
    icon: 'user',
    iconFamily: 'Feather',
  },
];

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}

function NavItemButton({ item, isActive, onPress }: NavItemButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const IconComponent =
    item.iconFamily === 'Feather' ? Feather : MaterialCommunityIcons;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.navItem,
        isActive && styles.navItemActive,
        isHovered && !isActive && styles.navItemHovered,
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      })}
    >
      {/* Left accent bar for active state */}
      <View
        style={[
          styles.navItemAccent,
          isActive && styles.navItemAccentActive,
        ]}
      />
      <IconComponent
        name={item.icon as any}
        size={22}
        color={isActive ? BRAND_COLORS.primary : colors.light.textSecondary}
      />
      <Text
        variant="body"
        weight={isActive ? 'bold' : 'regular'}
        style={isActive ? [styles.navItemLabel, styles.navItemLabelActive] : styles.navItemLabel}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

interface SidebarProps {
  onLogFood?: () => void;
}

export function Sidebar({ onLogFood }: SidebarProps) {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const [isLogButtonHovered, setIsLogButtonHovered] = useState(false);

  // Get the current route name from navigation state
  const currentRouteName = useNavigationState((state) => {
    if (!state?.routes) return 'Dashboard';
    const route = state.routes[state.index];
    return route?.name || 'Dashboard';
  });

  const handleNavPress = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const handleLogFood = () => {
    if (onLogFood) {
      onLogFood();
    } else {
      // Default: navigate to Dashboard and trigger add food
      navigation.navigate('Dashboard');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFF" />
        </LinearGradient>
        <Text variant="heading3" weight="bold" style={styles.logoText}>
          AuraFitness
        </Text>
      </View>

      {/* Global Log Food Button - Twitter/Instagram style */}
      <Pressable
        style={[
          styles.logFoodButton,
          isLogButtonHovered && styles.logFoodButtonHovered,
        ]}
        onPress={handleLogFood}
        {...(Platform.OS === 'web' && {
          onMouseEnter: () => setIsLogButtonHovered(true),
          onMouseLeave: () => setIsLogButtonHovered(false),
        })}
      >
        <LinearGradient
          colors={[BRAND_COLORS.primary, BRAND_COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.logFoodGradient}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFF" />
          <Text variant="body" weight="bold" style={styles.logFoodText}>
            Log Food
          </Text>
        </LinearGradient>
      </Pressable>

      {/* Navigation Items */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItemButton
            key={item.name}
            item={item}
            isActive={currentRouteName === item.name}
            onPress={() => handleNavPress(item.name)}
          />
        ))}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* User Footer */}
      <Pressable
        style={styles.userFooter}
        onPress={() => handleNavPress('Profile')}
      >
        <View style={styles.userAvatar}>
          <Feather name="user" size={18} color={BRAND_COLORS.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {currentUser.data?.username || 'User'}
          </Text>
          {(currentUser.data?.currentStreak ?? 0) > 0 && (
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={12} color="#F97316" />
              <Text variant="caption" style={styles.streakText}>
                {currentUser.data?.currentStreak} day streak
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Keyboard shortcut hint */}
      <View style={styles.shortcutHint}>
        <Text variant="caption" style={styles.shortcutText}>
          Press <Text style={styles.keyBadge}>C</Text> to log food
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: LAYOUT_DIMENSIONS.sidebarWidth,
    height: '100%',
    backgroundColor: colors.light.surface,
    borderRightWidth: 1,
    borderRightColor: colors.light.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    marginLeft: spacing.sm,
    color: BRAND_COLORS.textPrimary,
  },
  // Global Log Food Button
  logFoodButton: {
    marginBottom: spacing.xl,
    borderRadius: 999,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
    }),
  },
  logFoodButtonHovered: {
    ...(Platform.OS === 'web' && {
      transform: [{ scale: 1.02 }],
      boxShadow: '0 6px 16px rgba(124, 58, 237, 0.35)',
    }),
  },
  logFoodGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  logFoodText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  // Navigation
  nav: {
    gap: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.sm, // Make room for accent bar
    borderRadius: 12,
    gap: spacing.md,
    position: 'relative',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'all 0.15s ease-out',
    }),
  },
  navItemAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  navItemAccentActive: {
    backgroundColor: BRAND_COLORS.primary,
  },
  navItemActive: {
    backgroundColor: '#F3E8FF', // Light purple background
  },
  navItemHovered: {
    backgroundColor: colors.light.background,
  },
  navItemLabel: {
    color: colors.light.textSecondary,
    fontSize: 15,
  },
  navItemLabelActive: {
    color: BRAND_COLORS.primary,
  },
  spacer: {
    flex: 1,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND_COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  streakText: {
    color: '#F97316',
    fontSize: 11,
  },
  // Keyboard shortcut hint
  shortcutHint: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  shortcutText: {
    color: colors.light.textMuted,
    fontSize: 11,
  },
  keyBadge: {
    backgroundColor: colors.light.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    fontSize: 10,
    color: colors.light.textSecondary,
  },
});

export default Sidebar;
