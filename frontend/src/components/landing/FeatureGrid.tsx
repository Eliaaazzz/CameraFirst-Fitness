import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME, EXPERIENCE_COLORS, radii, spacing } from '@/utils';

const FEATURES = [
  {
    title: 'Meal Logging',
    description: 'Open the camera fast, review the result, and save a meal without breaking your flow.',
    illustration: require('@/../assets/illustrations/cooking.svg'),
    tint: '#FFF1E6',
  },
  {
    title: 'Workout Planning',
    description: 'Build a week that balances strength, cardio, and recovery instead of isolated checklists.',
    illustration: require('@/../assets/illustrations/fitness-tracker.svg'),
    tint: '#E8F4FF',
  },
  {
    title: 'Progress Tracking',
    description: 'Use clearer rings, streaks, and weekly snapshots to understand momentum at a glance.',
    illustration: require('@/../assets/illustrations/fitness-stats.svg'),
    tint: '#EDFDE5',
  },
  {
    title: 'Targets',
    description: 'Generate calorie, macro, and hydration targets that feel tailored instead of generic.',
    illustration: require('@/../assets/illustrations/healthy-habit.svg'),
    tint: '#FFF6CF',
  },
  {
    title: 'Recipes',
    description: 'Browse meals that actually fit your goal instead of forcing workarounds later in the day.',
    illustration: require('@/../assets/illustrations/chef.svg'),
    tint: '#FFE5EF',
  },
  {
    title: 'Weekly Reports',
    description: 'Pull together adherence, nutrition balance, and trend data in one reviewable page.',
    illustration: require('@/../assets/illustrations/data-trends.svg'),
    tint: '#E6F9FF',
  },
] as const;

function FeatureCard({
  title,
  description,
  illustration,
  tint,
  isDesktop,
  onExplore,
}: {
  title: string;
  description: string;
  illustration: any;
  tint: string;
  isDesktop: boolean;
  onExplore: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: hovered && Platform.OS === 'web' ? '#FFFFFF' : EXPERIENCE_COLORS.glassStrong },
        hovered && styles.cardHovered,
      ]}
      {...(Platform.OS === 'web' && {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      })}
    >
      <View style={[styles.illustrationWrap, { backgroundColor: tint }]}>
        <Image source={illustration} style={isDesktop ? styles.illustrationDesktop : styles.illustrationMobile} contentFit="contain" />
      </View>

      <View style={styles.textSide}>
        <View style={styles.copyStack}>
          <Text variant="heading3" weight="bold" style={styles.cardTitle}>
            {title}
          </Text>
          <Text variant="body" style={styles.cardDescription}>
            {description}
          </Text>
        </View>

        <Pressable onPress={onExplore} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}>
          <Text variant="body" weight="semibold" style={styles.detailsText}>
            Explore
          </Text>
        </Pressable>
      </View>
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
      <Text variant="heading4" style={styles.subtitle}>
        A brighter mobile flow for logging, planning, and reviewing progress in one product.
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
              tint={feature.tint}
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
    color: EXPERIENCE_COLORS.ink,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -2,
    marginBottom: spacing.md,
  },
  sectionTitleMobile: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  subtitle: {
    color: EXPERIENCE_COLORS.inkSoft,
    marginBottom: spacing['2xl'],
    maxWidth: 720,
    fontSize: 19,
    lineHeight: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  cardWrapper: {},
  cardWrapperDesktop: {
    width: 'calc(33.333% - 11px)' as any,
  },
  cardWrapperMobile: {
    width: '100%',
  },
  card: {
    height: '100%',
    gap: spacing.md,
    padding: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
    ...(typeof document !== 'undefined'
      ? ({ boxShadow: '0 20px 42px rgba(26,60,109,0.08)', transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out' } as any)
      : {
          shadowColor: EXPERIENCE_COLORS.shadowSoft,
          shadowOffset: { width: 0, height: 16 },
          shadowRadius: 26,
          shadowOpacity: 0.12,
          elevation: 6,
        }),
  },
  cardHovered: {
    ...(typeof document !== 'undefined'
      ? ({ transform: [{ translateY: -4 }], boxShadow: '0 28px 48px rgba(26,60,109,0.12)' } as any)
      : {}),
  },
  illustrationWrap: {
    minHeight: 160,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illustrationDesktop: {
    width: '100%',
    height: 148,
  },
  illustrationMobile: {
    width: '100%',
    height: 180,
  },
  textSide: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copyStack: {
    gap: spacing.sm,
  },
  cardTitle: {
    color: EXPERIENCE_COLORS.ink,
    fontSize: 24,
    lineHeight: 28,
  },
  cardDescription: {
    color: EXPERIENCE_COLORS.inkSoft,
    fontSize: 16,
    lineHeight: 26,
  },
  detailsBtn: {
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: EXPERIENCE_COLORS.stroke,
    justifyContent: 'center',
  },
  detailsText: {
    color: EXPERIENCE_COLORS.ink,
  },
  pressed: {
    opacity: 0.82,
  },
});

export default FeatureGrid;
