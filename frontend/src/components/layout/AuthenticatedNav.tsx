/**
 * AuthenticatedNav - Uber-style global navigation for logged-in desktop web users.
 *
 * Pattern: Uber top bar with product navigation + user dropdown.
 * Dropdown: Name, quick actions (Help/Activity/Wallet grid), menu items, Sign out.
 */

import {
  Barbell,
  BookOpenText,
  CalendarBlank,
  CaretDown,
  CaretUp,
  ClockCounterClockwise,
  Lifebuoy,
  Question,
  SignOut,
  UserCircle,
} from 'phosphor-react-native';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { CommonActions, useNavigation, useNavigationState } from '@react-navigation/native';

import { Text } from '@/components/Text';
import useCurrentUser from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/stores';
import { APP_NAME, BRAND_COLORS, spacing } from '@/utils';

const brandIcon = require('@/../assets/app-icon-1024-transparent.png');

type MainRouteName = 'Dashboard' | 'Workouts' | 'Recipes' | 'Profile';
type NavKey = 'Home' | 'Workouts' | 'Recipes' | 'Reports';

interface AuthenticatedNavProps {
  currentRouteName?: string;
}

export function AuthenticatedNav({ currentRouteName: externalRouteName }: AuthenticatedNavProps) {
  const navigation = useNavigation<any>();
  const currentUser = useCurrentUser();
  const { signOut } = useAuthStore();
  const [hoveredItem, setHoveredItem] = useState<NavKey | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRouteName = useNavigationState((state) => {
    if (externalRouteName) return externalRouteName;
    if (!state?.routes?.length) return 'Dashboard';

    const getActiveRouteName = (node: any): string => {
      if (!node?.routes?.length) return 'Dashboard';
      const active = node.routes[node.index ?? 0];
      if (!active) return 'Dashboard';
      if (active.name === 'Main' && (active as any).state) {
        return getActiveRouteName((active as any).state);
      }
      if ((active as any).state?.routes?.length) {
        return getActiveRouteName((active as any).state);
      }
      return active.name;
    };

    return getActiveRouteName(state);
  });

  const activeKey = useMemo<NavKey>(() => {
    if (currentRouteName === 'Workouts' || currentRouteName === 'SavedWorkouts') return 'Workouts';
    if (currentRouteName === 'Recipes' || currentRouteName === 'RecipeDetail' || currentRouteName === 'SavedRecipes') return 'Recipes';
    if (currentRouteName === 'WeeklyInsights' || currentRouteName === 'MealHistory') return 'Reports';
    return 'Home';
  }, [currentRouteName]);

  const goToMain = (routeName: MainRouteName) => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'Main', params: { screen: routeName } })
    );
  };

  const openProfileScreen = useCallback((screen: string) => {
    setDropdownOpen(false);
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: {
          screen: 'Profile',
          params: { screen },
        },
      })
    );
  }, [navigation]);

  const handleNavPress = (key: NavKey) => {
    if (key === 'Home') { goToMain('Dashboard'); return; }
    if (key === 'Workouts') { goToMain('Workouts'); return; }
    if (key === 'Recipes') { goToMain('Recipes'); return; }
    openProfileScreen('WeeklyInsights');
  };

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false);
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' } as any] });
  }, [signOut, navigation]);

  const navItems: Array<{ key: NavKey; label: string }> = [
    { key: 'Home', label: 'Home' },
    { key: 'Workouts', label: 'Workouts' },
    { key: 'Recipes', label: 'Recipes' },
    { key: 'Reports', label: 'Reports' },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Brand */}
        <Pressable
          onPress={() => goToMain('Dashboard')}
          style={({ pressed }) => [styles.brandSide, pressed && styles.faded]}
          accessibilityRole="button"
          accessibilityLabel="Go to home"
        >
          <Image source={brandIcon} style={styles.brandIcon} contentFit="contain" />
          <Text variant="heading3" weight="bold" style={styles.brand}>
            {APP_NAME}
          </Text>
        </Pressable>

        {/* Center nav */}
        <View style={styles.centerNav}>
          {navItems.map((item) => {
            const isActive = activeKey === item.key;
            const isHovered = hoveredItem === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleNavPress(item.key)}
                style={[styles.navItem, isActive && styles.navItemActive]}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${item.label}`}
                accessibilityState={{ selected: isActive }}
                {...(Platform.OS === 'web' && {
                  onMouseEnter: () => setHoveredItem(item.key),
                  onMouseLeave: () => setHoveredItem(null),
                })}
              >
                <Text
                  variant="body"
                  weight="semibold"
                  style={isActive || isHovered ? [styles.navText, styles.navTextActive] : styles.navText}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Right actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              openProfileScreen('Help');
            }}
            style={({ pressed }) => [styles.utilityAction, pressed && styles.faded]}
            accessibilityRole="button"
            accessibilityLabel="Open help"
          >
            <Question size={18} weight="regular" color="#111111" />
            <Text variant="body" weight="semibold" style={styles.utilityText}>Help</Text>
          </Pressable>

          {/* User chip + dropdown */}
          <View style={styles.dropdownAnchor}>
            <Pressable
              onPress={() => setDropdownOpen(!dropdownOpen)}
              style={({ pressed }) => [styles.userChip, pressed && styles.userChipPressed]}
              accessibilityRole="button"
              accessibilityLabel="Open account menu"
              accessibilityState={{ expanded: dropdownOpen }}
              accessibilityHint="Opens a dropdown with account options"
            >
              <Text variant="body" weight="bold" style={styles.userName}>
                {currentUser.data?.username || 'Account'}
              </Text>
              {dropdownOpen
                ? <CaretUp size={14} weight="bold" color="#FFFFFF" />
                : <CaretDown size={14} weight="bold" color="#FFFFFF" />
              }
            </Pressable>

            {/* Uber-style dropdown */}
            {dropdownOpen && (
              <View style={styles.dropdown}>
                {/* Header */}
                <View style={styles.dropdownHeader}>
                  <View style={styles.dropdownHeaderLeft}>
                    <Text variant="heading3" weight="bold" style={styles.dropdownName}>
                      {currentUser.data?.username || 'User'}
                    </Text>
                    <Text variant="caption" style={styles.dropdownEmail}>
                      {currentUser.data?.email || ''}
                    </Text>
                  </View>
                  <View style={styles.dropdownAvatar}>
                    <UserCircle size={40} weight="fill" color="#CCCCCC" />
                  </View>
                </View>

                {/* Quick actions grid */}
                <View style={styles.quickActions}>
                  <Pressable
                    onPress={() => {
                      openProfileScreen('Help');
                    }}
                    style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Help"
                  >
                    <Lifebuoy size={24} weight="regular" color="#111111" />
                    <Text variant="caption" weight="semibold" style={styles.quickActionLabel}>Help</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      openProfileScreen('MealHistory');
                    }}
                    style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="View meal history"
                  >
                    <ClockCounterClockwise size={24} weight="regular" color="#111111" />
                    <Text variant="caption" weight="semibold" style={styles.quickActionLabel}>History</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      openProfileScreen('WeeklyInsights');
                    }}
                    style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="View activity"
                  >
                    <CalendarBlank size={24} weight="regular" color="#111111" />
                    <Text variant="caption" weight="semibold" style={styles.quickActionLabel}>Activity</Text>
                  </Pressable>
                </View>

                {/* Divider */}
                <View style={styles.dropdownDivider} />

                {/* Menu items */}
                <Pressable
                  onPress={() => openProfileScreen('ManageAccount')}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Manage account"
                >
                  <UserCircle size={20} weight="regular" color="#111111" />
                  <Text variant="body" weight="medium" style={styles.menuItemText}>Manage account</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDropdownOpen(false); goToMain('Workouts'); }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Workouts"
                >
                  <Barbell size={20} weight="regular" color="#111111" />
                  <Text variant="body" weight="medium" style={styles.menuItemText}>Workouts</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDropdownOpen(false); goToMain('Recipes'); }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                  accessibilityRole="menuitem"
                  accessibilityLabel="Recipes"
                >
                  <BookOpenText size={20} weight="regular" color="#111111" />
                  <Text variant="body" weight="medium" style={styles.menuItemText}>Recipes</Text>
                </Pressable>

                {/* Sign out */}
                <View style={styles.dropdownDivider} />
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => [styles.signOutBtn, pressed && styles.signOutPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out of account"
                >
                  <SignOut size={18} weight="regular" color="#DC2626" />
                  <Text variant="body" weight="medium" style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <Pressable
          onPress={() => setDropdownOpen(false)}
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close account menu"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,17,0.08)',
    zIndex: 100,
  },
  bar: {
    width: '100%',
    maxWidth: 1360,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  brandSide: {
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brand: {
    color: '#111111',
    letterSpacing: -0.5,
  },
  centerNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  navItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  navItemActive: {
    borderBottomColor: '#111111',
  },
  navText: {
    color: 'rgba(17,17,17,0.52)',
  },
  navTextActive: {
    color: '#111111',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  utilityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  utilityText: {
    color: '#111111',
  },
  dropdownAnchor: {
    position: 'relative',
    zIndex: 200,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#111111',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'opacity 0.15s ease-out',
    }),
  },
  userChipPressed: {
    opacity: 0.88,
  },
  userName: {
    color: '#FFFFFF',
  },

  // ── Dropdown ──
  dropdown: {
    position: 'absolute',
    top: 56,
    right: 0,
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    ...(Platform.OS === 'web' && ({
      boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
    } as any)),
    zIndex: 300,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dropdownHeaderLeft: {
    flex: 1,
  },
  dropdownName: {
    color: '#111111',
    fontSize: 22,
  },
  dropdownEmail: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
  },
  dropdownAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  quickActionPressed: {
    backgroundColor: '#E8E8E8',
  },
  quickActionLabel: {
    color: '#111111',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  menuItemPressed: {
    backgroundColor: '#F8F8F8',
  },
  menuItemText: {
    color: '#111111',
    fontSize: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  signOutPressed: {
    backgroundColor: '#FEE2E2',
  },
  signOutText: {
    color: '#DC2626',
  },
  backdrop: {
    ...(Platform.OS === 'web' && ({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99,
    } as any)),
  },
  faded: {
    opacity: 0.72,
  },
});

export default AuthenticatedNav;
