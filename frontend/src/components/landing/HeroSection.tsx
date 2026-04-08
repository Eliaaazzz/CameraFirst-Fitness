/**
 * HeroSection — Uber.com hero layout.
 *
 * Left: headline + body + CTA row.
 * Right: Large colorful illustration (Uber uses a big image here).
 * Below: metric chips.
 */
import { ArrowRight } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, spacing } from '@/utils';

const heroIllustration = require('@/../assets/illustrations/hero-healthy-eating.svg');

interface HeroSectionProps {
  title?: string;
  body?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  onGetStarted: () => void;
  onLogin: () => void;
}

export function HeroSection({
  title = `Track meals,\nclose rings,\nown your day`,
  body = `${APP_NAME} turns meal photos into macro breakdowns, builds personalized targets, and surfaces your progress through vivid daily rings.`,
  primaryCtaLabel = 'Start tracking',
  secondaryCtaLabel = 'Log in to see your recent activity',
  onGetStarted,
  onLogin,
}: HeroSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isCompact = width < 420;

  return (
    <View style={[styles.container, !isDesktop && styles.containerMobile, isDesktop && styles.containerDesktop]}>
      {/* ── LEFT: Copy ── */}
      <View style={[styles.copyColumn, isDesktop && styles.copyColumnDesktop]}>
        <Text style={isDesktop ? styles.headline : isCompact ? [styles.headline, styles.headlineMobile, styles.headlineCompact] : [styles.headline, styles.headlineMobile]}>
          {title}
        </Text>

        <Text style={isCompact ? [styles.body, styles.bodyCompact] : styles.body}>
          {body}
        </Text>

        <View style={styles.ctaRow}>
          <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryCtaText}>{primaryCtaLabel}</Text>
            <ArrowRight size={16} weight="bold" color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable onPress={onLogin} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.loginLink}>{secondaryCtaLabel}</Text>
        </Pressable>
      </View>

      {/* ── RIGHT: Illustration (Uber uses a large colorful image) ── */}
      <View style={[styles.visualColumn, isDesktop && styles.visualColumnDesktop]}>
        <View style={[styles.imageCard, !isDesktop && styles.imageCardMobile, isCompact && styles.imageCardCompact]}>
          <Image
            source={heroIllustration}
            style={[styles.heroImage, !isDesktop && styles.heroImageMobile, isCompact && styles.heroImageCompact]}
            contentFit="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 32,
    paddingTop: 64,
    paddingBottom: 80,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
  },
  containerMobile: {
    gap: 24,
    paddingTop: 40,
    paddingBottom: 56,
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 48,
  },

  // ── Copy Column ──
  copyColumn: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  copyColumnDesktop: {
    maxWidth: 540,
  },
  headline: {
    color: '#000000',
    fontSize: 52,
    fontWeight: '700',
    lineHeight: 58,
    letterSpacing: -2.5,
  },
  headlineMobile: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.6,
  },
  headlineCompact: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  body: {
    color: '#6B6B6B',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 480,
  },
  bodyCompact: {
    fontSize: 17,
    lineHeight: 26,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 8,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // ── Visual Column ──
  visualColumn: {
    flex: 1,
  },
  visualColumnDesktop: {
    flex: 1,
    maxWidth: 560,
  },
  imageCard: {
    backgroundColor: '#FFF1E6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
  },
  imageCardMobile: {
    minHeight: 300,
    padding: 18,
  },
  imageCardCompact: {
    minHeight: 268,
    padding: 16,
  },
  heroImage: {
    width: '100%',
    height: 340,
  },
  heroImageMobile: {
    height: 250,
  },
  heroImageCompact: {
    height: 220,
  },
});

export default HeroSection;
