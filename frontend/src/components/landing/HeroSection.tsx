import { ArrowRight, Quotes } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, BRAND_COLORS, LANDING_COLORS, radii, spacing } from '@/utils';

const heroIllustration = require('@/../assets/illustrations/hero-healthy-eating.svg');
const panelIllustration = require('@/../assets/illustrations/fitness-stats.svg');
const mascotIcon = require('@/../assets/app-icon-1024-transparent.png');
const NAV_HEIGHT = 88;

interface HeroSectionProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  onGetStarted: () => void;
  onLogin: () => void;
}

export function HeroSection({
  eyebrow = 'FITNESS PLATFORM',
  title = `Train, eat, and progress with ${APP_NAME}`,
  body = 'Plan workouts, log meals, and review your numbers in one place. Free to start — no credit card required.',
  primaryCtaLabel = 'Start tracking',
  secondaryCtaLabel = 'Log in to your account',
  onGetStarted,
  onLogin,
}: HeroSectionProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View
      style={[
        styles.container,
        isDesktop ? styles.containerDesktop : styles.containerMobile,
        { minHeight: height - NAV_HEIGHT },
      ]}
    >
      <View style={[styles.copyColumn, isDesktop && styles.copyColumnDesktop]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBadge}>
            <Image source={mascotIcon} style={styles.eyebrowIcon} contentFit="contain" />
            <Text variant="label" weight="bold" style={styles.eyebrow}>
              {eyebrow}
            </Text>
          </View>
        </View>

        <Text
          variant="hero"
          weight="bold"
          style={[styles.headline, isDesktop ? styles.headlineDesktop : styles.headlineMobile]}
        >
          {title}
        </Text>

        <Text variant="heading4" style={styles.body}>
          {body}
        </Text>

        <View style={styles.ctaRow}>
          <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.primaryCta, pressed && styles.ctaPressed]}>
            <Text variant="body" weight="bold" style={styles.primaryCtaText}>
              {primaryCtaLabel}
            </Text>
          </Pressable>

          <Pressable onPress={onLogin} style={({ pressed }) => [styles.secondaryCta, pressed && styles.linkPressed]}>
            <Text variant="body" weight="medium" style={styles.secondaryCtaText}>
              {secondaryCtaLabel}
            </Text>
          </Pressable>
        </View>

        <View style={styles.testimonialCard}>
          <Quotes size={18} weight="fill" color={LANDING_COLORS.text} />
          <Text variant="body" style={styles.testimonialText}>
            "Finally a fitness app that makes weekly planning and daily logging feel connected."
          </Text>
          <Text variant="caption" weight="semibold" style={styles.testimonialMeta}>
            Elia
          </Text>
        </View>
      </View>

      <View style={[styles.visualColumn, isDesktop && styles.visualColumnDesktop]}>
        <View style={[styles.visualPanel, !isDesktop && styles.visualPanelMobile]}>
          <Image source={heroIllustration} style={[styles.heroArt, !isDesktop && styles.heroArtMobile]} contentFit="contain" />

          <View style={styles.overlayCard}>
            <View style={styles.overlayCopy}>
              <Text variant="heading4" weight="bold" style={styles.overlayTitle}>
                Ready to build today?
              </Text>
              <Text variant="caption" style={styles.overlayBody}>
                Turn meals, workouts, and targets into one daily plan.
              </Text>
            </View>

            <View style={styles.overlayAction}>
              <Image source={panelIllustration} style={styles.overlayThumb} contentFit="contain" />
              <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.overlayPill, pressed && styles.linkPressed]}>
                <Text variant="body" weight="bold" style={styles.overlayPillText}>
                  Build plan
                </Text>
                <ArrowRight size={16} weight="bold" color={LANDING_COLORS.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing['2xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerMobile: {
    flexDirection: 'column',
  },
  copyColumn: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  copyColumnDesktop: {
    paddingRight: spacing['3xl'],
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    color: BRAND_COLORS.textMuted,
    letterSpacing: 1.4,
  },
  eyebrowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  headline: {
    color: LANDING_COLORS.text,
    maxWidth: 620,
  },
  headlineDesktop: {
    fontSize: 74,
    lineHeight: 78,
    letterSpacing: -2.8,
  },
  headlineMobile: {
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1.5,
  },
  body: {
    maxWidth: 520,
    color: BRAND_COLORS.textSecondary,
    fontSize: 22,
    lineHeight: 34,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  primaryCta: {
    backgroundColor: LANDING_COLORS.ctaBg,
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: radii.md,
  },
  primaryCtaText: {
    color: LANDING_COLORS.ctaText,
    fontSize: 16,
  },
  secondaryCta: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: LANDING_COLORS.borderLink,
  },
  secondaryCtaText: {
    color: LANDING_COLORS.text,
    fontSize: 16,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  linkPressed: {
    opacity: 0.72,
  },
  testimonialCard: {
    marginTop: spacing.lg,
    maxWidth: 480,
    backgroundColor: LANDING_COLORS.bg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    borderRadius: radii.xl,
    padding: 18,
    gap: spacing.xs,
  },
  testimonialText: {
    color: LANDING_COLORS.text,
    lineHeight: 26,
  },
  testimonialMeta: {
    color: BRAND_COLORS.textMuted,
  },
  visualColumn: {
    flex: 1,
  },
  visualColumnDesktop: {
    minWidth: 500,
  },
  visualPanel: {
    backgroundColor: LANDING_COLORS.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: spacing.xl,
    minHeight: 580,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  visualPanelMobile: {
    minHeight: 460,
  },
  heroArt: {
    width: '100%',
    height: 420,
  },
  heroArtMobile: {
    height: 280,
  },
  overlayCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: LANDING_COLORS.accent.warm,
    borderRadius: 22,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  overlayCopy: {
    flex: 1,
    minWidth: 220,
  },
  overlayTitle: {
    color: LANDING_COLORS.textOnDark,
    marginBottom: 4,
  },
  overlayBody: {
    color: LANDING_COLORS.textOnDarkMuted,
    maxWidth: 340,
  },
  overlayAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayThumb: {
    width: 72,
    height: 72,
  },
  overlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: LANDING_COLORS.pillBg,
    borderRadius: radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  overlayPillText: {
    color: LANDING_COLORS.pillText,
  },
});

export default HeroSection;
