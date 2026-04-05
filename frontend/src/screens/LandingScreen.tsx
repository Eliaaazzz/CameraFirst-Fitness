/**
 * LandingScreen — Uber-inspired marketing landing page (web only)
 *
 * Layout pattern:
 * 1. Hero section — bold headline + CTA left, illustration right
 * 2. Feature discovery grid — 3×2 cards (Uber "Discover what you can do")
 * 3. How It Works — colored card + benefits list (Uber "Plan for later")
 * 4. Stats bar — social proof numbers
 * 5. CTA footer — "Get Started" + login link
 *
 * Inspired by: Uber homepage (uber.com/au/en)
 */

import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AuraMark, Text } from '@/components';
import { BRAND_COLORS, radii, spacing, typography } from '@/utils';

// ---------------------------------------------------------------------------
// Illustrations (local SVG assets)
// ---------------------------------------------------------------------------
const illustrations = {
  hero: require('@/../assets/illustrations/hero-healthy-eating.svg'),
  cooking: require('@/../assets/illustrations/cooking.svg'),
  fitnessStats: require('@/../assets/illustrations/fitness-stats.svg'),
  healthyHabit: require('@/../assets/illustrations/healthy-habit.svg'),
  fitnessTracker: require('@/../assets/illustrations/fitness-tracker.svg'),
  chef: require('@/../assets/illustrations/chef.svg'),
  dataTrends: require('@/../assets/illustrations/data-trends.svg'),
  fruitSalad: require('@/../assets/illustrations/fruit-salad.svg'),
};

// ---------------------------------------------------------------------------
// Feature card data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    title: 'AI Meal Scan',
    description: 'Snap a photo, get instant calories and macros. No barcode needed.',
    illustration: illustrations.cooking,
  },
  {
    title: 'Daily Health Score',
    description: 'One number (0–100) that tells you how your day is going.',
    illustration: illustrations.fitnessStats,
  },
  {
    title: 'Streak Tracking',
    description: 'Build daily habits with 5-tier milestone badges.',
    illustration: illustrations.healthyHabit,
  },
  {
    title: 'Smart Goals',
    description: 'AI-generated calorie and macro targets personalised to you.',
    illustration: illustrations.fitnessTracker,
  },
  {
    title: 'Recipe Discovery',
    description: 'Find healthy recipes that match your nutrition goals.',
    illustration: illustrations.chef,
  },
  {
    title: 'Weekly Insights',
    description: 'See trends, spot patterns, and improve week over week.',
    illustration: illustrations.dataTrends,
  },
];

const BENEFITS = [
  { icon: '📷', text: 'No barcode scanning — just point and shoot' },
  { icon: '⚡', text: 'Results in under 3 seconds' },
  { icon: '🎯', text: 'AI learns your portions over time' },
  { icon: '🔒', text: 'Your data stays private — always' },
];

