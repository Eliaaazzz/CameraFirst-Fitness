/**
 * FeatureGrid — Uber "Discover what you can do" 3-card row.
 *
 * Uber rules:
 * - #F6F6F6 card background, no border, no shadow
 * - Bold title, gray description
 * - Illustration bottom-right
 * - 52px heading, tight letter-spacing
 */
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { APP_NAME } from '@/utils';

const FEATURES = [
  {
    title: 'Scan meals',
    description: 'Snap a photo, get instant macro breakdown. AI-powered nutrition logging in under 3 seconds.',
    illustration: require('@/../assets/illustrations/cooking.svg'),
  },
  {
    title: 'Daily rings',
    description: 'Apple Fitness-style rings track protein, carbs, and fat against your personalized targets.',
    illustration: require('@/../assets/illustrations/fitness-stats.svg'),
  },
  {
    title: 'Weekly insights',
    description: 'See trends, streaks, and progress in a clear weekly report. Know exactly where you stand.',
    illustration: require('@/../assets/illustrations/data-trends.svg'),
  },
] as const;

interface FeatureGridProps {
  onExplore?: () => void;
}

export function FeatureGrid({ onExplore }: FeatureGridProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text style={isDesktop ? styles.heading : [styles.heading, styles.headingMobile]}>
        Discover what you can do with {APP_NAME}
      </Text>

      <View style={[styles.grid, !isDesktop && styles.gridMobile]}>
        {FEATURES.map((feature) => (
          <Pressable
            key={feature.title}
            onPress={onExplore}
            style={({ pressed }) => [
              styles.card,
              isDesktop && styles.cardDesktop,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
            <View style={styles.illustrationWrap}>
              <Image source={feature.illustration} style={styles.illustration} contentFit="contain" />
            </View>
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
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  card: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    padding: 24,
    minHeight: 320,
    justifyContent: 'flex-start',
  },
  cardDesktop: {
    // Equal width via flex: 1
  },
  cardTitle: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  cardDescription: {
    color: '#6B6B6B',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 140,
  },
  illustration: {
    width: '80%',
    height: 140,
  },
});

export default FeatureGrid;
