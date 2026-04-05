/**
 * HeroSection — Full viewport-height hero with headline + illustration
 *
 * Inspired by: Uber homepage hero — bold serif headline left, illustration right,
 * fills the entire viewport minus the nav bar height.
 *
 * Desktop: side-by-side (50/50). Mobile: stacked vertically.
 */

import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, spacing, radii } from '@/utils';

const heroIllustration = require('@/../assets/illustrations/hero-healthy-eating.svg');

const NAV_HEIGHT = 68; // approximate nav bar height

interface HeroSectionProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function HeroSection({ onGetStarted, onLogin }: HeroSectionProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const sectionHeight = height - NAV_HEIGHT;

  return (
    <View
      style={[
        styles.container,
        isDesktop ? styles.containerDesktop : styles.containerMobile,
        { minHeight: sectionHeight },
      ]}
    >
      {/* Left side — Text content */}
      <View style={[styles.textSide, isDesktop && styles.textSideDesktop]}>
        <Text
          variant="hero"
          weight="bold"
          style={[
            styles.headline,
            isDesktop ? styles.headlineDesktop : styles.headlineMobile,
          ]}
        >
          Know what{'\n'}you eat.
        </Text>

        <Text
          variant="heading4"
          weight="regular"
          style={styles.subheadline}
        >
          Snap a photo. Get instant nutrition.{'\n'}No barcode scanning, no manual search.
        </Text>

        <View style={styles.ctaRow}>
          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaPressed,
            ]}
          >
            <Text variant="body" weight="bold" style={styles.ctaText}>
              Get Started — It's Free
            </Text>
          </Pressable>

          <Pressable onPress={onLogin}>
            <Text variant="body" weight="semibold" style={styles.loginLink}>
              Log in to see your progress
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Right side — Illustration */}
      <View style={[styles.illustrationSide, isDesktop && styles.illustrationSideDesktop]}>
        <Image
          source={heroIllustration}
          style={[
            styles.heroImage,
            isDesktop ? styles.heroImageDesktop : styles.heroImageMobile,
          ]}
          contentFit="contain"
        />
      </View>
    </View>
  );
}

const SERIF_FONT = 'Georgia, "Times New Roman", serif';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing['2xl'],
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
  },
  containerMobile: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },
  textSide: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  textSideDesktop: {
    paddingRight: spacing['3xl'],
  },
  headline: {
    color: BRAND_COLORS.textPrimary,
    fontFamily: SERIF_FONT,
  },
  headlineDesktop: {
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
  },
  headlineMobile: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.5,
  },
  subheadline: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 20,
    lineHeight: 30,
  },
  ctaRow: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  ctaButton: {
    backgroundColor: BRAND_COLORS.textPrimary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginLink: {
    color: BRAND_COLORS.textPrimary,
    textDecorationLine: 'underline',
  },
  illustrationSide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationSideDesktop: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
  },
  heroImageDesktop: {
    height: 500,
  },
  heroImageMobile: {
    height: 320,
  },
});

export default HeroSection;
