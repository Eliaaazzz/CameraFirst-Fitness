import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, BRAND_COLORS, LANDING_COLORS, radii, spacing } from '@/utils';

const FEATURES = [
  {
    title: 'Meal Logging',
    description: 'Snap a photo and let AI log your calories, protein, carbs, and fat.',
    illustration: require('@/../assets/illustrations/cooking.svg'),
  },
  {
    title: 'Workout Planning',
    description: 'Plan your week with structured sessions and rest days.',
    illustration: require('@/../assets/illustrations/fitness-tracker.svg'),
  },
  {
    title: 'Progress Tracking',
    description: 'See your weight trend, streaks, and weekly progress at a glance.',
    illustration: require('@/../assets/illustrations/fitness-stats.svg'),
  },
  {
    title: 'Targets',
    description: 'Set personalized calorie, macro, and hydration goals powered by AI.',
    illustration: require('@/../assets/illustrations/healthy-habit.svg'),
  },
  {
    title: 'Recipes',
    description: 'Get recipes matched to your calorie and macro targets.',
    illustration: require('@/../assets/illustrations/chef.svg'),
  },
  {
    title: 'Weekly Reports',
    description: 'Review weekly performance and export the numbers you need.',
    illustration: require('@/../assets/illustrations/data-trends.svg'),
  },
];

function FeatureCard({
  title,
  description,
  illustration,
  isDesktop,
  onExplore,
}: {
  title: string;
  description: string;
  illustration: any;
  isDesktop: boolean;
  onExplore: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <View
      style={[
        styles.card,
        isDesktop ? styles.cardDesktop : styles.cardMobile,
        hovered && styles.cardHovered,
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      })}
    >
      <View style={styles.textSide}>
        <Text variant="heading3" weight="bold" style={styles.cardTitle}>
          {title}
        </Text>
        <Text variant="body" style={styles.cardDescription}>
          {description}
        </Text>
        <Pressable onPress={onExplore} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}>
          <Text variant="body" weight="semibold" style={styles.detailsText}>
            Explore
          </Text>
        </Pressable>
      </View>

      <Image source={illustration} style={styles.illustration} contentFit="contain" />
    </View>
  );
}

interface FeatureGridProps {
  onExplore?: () => void;
}

export function FeatureGrid({ onExplore }: FeatureGridProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const handleExplore = onExplore ?? (() => {});

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={isDesktop ? [styles.sectionTitle] : [styles.sectionTitle, styles.sectionTitleMobile]}
      >
        Discover what you can do with {APP_NAME}
      </Text>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View
            key={feature.title}
            style={[
              styles.cardWrapper,
              isDesktop ? styles.cardWrapperDesktop : styles.cardWrapperMobile,
            ]}
          >
            <FeatureCard
              title={feature.title}
              description={feature.description}
              illustration={feature.illustration}
              isDesktop={isDesktop}
              onExplore={handleExplore}
            />
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
    color: LANDING_COLORS.text,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
    marginBottom: spacing['2xl'],
  },
  sectionTitleMobile: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  cardWrapper: {},
  cardWrapperDesktop: {
    width: 'calc(33.333% - 11px)' as any,
    minHeight: 236,
  },
  cardWrapperMobile: {
    width: '100%',
  },
  card: {
    backgroundColor: LANDING_COLORS.surface,
    borderRadius: radii['2xl'],
    padding: 24,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    height: '100%',
    ...(Platform.OS === 'web' && ({
      transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
    } as any)),
  },
  cardHovered: {
    ...(Platform.OS === 'web' && ({
      transform: [{ translateY: -4 }],
      boxShadow: '0 12px 28px rgba(17,17,17,0.08)',
    } as any)),
  },
  cardDesktop: {
    minHeight: 236,
  },
  cardMobile: {
    minHeight: 220,
  },
  textSide: {
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: LANDING_COLORS.text,
    fontSize: 24,
    lineHeight: 28,
  },
  cardDescription: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: LANDING_COLORS.pillBg,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: LANDING_COLORS.border,
  },
  detailsText: {
    color: LANDING_COLORS.text,
  },
  pressed: {
    opacity: 0.82,
  },
  illustration: {
    width: 132,
    height: 132,
    alignSelf: 'flex-end',
  },
});

export default FeatureGrid;
