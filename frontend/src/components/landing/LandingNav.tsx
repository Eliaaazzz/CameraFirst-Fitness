import { CaretDown, GlobeHemisphereWest, Question } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, EXPERIENCE_COLORS, LANDING_COLORS, motion, radii, spacing } from '@/utils';

interface LandingNavProps {
  onLogin: () => void;
  onSignup: () => void;
  onNavPress?: (item: string) => void;
  onHelp?: () => void;
  onLanguage?: () => void;
}

const NAV_ITEMS = ['Track', 'Programs', 'Reports', 'About'];
const brandIcon = require('@/../assets/app-icon-1024-transparent.png');

export function LandingNav({ onLogin, onSignup, onNavPress, onHelp, onLanguage }: LandingNavProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 680;
  const maxWidth = Math.min(width - (isCompact ? 20 : 32), 1360);
  const showCenterNav = width >= 1080;
  const showLocaleAction = width >= 760;
  const showHelpAction = width >= 420;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bar, { maxWidth, minHeight: width >= 720 ? 88 : 76 }]}>
        <View style={styles.brandSide}>
          <Image source={brandIcon} style={styles.brandIcon} contentFit="contain" />
          <View>
            <Text variant="heading3" weight="bold" style={styles.brand}>
              {APP_NAME}
            </Text>
            {!isCompact && (
              <Text variant="caption" weight="medium" style={styles.brandMeta}>
                Meals, rings, recovery
              </Text>
            )}
          </View>
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
          {showLocaleAction && (
            <Pressable
              onPress={onLanguage}
              style={({ pressed }) => [styles.utilityAction, pressed && styles.faded]}
              accessibilityRole="button"
              accessibilityLabel="Language and region details"
            >
              <GlobeHemisphereWest size={18} weight="regular" color={EXPERIENCE_COLORS.ink} />
              <Text variant="body" weight="semibold" style={styles.utilityText}>
                EN
              </Text>
            </Pressable>
          )}

          {showHelpAction && (
            <Pressable
              onPress={onHelp}
              style={({ pressed }) => [styles.utilityAction, pressed && styles.faded]}
              accessibilityRole="button"
              accessibilityLabel="Open help"
            >
              <Question size={18} weight="regular" color={EXPERIENCE_COLORS.ink} />
              {!isCompact && (
                <Text variant="body" weight="semibold" style={styles.utilityText}>
                  Help
                </Text>
              )}
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
              Start now
            </Text>
            {width >= 960 && <CaretDown size={16} weight="bold" color={LANDING_COLORS.textOnDark} />}
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
    backgroundColor: 'transparent',
    zIndex: 100,
    ...({ position: 'sticky', top: 0 } as any),
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: 28,
    backgroundColor: EXPERIENCE_COLORS.glassStrong,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
    ...(typeof document !== 'undefined'
      ? ({ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 18px 40px rgba(26,60,109,0.12)' } as any)
      : {
          shadowColor: EXPERIENCE_COLORS.shadow,
          shadowOffset: { width: 0, height: 16 },
          shadowRadius: 30,
          shadowOpacity: 0.12,
          elevation: 8,
        }),
  },
  brandSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  brand: {
    color: EXPERIENCE_COLORS.ink,
    letterSpacing: -0.5,
  },
  brandMeta: {
    color: EXPERIENCE_COLORS.inkSoft,
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
    color: EXPERIENCE_COLORS.inkSoft,
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
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  utilityText: {
    color: EXPERIENCE_COLORS.ink,
  },
  loginBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  signupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 18,
    minHeight: 46,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: EXPERIENCE_COLORS.ink,
    transitionDuration: `${motion.fast}ms`,
    ...(typeof document !== 'undefined'
      ? ({ boxShadow: '0 14px 26px rgba(17,17,17,0.12)' } as any)
      : {
          shadowColor: '#111111',
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 18,
          shadowOpacity: 0.12,
          elevation: 6,
        }),
  } as any,
  signupBtnPressed: {
    opacity: 0.88,
  },
  signupText: {
    color: LANDING_COLORS.textOnDark,
  },
  faded: {
    opacity: 0.7,
  },
});

export default LandingNav;
