import { CaretDown, GlobeHemisphereWest, Question } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, LANDING_COLORS, motion, radii, spacing } from '@/utils';

interface LandingNavProps {
  onLogin: () => void;
  onSignup: () => void;
  onNavPress?: (item: string) => void;
}

const NAV_ITEMS = ['Track', 'Programs', 'Reports', 'About'];
const brandIcon = require('@/../assets/app-icon-1024-transparent.png');

export function LandingNav({ onLogin, onSignup, onNavPress }: LandingNavProps) {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width - 32, 1360);
  const showCenterNav = width >= 1080;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bar, { maxWidth }]}>
        <View style={styles.brandSide}>
          <Image source={brandIcon} style={styles.brandIcon} contentFit="contain" />
          <Text variant="heading3" weight="bold" style={styles.brand}>
            {APP_NAME}
          </Text>
        </View>

        {showCenterNav && (
          <View style={styles.centerNav}>
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item}
                onPress={() => onNavPress?.(item)}
                style={({ pressed }) => [styles.navItem, pressed && styles.faded]}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${item}`}
              >
                <Text variant="body" weight="semibold" style={styles.navText}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.utilityAction, pressed && styles.faded]}
            accessibilityRole="button"
            accessibilityLabel="Change language"
          >
            <GlobeHemisphereWest size={18} weight="regular" color={LANDING_COLORS.textOnDark} />
            <Text variant="body" weight="semibold" style={styles.utilityText}>
              EN
            </Text>
          </Pressable>

          {width >= 960 && (
            <Pressable
              style={({ pressed }) => [styles.utilityAction, pressed && styles.faded]}
              accessibilityRole="button"
              accessibilityLabel="Open help"
            >
              <Question size={18} weight="regular" color={LANDING_COLORS.textOnDark} />
              <Text variant="body" weight="semibold" style={styles.utilityText}>
                Help
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onLogin}
            style={({ pressed }) => [styles.loginBtn, pressed && styles.faded]}
            accessibilityRole="button"
            accessibilityLabel="Log in to your account"
          >
            <Text variant="body" weight="semibold" style={styles.utilityText}>
              Log in
            </Text>
          </Pressable>

          <Pressable
            onPress={onSignup}
            style={({ pressed }) => [styles.signupBtn, pressed && styles.signupBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Create a new account"
          >
            <Text variant="body" weight="bold" style={styles.signupText}>
              Sign up
            </Text>
            {width >= 960 && <CaretDown size={16} weight="bold" color={LANDING_COLORS.text} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: LANDING_COLORS.navBg,
    zIndex: 100,
    ...({ position: 'sticky', top: 0 } as any),
  },
  bar: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  brandSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  brand: {
    color: LANDING_COLORS.textOnDark,
    letterSpacing: -0.5,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  centerNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  navItem: {
    paddingVertical: spacing.sm,
  },
  navText: {
    color: LANDING_COLORS.textOnDark,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  utilityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  utilityText: {
    color: LANDING_COLORS.textOnDark,
  },
  loginBtn: {
    paddingVertical: spacing.sm,
  },
  signupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: LANDING_COLORS.pillBg,
    transitionDuration: `${motion.fast}ms`,
  } as any,
  signupBtnPressed: {
    opacity: 0.88,
  },
  signupText: {
    color: LANDING_COLORS.pillText,
  },
  faded: {
    opacity: 0.7,
  },
});

export default LandingNav;
