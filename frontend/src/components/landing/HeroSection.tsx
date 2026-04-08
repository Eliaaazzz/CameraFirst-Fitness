/**
 * HeroSection — Landing page hero.
 *
 * Left: headline + metrics + CTA.
 * Right: CSS product preview (dark dashboard mockup) — no external illustration.
 *
 * Inspired by: Linear, Whoop, Noom landing heroes.
 */
import { ArrowRight, Drop, Fire, Target } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, EXPERIENCE_COLORS, radii, spacing } from '@/utils';

const appLogo = require('@/../assets/app-icon-1024-transparent.png');
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
  eyebrow = 'METRIFUL',
  title = `Track meals, close rings, own your day`,
  body = `${APP_NAME} turns meal photos into macro breakdowns, builds personalized targets, and surfaces your progress through vivid daily rings.`,
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
        isDesktop ? { minHeight: Math.max(680, height - NAV_HEIGHT) } : null,
      ]}
    >
      {/* ── COPY COLUMN ── */}
      <View style={[styles.copyColumn, isDesktop && styles.copyColumnDesktop]}>
        <View style={styles.eyebrowBadge}>
          <Image source={appLogo} style={styles.eyebrowIcon} contentFit="contain" />
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
      </View>

      {/* ── PRODUCT PREVIEW ── */}
      <View style={[styles.visualColumn, isDesktop && styles.visualColumnDesktop]}>
        <ProductPreview />
      </View>
    </View>
  );
}

// ============================================================================
// PRODUCT PREVIEW — Static dark dashboard mockup (replaces illustration)
// ============================================================================

const PREVIEW_METRICS = [
  { label: 'Calories', current: 1420, target: 2000, pct: 71, color: '#F97316' },
  { label: 'Protein', current: 85, target: 140, pct: 61, color: '#2F7A6A', unit: 'g' },
  { label: 'Carbs', current: 178, target: 275, pct: 65, color: '#8A9B4F', unit: 'g' },
  { label: 'Fat', current: 52, target: 78, pct: 67, color: '#F59E0B', unit: 'g' },
];

function ProductPreview() {
  return (
    <View style={pv.card}>
      {/* Header */}
      <View style={pv.header}>
        <View style={pv.dotRow}>
          <View style={[pv.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[pv.dot, { backgroundColor: '#FEBC2E' }]} />
          <View style={[pv.dot, { backgroundColor: '#28C840' }]} />
        </View>
        <Text style={pv.headerTitle}>{APP_NAME}</Text>
      </View>

      {/* Score */}
      <View style={pv.scoreSection}>
        <View style={pv.scoreCircle}>
          <Text style={pv.scoreNumber}>87</Text>
        </View>
        <View style={pv.scoreMeta}>
          <Text style={pv.scoreLabel}>Daily Score</Text>
          <View style={pv.scoreBadge}>
            <Text style={pv.scoreBadgeText}>Excellent</Text>
          </View>
        </View>
      </View>

      {/* Metric bars */}
      <View style={pv.metricsSection}>
        {PREVIEW_METRICS.map((m) => (
          <View key={m.label} style={pv.metricRow}>
            <View style={pv.metricMeta}>
              <View style={[pv.metricDot, { backgroundColor: m.color }]} />
              <Text style={pv.metricLabel}>{m.label}</Text>
              <Text style={pv.metricValue}>
                {m.current}{m.unit || ''}/{m.target}{m.unit || ''}
              </Text>
            </View>
            <View style={pv.metricTrack}>
              <View style={[pv.metricFill, { width: `${m.pct}%`, backgroundColor: m.color }]} />
            </View>
          </View>
        ))}
      </View>

      {/* Bottom stats */}
      <View style={pv.bottomRow}>
        <View style={pv.bottomStat}>
          <Text style={pv.bottomStatValue}>5/8</Text>
          <Text style={pv.bottomStatLabel}>cups water</Text>
        </View>
        <View style={pv.bottomStat}>
          <Text style={pv.bottomStatValue}>12d</Text>
          <Text style={pv.bottomStatLabel}>streak</Text>
        </View>
        <View style={pv.bottomStat}>
          <Text style={pv.bottomStatValue}>3/4</Text>
          <Text style={pv.bottomStatLabel}>tasks done</Text>
        </View>
      </View>
    </View>
  );
}

const pv = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 28,
    padding: 28,
    gap: 24,
    ...(typeof document !== 'undefined'
      ? ({ boxShadow: '0 32px 64px rgba(17,17,17,0.18)' } as any)
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreMeta: {
    gap: 6,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  scoreBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsSection: {
    gap: 14,
  },
  metricRow: {
    gap: 6,
  },
  metricMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  metricTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden' as const,
  },
  metricFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  bottomStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingTop: 12,
  },
  bottomStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
  },
});

// ============================================================================
// MAIN STYLES
// ============================================================================

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
    maxWidth: 560,
  },
  headlineDesktop: {
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2.8,
  },
  headlineMobile: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.6,
  },
  body: {
    maxWidth: 520,
    color: EXPERIENCE_COLORS.inkSoft,
    fontSize: 20,
    lineHeight: 32,
  },
  bodyMobile: {
    fontSize: 17,
    lineHeight: 28,
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
  visualColumn: {
    flex: 1,
    zIndex: 1,
  },
  visualColumnDesktop: {
    maxWidth: 480,
  },
});

export default HeroSection;
