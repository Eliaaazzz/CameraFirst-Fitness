/**
 * FeatureGrid — 3x2 feature discovery cards
 *
 * Inspired by: Uber homepage "Discover what you can do" section —
 * warm-toned cards with illustration + text + pill CTA.
 *
 * Desktop: 3 columns. Mobile: single column stack.
 */

import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

const FEATURES = [
  {
    title: 'AI Meal Scan',
    description: 'Snap a photo, get instant calories and macros.',
    illustration: require('@/../assets/illustrations/cooking.svg'),
  },
  {
    title: 'Daily Health Score',
    description: 'One number (0\u2013100) that tells you how your day is going.',
    illustration: require('@/../assets/illustrations/fitness-stats.svg'),
  },
  {
    title: 'Streak Tracking',
    description: 'Build daily habits with 5-tier milestone badges.',
    illustration: require('@/../assets/illustrations/healthy-habit.svg'),
  },
  {
    title: 'Smart Goals',
    description: 'AI-generated calorie and macro targets personalised to you.',
    illustration: require('@/../assets/illustrations/fitness-tracker.svg'),
  },
  {
    title: 'Recipe Discovery',
    description: 'Find healthy recipes that match your nutrition goals.',
    illustration: require('@/../assets/illustrations/chef.svg'),
  },
  {
    title: 'Weekly Insights',
    description: 'See trends, spot patterns, and improve week over week.',
    illustration: require('@/../assets/illustrations/data-trends.svg'),
  },
];

const SERIF_FONT = 'Georgia, "Times New Roman", serif';

export function FeatureGrid() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={styles.sectionTitle}
      >
        Discover what Metriful can do
      </Text>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View
            key={feature.title}
            style={[
              styles.cardWrapper,
              { width: isDesktop ? ('calc(33.333% - 11px)' as any) : '100%' },
            ]}
          >
            <View style={styles.card}>
              <View style={styles.textSide}>
                <Text variant="heading3" weight="bold" style={styles.cardTitle}>
                  {feature.title}
                </Text>
                <Text variant="body" style={styles.cardDescription}>
                  {feature.description}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.detailsBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text variant="body" weight="semibold" style={styles.detailsText}>
                    Details
                  </Text>
                </Pressable>
              </View>

              <Image
                source={feature.illustration}
                style={styles.illustration}
                contentFit="contain"
              />
            </View>
          </View>
        ))}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrapper: {},
  card: {
    backgroundColor: '#F3EDE5',
    borderRadius: radii.xl,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 200,
  },
  textSide: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  cardTitle: {
    color: BRAND_COLORS.textPrimary,
  },
  cardDescription: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  detailsText: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  illustration: {
    width: 140,
    height: 140,
  },
});

export default FeatureGrid;
