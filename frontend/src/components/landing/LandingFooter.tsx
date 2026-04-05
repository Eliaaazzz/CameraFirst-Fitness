/**
 * LandingFooter — CTA section + brand footer
 *
 * Inspired by: Uber homepage bottom CTA + minimal footer —
 * strong call-to-action, then a clean brand mark + copyright line.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuraMark, Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

const SERIF_FONT = 'Georgia, "Times New Roman", serif';

interface LandingFooterProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingFooter({ onGetStarted, onLogin }: LandingFooterProps) {
  return (
    <View style={styles.wrapper}>
      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text
          variant="heading1"
          weight="bold"
          style={styles.ctaTitle}
        >
          Ready to take control of{'\n'}your nutrition?
        </Text>

        <Text variant="heading4" style={styles.ctaSubtitle}>
          Join thousands tracking smarter — not harder.
        </Text>

        <View style={styles.ctaButtonRow}>
          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="body" weight="bold" style={styles.primaryBtnText}>
              Get Started for Free
            </Text>
          </Pressable>

          <Pressable onPress={onLogin}>
            <Text variant="body" weight="semibold" style={styles.loginLink}>
              Already have an account? Log in
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Footer brand + copyright */}
      <View style={styles.footer}>
        <View style={styles.brandRow}>
          <AuraMark size={24} />
          <Text variant="body" weight="semibold" style={styles.brandName}>
            Metriful
          </Text>
        </View>
        <Text variant="caption" style={styles.legal}>
          © 2026 Metriful. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  ctaSection: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.lg,
  },
  ctaTitle: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  ctaSubtitle: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
  },
  ctaButtonRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  primaryBtn: {
    backgroundColor: BRAND_COLORS.textPrimary,
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  loginLink: {
    color: BRAND_COLORS.textPrimary,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    borderTopWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    color: BRAND_COLORS.textPrimary,
  },
  legal: {
    color: BRAND_COLORS.textMuted,
  },
});

export default LandingFooter;