const STATS = [
  { value: '50,000+', label: 'Meals scanned' },
  { value: '4.8 ★', label: 'App Store rating' },
  { value: '100%', label: 'Free core features' },
];

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function NavBar({ onLogin, onGetStarted }: { onLogin: () => void; onGetStarted: () => void }) {
  return (
    <View style={navStyles.bar}>
      <View style={navStyles.left}>
        <AuraMark size={32} />
        <Text variant="heading3" weight="bold" style={navStyles.brand}>
          Metriful
        </Text>
      </View>
      <View style={navStyles.right}>
        <Pressable onPress={onLogin} style={navStyles.loginBtn}>
          <Text variant="body" weight="semibold" style={navStyles.loginText}>
            Log in
          </Text>
        </Pressable>
        <Pressable onPress={onGetStarted} style={navStyles.signupBtn}>
          <Text variant="body" weight="semibold" style={navStyles.signupText}>
            Sign up
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function FeatureCard({
  title,
  description,
  illustration,
  index,
}: {
  title: string;
  description: string;
  illustration: any;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(index * 100)}
      style={featureStyles.card}
    >
      <View style={featureStyles.textSide}>
        <Text variant="heading3" weight="bold" style={featureStyles.title}>
          {title}
        </Text>
        <Text variant="body" style={featureStyles.description}>
          {description}
        </Text>
        <Pressable style={featureStyles.detailsBtn}>
          <Text variant="body" weight="semibold" style={featureStyles.detailsText}>
            Details
          </Text>
        </Pressable>
      </View>
      <Image
        source={illustration}
        style={featureStyles.illustration}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 600 }));
  }, [delay, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[statStyles.item, style]}>
      <Text variant="heading1" weight="bold" style={statStyles.value}>
        {value}
      </Text>
      <Text variant="body" style={statStyles.label}>
        {label}
      </Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const navigateLogin = () => navigation.navigate('Login');
  const navigateSignup = () => navigation.navigate('Register');

  const sectionMaxWidth = Math.min(width - 48, 1200);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Nav Bar ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <NavBar onLogin={navigateLogin} onGetStarted={navigateSignup} />
      </View>

      {/* ── Hero Section ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <View style={[heroStyles.container, isDesktop && heroStyles.containerDesktop]}>
          <Animated.View
            entering={FadeInLeft.duration(600)}
            style={[heroStyles.textSide, isDesktop && heroStyles.textSideDesktop]}
          >
            <Text
              variant="hero"
              weight="bold"
              style={isDesktop
                ? [heroStyles.headline, heroStyles.headlineDesktop]
                : heroStyles.headline
              }
            >
              Know what{'\n'}you eat.
            </Text>
            <Text variant="heading4" style={heroStyles.subheadline}>
              Snap a photo. Get instant nutrition.{'\n'}No barcode scanning, no manual search.
            </Text>
            <View style={heroStyles.ctaRow}>
              <Pressable
                onPress={navigateSignup}
                style={({ pressed }) => [
                  heroStyles.ctaButton,
                  pressed && heroStyles.ctaButtonPressed,
                ]}
              >
                <Text variant="body" weight="bold" style={heroStyles.ctaText}>
                  Get Started — It's Free
                </Text>
              </Pressable>
              <Pressable onPress={navigateLogin}>
                <Text variant="body" weight="semibold" style={heroStyles.loginLink}>
                  Log in to see your progress
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.duration(600).delay(200)}
            style={[heroStyles.illustrationSide, isDesktop && heroStyles.illustrationSideDesktop]}
          >
            <Image
              source={illustrations.hero}
              style={[
                heroStyles.heroImage,
                isDesktop && heroStyles.heroImageDesktop,
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>

      {/* ── Feature Discovery Grid ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text
            variant="heading1"
            weight="bold"
            style={discoverStyles.sectionTitle}
          >
            Discover what Metriful can do
          </Text>
        </Animated.View>

        <View
          style={[
            discoverStyles.grid,
            isDesktop && discoverStyles.gridDesktop,
            isTablet && discoverStyles.gridTablet,
          ]}
        >
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </View>
      </View>

      {/* ── How It Works Deep-Dive ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <Text variant="heading1" weight="bold" style={howStyles.sectionTitle}>
          How it works
        </Text>

        <View style={[howStyles.container, isDesktop && howStyles.containerDesktop]}>
          {/* Colored card with illustration */}
          <Animated.View
            entering={FadeInLeft.duration(500)}
            style={[howStyles.card, isDesktop && howStyles.cardDesktop]}
          >
            <Text variant="heading2" weight="bold" style={howStyles.cardTitle}>
              Point your camera{'\n'}at any meal
            </Text>
            <Text variant="body" style={howStyles.cardSubtitle}>
              Our AI identifies foods, estimates portions, and calculates
              nutrition — all from a single photo.
            </Text>
            <Image
              source={illustrations.fruitSalad}
              style={howStyles.cardIllustration}
              resizeMode="contain"
            />
            <Pressable
              onPress={navigateSignup}
              style={({ pressed }) => [
                howStyles.cardCta,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text variant="body" weight="bold" style={howStyles.cardCtaText}>
                Try it free →
              </Text>
            </Pressable>
          </Animated.View>

          {/* Benefits list */}
          <Animated.View
            entering={FadeInRight.duration(500).delay(200)}
            style={[howStyles.benefits, isDesktop && howStyles.benefitsDesktop]}
          >
            <Text variant="heading3" weight="bold" style={howStyles.benefitsTitle}>
              Why it's better
            </Text>
            {BENEFITS.map((benefit, i) => (
              <View key={i} style={howStyles.benefitRow}>
                <Text style={howStyles.benefitIcon}>{benefit.icon}</Text>
                <Text variant="body" style={howStyles.benefitText}>
                  {benefit.text}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>

      {/* ── Stats Bar ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <View style={[statStyles.container, isDesktop && statStyles.containerDesktop]}>
          {STATS.map((stat, i) => (
            <AnimatedStat key={stat.label} {...stat} delay={i * 150} />
          ))}
        </View>
      </View>

      {/* ── CTA Footer ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <View style={ctaStyles.container}>
          <Text variant="heading1" weight="bold" style={ctaStyles.title}>
            Ready to take control of{'\n'}your nutrition?
          </Text>
          <Text variant="heading4" style={ctaStyles.subtitle}>
            Join thousands tracking smarter — not harder.
          </Text>
          <View style={ctaStyles.buttonRow}>
            <Pressable
              onPress={navigateSignup}
              style={({ pressed }) => [
                ctaStyles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text variant="body" weight="bold" style={ctaStyles.primaryBtnText}>
                Get Started for Free
              </Text>
            </Pressable>
            <Pressable onPress={navigateLogin}>
              <Text variant="body" weight="semibold" style={ctaStyles.secondaryLink}>
                Already have an account? Log in
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={[styles.section, { maxWidth: sectionMaxWidth }]}>
        <View style={footerStyles.container}>
          <View style={footerStyles.brandRow}>
            <AuraMark size={24} />
            <Text variant="body" weight="semibold" style={footerStyles.brandName}>
              Metriful
            </Text>
          </View>
          <Text variant="caption" style={footerStyles.legal}>
            © 2026 Metriful. All rights reserved.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 80,
  },
  section: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
  },
});

// Nav
const navStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
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
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: BRAND_COLORS.textPrimary,
  },
  signupText: {
    color: '#FFFFFF',
  },
});

// Hero
const heroStyles = StyleSheet.create({
  container: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing['2xl'],
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['4xl'],
  },
  textSide: {
    flex: 1,
    gap: spacing.lg,
  },
  textSideDesktop: {
    paddingRight: spacing['3xl'],
  },
  headline: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.5,
  },
  headlineDesktop: {
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
  },
  subheadline: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 18,
    lineHeight: 28,
  },
  ctaRow: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  ctaButton: {
    backgroundColor: BRAND_COLORS.textPrimary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  ctaButtonPressed: {
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
    height: 320,
  },
  heroImageDesktop: {
    height: 480,
  },
});

// Feature Discovery
const discoverStyles = StyleSheet.create({
  sectionTitle: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: spacing['2xl'],
    marginTop: spacing['3xl'],
  },
  grid: {
    gap: spacing.lg,
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  gridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
});

const featureStyles = StyleSheet.create({
  card: {
    backgroundColor: '#F3EDE5',
    borderRadius: radii.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 180,
    // Desktop: 3 columns → ~31% width each
    ...(Platform.OS === 'web' && ({
      flexBasis: 'calc(33.333% - 12px)',
      flexGrow: 0,
      flexShrink: 0,
    } as any)),
  },
  textSide: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 20,
  },
  description: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  detailsText: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  illustration: {
    width: 120,
    height: 120,
  },
});

// How It Works
const howStyles = StyleSheet.create({
  sectionTitle: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    marginBottom: spacing['2xl'],
    marginTop: spacing['4xl'],
  },
  container: {
    gap: spacing.xl,
  },
  containerDesktop: {
    flexDirection: 'row',
    gap: spacing['2xl'],
  },
  card: {
    backgroundColor: BRAND_COLORS.primaryContainer,
    borderRadius: radii['2xl'],
    padding: spacing['2xl'],
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
    height: 220,
    marginVertical: spacing.md,
  },
  cardCta: {
    backgroundColor: BRAND_COLORS.textPrimary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  cardCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    gap: spacing.md,
  },
  benefitIcon: {
    fontSize: 20,
    lineHeight: 28,
  },
  benefitText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
});

// Stats
const statStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['3xl'],
    paddingVertical: spacing['4xl'],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
    marginTop: spacing['3xl'],
  },
  containerDesktop: {
    gap: 120,
  },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 32,
    letterSpacing: -1,
  },
  label: {
    color: BRAND_COLORS.textMuted,
    fontSize: 14,
  },
});

// CTA
const ctaStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.lg,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
  },
  buttonRow: {
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
  secondaryLink: {
    color: BRAND_COLORS.textPrimary,
    textDecorationLine: 'underline',
  },
});

// Footer
const footerStyles = StyleSheet.create({
  container: {
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
