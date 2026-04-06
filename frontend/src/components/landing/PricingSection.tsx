import { CheckCircle } from 'phosphor-react-native';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

interface PricingSectionProps {
  onGetStarted: () => void;
}

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  tone: string;
  cta: string;
  features: readonly string[];
  highlight?: boolean;
}

const PLANS: readonly PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    tone: '#F4F4F4',
    cta: 'Start free',
    features: ['Meal logging', 'Daily score', 'Basic reports'],
  },
  {
    name: 'Pro',
    price: '$6.99',
    period: '/month',
    tone: '#EAF2FF',
    cta: 'Choose Pro',
    highlight: true,
    features: ['Everything in Free', 'AI meal scan', 'Weekly reports', 'Progress export'],
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: '/month',
    tone: '#FFF3E3',
    cta: 'Choose Premium',
    features: ['Everything in Pro', 'Advanced planning', 'Priority support', 'Program tracking'],
  },
] as const;

const COMPARISON_ROWS = [
  { feature: 'Meal logging', values: ['Yes', 'Yes', 'Yes'] },
  { feature: 'AI meal scan', values: ['No', 'Yes', 'Yes'] },
  { feature: 'Weekly reports', values: ['Basic', 'Advanced', 'Advanced'] },
  { feature: 'Export data', values: ['No', 'Yes', 'Yes'] },
];

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={isDesktop ? styles.title : [styles.title, styles.titleMobile]}
      >
        Choose the plan that fits your routine
      </Text>
      <Text variant="heading4" style={styles.subtitle}>
        Start free, upgrade when you want AI logging, deeper reporting, and more structured planning.
      </Text>

      <View style={[styles.cardsRow, isDesktop && styles.cardsRowDesktop]}>
        {PLANS.map((plan) => (
          <View
            key={plan.name}
            style={[
              styles.planCard,
              { backgroundColor: plan.tone },
              plan.highlight && styles.planCardHighlight,
            ]}
          >
            {plan.highlight ? (
              <View style={styles.popularBadge}>
                <Text variant="caption" weight="bold" style={styles.popularBadgeText}>
                  Most popular
                </Text>
              </View>
            ) : null}

            <Text variant="heading3" weight="bold" style={styles.planName}>
              {plan.name}
            </Text>
            <View style={styles.priceRow}>
              <Text variant="heading1" weight="bold" style={styles.price}>
                {plan.price}
              </Text>
              <Text variant="body" style={styles.period}>
                {plan.period}
              </Text>
            </View>

            <View style={styles.featureList}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <CheckCircle size={18} weight="fill" color="#111111" />
                  <Text variant="body" style={styles.featureText}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.planCta, pressed && styles.pressed]}>
              <Text variant="body" weight="bold" style={styles.planCtaText}>
                {plan.cta}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.comparisonTable}>
        <View style={styles.comparisonHeader}>
          <Text variant="heading3" weight="bold" style={styles.comparisonTitle}>
            Compare plans
          </Text>
          <Text variant="body" style={styles.comparisonSubtext}>
            Upgrade when you need more automation and reporting depth.
          </Text>
        </View>

        {COMPARISON_ROWS.map((row) => (
          <View key={row.feature} style={styles.tableRow}>
            <Text variant="body" weight="semibold" style={styles.tableFeature}>
              {row.feature}
            </Text>
            {row.values.map((value, index) => (
              <Text key={`${row.feature}-${index}`} variant="body" style={styles.tableValue}>
                {value}
              </Text>
            ))}
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
    maxWidth: 760,
    marginBottom: spacing['2xl'],
    fontSize: 20,
    lineHeight: 32,
  },
  cardsRow: {
    gap: spacing.lg,
  },
  cardsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  planCard: {
    flex: 1,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 24,
    minHeight: 360,
  },
  planCardHighlight: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  popularBadgeText: {
    color: '#FFFFFF',
  },
  planName: {
    color: '#111111',
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  price: {
    color: '#111111',
  },
  period: {
    color: BRAND_COLORS.textMuted,
    marginBottom: 6,
  },
  featureList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    color: '#111111',
  },
  planCta: {
    marginTop: 'auto',
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCtaText: {
    color: '#FFFFFF',
  },
  comparisonTable: {
    marginTop: spacing['2xl'],
    backgroundColor: '#FFFFFF',
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    overflow: 'hidden',
  },
  comparisonHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.borderSubtle,
  },
  comparisonTitle: {
    color: '#111111',
    marginBottom: 4,
  },
  comparisonSubtext: {
    color: BRAND_COLORS.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.borderSubtle,
  },
  tableFeature: {
    flex: 1.4,
    color: '#111111',
  },
  tableValue: {
    flex: 1,
    color: BRAND_COLORS.textSecondary,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default PricingSection;
