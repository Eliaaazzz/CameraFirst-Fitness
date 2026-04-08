/**
 * SuggestionGrid - Uber-style 2x3 illustration card grid.
 *
 * Pattern: Uber homepage suggestion tiles (Ride, Reserve, Food, Grocery).
 * Each card: light grey bg, CENTERED illustration on top, title centered below.
 * No subtitles. Square-ish proportions. Clean and minimal.
 */

import { Image } from 'expo-image';
import React from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/Text';
import { spacing } from '@/utils';

interface SuggestionCard {
  title: string;
  illustration: any;
  description?: string;
  backgroundColor?: string;
  onPress: () => void;
}

interface SuggestionGridProps {
  cards: SuggestionCard[];
}

export function SuggestionGrid({ cards }: SuggestionGridProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;
  const isDesktop = width >= 1024;

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <Pressable
          key={card.title}
          onPress={card.onPress}
          style={({ pressed }) => [
            styles.card,
            !isTablet && styles.cardMobile,
            isTablet && !isDesktop && styles.cardTablet,
            isDesktop && styles.cardDesktop,
            card.backgroundColor ? { backgroundColor: card.backgroundColor } : null,
            pressed && styles.cardPressed,
          ]}
        >
          <Image source={card.illustration} style={styles.illustration} contentFit="contain" />
          <Text variant="body" weight="medium" style={styles.cardTitle}>
            {card.title}
          </Text>
          {card.description ? (
            <Text variant="caption" style={styles.cardDescription}>
              {card.description}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '100%',
    minWidth: 0,
    minHeight: 146,
    backgroundColor: '#F3F3F3',
    borderRadius: 16,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer' as any,
      transition: 'background-color 0.15s ease-out',
    }),
  },
  cardMobile: {
    width: '48%',
    minHeight: 136,
  },
  cardTablet: {
    width: '48%',
  },
  cardDesktop: {
    width: '48%',
  },
  cardPressed: {
    opacity: 0.92,
  },
  illustration: {
    width: 72,
    height: 72,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: '#111111',
    fontSize: 14,
    textAlign: 'center',
  },
  cardDescription: {
    color: 'rgba(17,17,17,0.64)',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default SuggestionGrid;
