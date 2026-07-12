/**
 * AccuracySection — "How accuracy works" (trust as a first-class landing section).
 *
 * Inspired by SnapCalorie's accuracy FAQ and Oura's non-judgmental framing: say exactly
 * where each number comes from, what the system is bad at, and what happens to photos.
 * The same three blocks are mirrored in the prerendered static HTML (scripts/prerender-landing.mjs)
 * so crawlers and no-JS visitors see it too.
 */
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';

const PIPELINE_STEPS = [
  {
    title: 'Identify',
    body: 'A vision model names each food it can see and lists likely ingredients.',
  },
  {
    title: 'Portion',
    body: 'On LiDAR iPhones, depth measures your plate so portions come from geometry — not a guess from a flat photo.',
  },
  {
    title: 'Nutrition',
    body: 'Calories and macros are estimated per item and cross-referenced against USDA FoodData Central.',
  },
  {
    title: 'You correct',
    body: 'Every item is editable in one tap. Low-confidence items are flagged for a quick check — never buried in a total.',
  },
] as const;

const LIMITATIONS = [
  'Hidden oils, butter and dressings can be underestimated',
  'Mixed or stewed dishes are harder than separate items',
  'Foods hidden under other foods can be missed',
  'Shared plates need you to say how much was yours',
] as const;

const PRIVACY_POINTS = [
  'Meal photos are uploaded securely to build your log and stay attached to your account.',
  'Deleting a meal removes its photo; deleting your account removes everything.',
  'Every AI number is labeled as an estimate, with sources you can check.',
] as const;

export function AccuracySection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isCompact = width < 420;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <Text style={[styles.heading, !isDesktop && styles.headingMobile]} accessibilityRole="header">
        How accuracy works
      </Text>
      <Text style={styles.lede}>
        Nutrition from a photo is an estimate. We make it a good one — and we show our work.
      </Text>

      <View style={[styles.stepsRow, !isDesktop && styles.stepsColumn]}>
        {PIPELINE_STEPS.map((step, index) => (
          <View key={step.title} style={[styles.stepCard, !isDesktop && styles.stepCardMobile]}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.detailRow, !isDesktop && styles.detailColumn]}>
        <View style={[styles.detailCard, !isDesktop && styles.detailCardMobile]}>
          <Text style={styles.detailTitle}>Where we&apos;re honest about limits</Text>
          {LIMITATIONS.map((item) => (
            <Text key={item} style={styles.detailItem}>
              {'•'}  {item}
            </Text>
          ))}
          <Text style={styles.detailFootnote}>
            When we&apos;re less sure, the item is marked for review instead of pretending precision.
          </Text>
        </View>

        <View style={[styles.detailCard, !isDesktop && styles.detailCardMobile]}>
          <Text style={styles.detailTitle}>Your photos, your data</Text>
          {PRIVACY_POINTS.map((item) => (
            <Text key={item} style={styles.detailItem}>
              {'•'}  {item}
            </Text>
          ))}
          <Text style={styles.detailFootnote}>
            Full details in the Privacy Policy and Data Deletion pages linked below.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 72,
    gap: 24,
  },
  containerCompact: {
    paddingVertical: 48,
    gap: 20,
  },
  heading: {
    color: '#000000',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  headingMobile: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  lede: {
    color: '#6B6B6B',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 560,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  stepsColumn: {
    flexDirection: 'column',
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#F6F6F6',
    borderRadius: 16,
    padding: 22,
    gap: 8,
  },
  stepCardMobile: {
    flex: undefined,
    width: '100%',
  },
  stepIndex: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  stepBody: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailColumn: {
    flexDirection: 'column',
  },
  detailCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 22,
    gap: 10,
  },
  detailCardMobile: {
    flex: undefined,
    width: '100%',
  },
  detailTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  detailItem: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 23,
  },
  detailFootnote: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
});

export default AccuracySection;
