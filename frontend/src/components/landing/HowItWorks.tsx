/**
 * HowItWorks — Deep-dive section with hero card + benefits list
 *
 * Inspired by: Uber homepage "Plan for later" section —
 * large colored card with illustration on left, benefit list on right.
 *
 * Desktop: side-by-side (2:1 ratio). Mobile: stacked.
 */

import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

const fruitSalad = require('@/../assets/illustrations/fruit-salad.svg');

const BENEFITS = [
  { icon: '\uD83D\uDCF7', text: 'No barcode scanning \u2014 just point and shoot' },
  { icon: '\u26A1', text: 'Results in under 3 seconds' },
  { icon: '\uD83C\uDFAF', text: 'AI learns your portions over time' },
  { icon: '\uD83D\uDD12', text: 'Your data stays private \u2014 always' },
];

const SERIF_FONT = 'Georgia, "Times New Roman", serif';

interface HowItWorksProps {
  onGetStarted: () => void;
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={styles.sectionTitle}
      >
        How it works
      </Text>

      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Left: Hero card with illustration */}
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <Text variant="heading2" weight="bold" style={styles.cardTitle}>
            Point your camera{'\n'}at any meal
          </Text>
          <Text variant="body" style={styles.cardSubtitle}>
            Our AI identifies foods, estimates portions, and calculates
            nutrition — all from a single photo.
          </Text>

          <Image
            source={fruitSalad}
            style={styles.cardIllustration}
            contentFit="contain"
          />

          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [
              styles.cardCta,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="body" weight="bold" style={styles.cardCtaText}>
              Try it free →
            </Text>
          </Pressable>
        </View>

        {/* Right: Benefits list */}
        <View style={[styles.benefits, isDesktop && styles.benefitsDesktop]}>
          <Text variant="heading3" weight="bold" style={styles.benefitsTitle}>
            Why it's better
          </Text>

          {BENEFITS.map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{benefit.icon}</Text>
              <Text variant="body" style={styles.benefitText}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['2xl'],
  },
  sectionTitle: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    fontFamily: SERIF_FONT,
    marginBottom: 32,
  },
  container: {
    gap: spacing.xl,
  },
  containerDesktop: {
    flexDirection: 'row',
    gap: 32,
  },
  card: {
    backgroundColor: BRAND_COLORS.primaryContainer,
    borderRadius: radii['2xl'],
    padding: 40,
    gap: spacing.lg,
    flex: 1,
  },
  cardDesktop: {
    flex: 2,
  },
  cardTitle: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  cardIllustration: {
    width: '100%',
    height: 240,
    marginVertical: spacing.md,
  },
  cardCta: {
    backgroundColor: BRAND_COLORS.textPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  cardCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  benefits: {
    flex: 1,
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  benefitsDesktop: {
    paddingLeft: spacing.lg,
    justifyContent: 'center',
  },
  benefitsTitle: {
    color: BRAND_COLORS.textPrimary,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  benefitIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  benefitText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
});

export default HowItWorks;
