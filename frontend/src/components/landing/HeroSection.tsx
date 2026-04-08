import { ArrowRight, Drop, Fire, Target } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, EXPERIENCE_COLORS, radii, spacing } from '@/utils';

const heroIllustration = require('@/../assets/illustrations/brand-motion-coach.svg');
const mascotIcon = require('@/../assets/app-icon-1024-transparent.png');
const NAV_HEIGHT = 96;

interface HeroSectionProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  onGetStarted: () => void;
  onLogin: () => void;
}

const HERO_METRICS = [
  { label: 'Move Rings', value: '87%', Icon: Fire, tone: '#FFE2D5' },
  { label: 'Protein', value: '128g', Icon: Target, tone: '#DDF9D3' },
  { label: 'Hydration', value: '6 cups', Icon: Drop, tone: '#DDF1FF' },
] as const;

export function HeroSection({
  eyebrow = 'AURA COACH',
  title = `Bright daily coaching for food, rings, and recovery`,
  body = `Built for mobile first. ${APP_NAME} turns meal photos, training targets, and weekly progress into one vivid daily flow.`,
  primaryCtaLabel = 'Start tracking',
  secondaryCtaLabel = 'See your account',
  onGetStarted,
  onLogin,
}: HeroSectionProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 720;

  return (
    <View
      style={[
        styles.container,
        isDesktop ? styles.containerDesktop : styles.containerMobile,
        isDesktop ? { minHeight: Math.max(720, height - NAV_HEIGHT) } : null,
      ]}
    >
      <View style={[styles.copyColumn, isDesktop && styles.copyColumnDesktop]}>
        <View style={styles.eyebrowBadge}>
          <Image source={mascotIcon} style={styles.eyebrowIcon} contentFit="contain" />
          <Text variant="label" weight="bold" style={styles.eyebrow}>
            {eyebrow}
          </Text>
        </View>

        <Text
          variant="hero"
          weight="bold"
          style={[styles.headline, isDesktop ? styles.headlineDesktop : styles.headlineMobile]}
        >
          {title}
        </Text>

        <Text variant="heading4" style={isDesktop ? styles.body : [styles.body, styles.bodyMobile]}>
          {body}
        </Text>

        <View style={styles.metricRail}>
          {HERO_METRICS.map((metric) => (
            <View key={metric.label} style={styles.metricChip}>
              <View style={[styles.metricIcon, { backgroundColor: metric.tone }]}>
                <metric.Icon size={16} weight="bold" color={EXPERIENCE_COLORS.ink} />
              </View>
              <View>
                <Text variant="caption" weight="medium" style={styles.metricLabel}>
                  {metric.label}
                </Text>
                <Text variant="body" weight="bold" style={styles.metricValue}>
                  {metric.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.ctaRow, !isTablet && styles.ctaRowMobile]}>
          <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.primaryCta, pressed && styles.ctaPressed]}>
            <View style={styles.primaryCtaFill}>
              <Text variant="body" weight="bold" style={styles.primaryCtaText}>
                {primaryCtaLabel}
              </Text>
              <ArrowRight size={16} weight="bold" color="#FFFFFF" />
            </View>
          </Pressable>

          <Pressable onPress={onLogin} style={({ pressed }) => [styles.secondaryCta, pressed && styles.linkPressed]}>
            <Text variant="body" weight="semibold" style={styles.secondaryCtaText}>
              {secondaryCtaLabel}
            </Text>
          </Pressable>
        </View>

        <View style={styles.storyCard}>
          <Text variant="caption" weight="bold" style={styles.storyLabel}>
            MOBILE-FIRST FLOW
          </Text>
          <Text variant="body" style={styles.storyText}>
            Snap a plate, hit your rings, and review the week without jumping between separate tools.
          </Text>
        </View>
      </View>

      <View style={[styles.visualColumn, isDesktop && styles.visualColumnDesktop]}>
        <View style={styles.visualShell}>
          <View style={styles.routeChip}>
            <Text variant="caption" weight="bold" style={styles.routeChipText}>
              Today&apos;s momentum
            </Text>
          </View>

          <View style={styles.phoneStage}>
            <View style={styles.phoneShell}>
              <Image source={heroIllustration} style={styles.heroArt} contentFit="contain" />
            </View>
          </View>

          <View style={[styles.insightRail, !isDesktop && styles.insightRailMobile]}>
            <View style={styles.insightCard}>
              <Text variant="caption" weight="bold" style={styles.insightLabel}>
                FAST START
              </Text>
              <Text variant="heading4" weight="bold" style={styles.insightTitle}>
                Camera to log in one tap
              </Text>
              <Text variant="caption" style={styles.insightBody}>
                Built to feel immediate on mobile, not like a shrunken web dashboard.
              </Text>
            </View>

            <View style={[styles.insightCard, styles.insightCardDark]}>
              <Text variant="caption" weight="bold" style={styles.insightLabelDark}>
                APPLE FITNESS ENERGY
              </Text>
              <Text variant="heading4" weight="bold" style={styles.insightTitleDark}>
                Bright rings, crisp goals
              </Text>
              <Text variant="caption" style={styles.insightBodyDark}>
                Progress gets surfaced with color, contrast, and stronger hierarchy.
              </Text>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.06)',
    backgroundColor: '#FFFFFF',
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
    zIndex: 1,
  },
  copyColumnDesktop: {
    paddingRight: spacing['2xl'],
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: EXPERIENCE_COLORS.glassStrong,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  eyebrowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  eyebrow: {
    color: EXPERIENCE_COLORS.ink,
    letterSpacing: 1.3,
  },
  headline: {
    color: EXPERIENCE_COLORS.ink,
    maxWidth: 620,
  },
  headlineDesktop: {
    fontSize: 76,
    lineHeight: 80,
    letterSpacing: -3,
  },
  headlineMobile: {
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.8,
  },
  body: {
    maxWidth: 560,
    color: EXPERIENCE_COLORS.inkSoft,
    fontSize: 22,
    lineHeight: 34,
  },
  bodyMobile: {
    fontSize: 18,
    lineHeight: 30,
  },
  metricRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metricChip: {
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: EXPERIENCE_COLORS.glass,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: EXPERIENCE_COLORS.inkSoft,
  },
  metricValue: {
    color: EXPERIENCE_COLORS.ink,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  ctaRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  primaryCta: {
    borderRadius: 24,
    overflow: 'hidden',
    ...(typeof document !== 'undefined'
      ? ({ boxShadow: '0 14px 28px rgba(17,17,17,0.10)' } as any)
      : {
          shadowColor: '#111111',
          shadowOffset: { width: 0, height: 12 },
          shadowRadius: 20,
          shadowOpacity: 0.1,
          elevation: 8,
        }),
  },
  primaryCtaFill: {
    minHeight: 58,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#111111',
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryCta: {
    minHeight: 58,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EXPERIENCE_COLORS.glass,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  secondaryCtaText: {
    color: EXPERIENCE_COLORS.ink,
    fontSize: 16,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  linkPressed: {
    opacity: 0.72,
  },
  storyCard: {
    marginTop: spacing.sm,
    maxWidth: 510,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 28,
    backgroundColor: '#111111',
    ...(typeof document !== 'undefined' ? ({ boxShadow: '0 18px 40px rgba(17,17,17,0.12)' } as any) : {}),
  },
  storyLabel: {
    color: '#D8E5FF',
  },
  storyText: {
    color: '#F5F9FF',
    lineHeight: 26,
  },
  visualColumn: {
    flex: 1,
    zIndex: 1,
  },
  visualColumnDesktop: {
    minWidth: 500,
  },
  visualShell: {
    gap: spacing.lg,
  },
  routeChip: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  routeChipText: {
    color: EXPERIENCE_COLORS.ink,
  },
  phoneStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  phoneShell: {
    width: '100%',
    maxWidth: 430,
    padding: 18,
    borderRadius: 34,
    backgroundColor: EXPERIENCE_COLORS.glassStrong,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.strokeStrong,
    ...(typeof document !== 'undefined'
      ? ({ boxShadow: '0 28px 54px rgba(26,60,109,0.16)' } as any)
      : {
          shadowColor: EXPERIENCE_COLORS.shadow,
          shadowOffset: { width: 0, height: 24 },
          shadowRadius: 32,
          shadowOpacity: 0.16,
          elevation: 12,
        }),
  },
  heroArt: {
    width: '100%',
    height: 420,
  },
  insightRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  insightRailMobile: {
    flexDirection: 'column',
  },
  insightCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 26,
    backgroundColor: EXPERIENCE_COLORS.glassStrong,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
  },
  insightCardDark: {
    backgroundColor: '#F6F4EF',
    borderColor: 'rgba(17,17,17,0.06)',
  },
  insightLabel: {
    color: EXPERIENCE_COLORS.inkSoft,
  },
  insightTitle: {
    color: EXPERIENCE_COLORS.ink,
  },
  insightBody: {
    color: EXPERIENCE_COLORS.inkSoft,
  },
  insightLabelDark: {
    color: EXPERIENCE_COLORS.inkSoft,
  },
  insightTitleDark: {
    color: EXPERIENCE_COLORS.ink,
  },
  insightBodyDark: {
    color: EXPERIENCE_COLORS.inkSoft,
  },
});

export default HeroSection;
