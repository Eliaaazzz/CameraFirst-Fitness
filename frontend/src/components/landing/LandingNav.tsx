/**
 * LandingNav — Sticky top navigation bar for the landing page (web only)
 *
 * Inspired by: Uber homepage nav — minimal, left logo + right actions,
 * sticky positioning so it stays visible on scroll.
 */

import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AuraMark, Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

interface LandingNavProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingNav({ onLogin, onSignup }: LandingNavProps) {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width - 48, 1200);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bar, { maxWidth }]}>
        <View style={styles.left}>
          <AuraMark size={32} />
          <Text variant="heading3" weight="bold" style={styles.brand}>
            Metriful
          </Text>
        </View>

        <View style={styles.right}>
          <Pressable
            onPress={onLogin}
            style={({ pressed }) => [
              styles.loginBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="body" weight="semibold" style={styles.loginText}>
              Log in
            </Text>
          </Pressable>

          <Pressable
            onPress={onSignup}
            style={({ pressed }) => [
              styles.signupBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="body" weight="semibold" style={styles.signupText}>
              Sign up
            </Text>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.borderSubtle,
    zIndex: 100,
    // Sticky positioning for web
    ...({ position: 'sticky', top: 0 } as any),
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    color: BRAND_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loginBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  loginText: {
    color: BRAND_COLORS.textPrimary,
  },
  signupBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: BRAND_COLORS.textPrimary,
  },
  signupText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
});

export default LandingNav;
