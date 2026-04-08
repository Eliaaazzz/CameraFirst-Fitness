/**
 * FeatureGrid — Uber "Discover" section with 6 feature cards.
 * Each card has a distinct background color matching its illustration.
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME } from '@/utils';

const FEATURES = [
  {
    title: 'Meal Logging',
    description: 'Open the camera, snap a photo, and get an instant macro breakdown powered by AI.',
    illustration: require('@/../assets/illustrations/cooking.svg'),
    bg: '#FFF1E6',
  },
  {
    title: 'Workout Planning',
    description: 'Build a week that balances strength, cardio, and recovery with video-guided sessions.',
    illustration: require('@/../assets/illustrations/fitness-tracker.svg'),
    bg: '#E3EFFF',
  },
  {
    title: 'Progress Tracking',
    description: 'Apple Fitness-style rings track protein, carbs, and fat against your daily targets.',
    illustration: require('@/../assets/illustrations/fitness-stats.svg'),
    bg: '#E6F9ED',
  },
  {
    title: 'Targets',
    description: 'AI-generated calorie, macro, and hydration targets tailored to your body and goals.',
    illustration: require('@/../assets/illustrations/healthy-habit.svg'),
    bg: '#FFF8DB',
  },
  {
    title: 'Recipes',
    description: 'Browse meals that fit your macro targets instead of forcing workarounds later in the day.',
    illustration: require('@/../assets/illustrations/chef.svg'),
    bg: '#F3E8FF',
  },
  {
    title: 'Weekly Reports',
    description: 'See trends, streaks, adherence, and nutrition balance in one clear weekly report.',
    illustration: require('@/../assets/illustrations/data-trends.svg'),
    bg: '#E0F4FF',
  },
] as const;

interface FeatureGridProps {
  onExplore?: () => void;
}

export function FeatureGrid({ onExplore }: FeatureGridProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 720;
  const isCompact = width < 420;

  return (
    <View style={styles.section}>
      <Text style={isDesktop ? styles.heading : isCompact ? [styles.heading, styles.headingMobile, styles.headingCompact] : [styles.heading, styles.headingMobile]}>
        Discover what you can do with {APP_NAME}
      </Text>

      <View style={[styles.grid, !isTablet && styles.gridMobile]}>
        {FEATURES.map((feature) => (
          <Pressable
            key={feature.title}
            onPress={onExplore}
            style={({ pressed }) => [
              styles.card,
              !isTablet && styles.cardMobile,
              isTablet && !isDesktop && styles.cardTablet,
              isDesktop && styles.cardDesktop,
              pressed && { opacity: 0.92 },
            ]}
          >
            <View style={[styles.illustrationWrap, { backgroundColor: feature.bg }, !isTablet && styles.illustrationWrapMobile]}>
              <Image
                source={feature.illustration}
                style={[styles.illustration, !isTablet && styles.illustrationMobile]}
                contentFit="contain"
              />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 80,
    paddingBottom: 40,
  },
  heading: {
    color: '#000000',
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -2.5,
    lineHeight: 56,
    marginBottom: 40,
    maxWidth: 700,
  },
  headingMobile: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
    marginBottom: 28,
  },
  headingCompact: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    minWidth: 280,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardMobile: {
    minWidth: 0,
    width: '100%',
  },
  cardTablet: {
    flexBasis: '48%',
    flexGrow: 0,
    minWidth: 0,
  },
  cardDesktop: {
    flexBasis: '31.8%',
    flexGrow: 0,
    minWidth: 0,
  },
  illustrationWrap: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  illustrationWrapMobile: {
    height: 176,
  },
  illustration: {
    width: '70%',
    height: 160,
  },
  illustrationMobile: {
    width: '72%',
    height: 136,
  },
  cardTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: '#F6F6F6',
  },
  cardDescription: {
    color: '#6B6B6B',
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F6F6F6',
  },
});

export default FeatureGrid;
