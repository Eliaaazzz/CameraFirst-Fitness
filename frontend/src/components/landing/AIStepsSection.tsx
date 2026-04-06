import { Camera, ChartLineUp, MagicWand } from 'phosphor-react-native';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

const STEPS = [
  {
    step: '01',
    title: 'Snap a photo of your meal',
    body: 'Start with the camera when you want the fastest way to log breakfast, lunch, or dinner.',
    Icon: Camera,
    tone: '#FFF0E5',
  },
  {
    step: '02',
    title: 'AI identifies the food and logs nutrition',
    body: 'Review the result, confirm the serving, and save calories and macros in a few taps.',
    Icon: MagicWand,
    tone: '#EEF5FF',
  },
  {
    step: '03',
    title: 'Track progress with daily scores and weekly reports',
    body: 'See adherence, streaks, and weight trends without exporting your data into another tool.',
    Icon: ChartLineUp,
    tone: '#EAF8F1',
  },
] as const;

export function AIStepsSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={isDesktop ? styles.title : [styles.title, styles.titleMobile]}
      >
        How it works
      </Text>
      <Text variant="heading4" style={styles.subtitle}>
        From one photo to weekly review, AuraFitness keeps logging and reporting inside one workflow.
      </Text>

      <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
        {STEPS.map((item) => (
          <View key={item.step} style={[styles.card, isDesktop && styles.cardDesktop]}>
            <View style={[styles.iconBox, { backgroundColor: item.tone }]}>
              <item.Icon size={24} weight="bold" color="#111111" />
            </View>
            <Text variant="label" weight="bold" style={styles.stepLabel}>
              Step {item.step}
            </Text>
            <Text variant="heading3" weight="bold" style={styles.cardTitle}>
              {item.title}
            </Text>
            <Text variant="body" style={styles.cardBody}>
              {item.body}
            </Text>
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
  title: {
    color: '#111111',
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -2,
    marginBottom: spacing.sm,
  },
  titleMobile: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
  },
  subtitle: {
    color: BRAND_COLORS.textSecondary,
    maxWidth: 720,
    marginBottom: spacing['2xl'],
    fontSize: 20,
    lineHeight: 32,
  },
  grid: {
    gap: spacing.lg,
  },
  gridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 24,
    minHeight: 248,
  },
  cardDesktop: {
    minWidth: 0,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stepLabel: {
    color: BRAND_COLORS.textMuted,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: '#111111',
    marginBottom: spacing.sm,
  },
  cardBody: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 26,
  },
});

export default AIStepsSection;
