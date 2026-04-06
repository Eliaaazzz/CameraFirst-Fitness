import { CalendarBlank, Clock, Target } from 'phosphor-react-native';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, LANDING_COLORS, radii, spacing } from '@/utils';

const plannerIllustration = require('@/../assets/illustrations/fruit-salad.svg');

interface HowItWorksProps {
  onGetStarted: () => void;
}

const BENEFITS = [
  {
    icon: Target,
    title: 'Personalized targets',
    body: 'Choose a goal and get AI-generated calorie and macro guidance tailored to you.',
  },
  {
    icon: CalendarBlank,
    title: 'Adaptive weekly plan',
    body: 'Training, meals, and habits in one weekly rhythm that adapts as you progress.',
  },
  {
    icon: Clock,
    title: 'Exportable progress',
    body: 'Review your progress and export your numbers when you need them.',
  },
];

function PlannerField({
  label,
  value,
  Icon,
  onPress,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<any>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}>
      <Text variant="caption" style={styles.fieldLabel}>
        {label}
      </Text>
      <View style={styles.fieldInput}>
        <Icon size={18} weight="regular" color={LANDING_COLORS.text} />
        <Text variant="body" weight="medium" style={styles.fieldValue}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={isDesktop ? [styles.sectionTitle] : [styles.sectionTitle, styles.sectionTitleMobile]}
      >
        Plan for later
      </Text>

      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <View style={[styles.cardContent, isDesktop && styles.cardContentDesktop]}>
            <View style={styles.cardCopy}>
              <Text
                variant="heading1"
                weight="bold"
                style={isDesktop ? [styles.cardTitle] : [styles.cardTitle, styles.cardTitleMobile]}
              >
                Build the right weekly plan
              </Text>
              <Text variant="heading4" style={styles.cardSubtitle}>
                Choose the goal, set the focus, and define how much time you can give this week.
              </Text>
            </View>

            <View style={styles.fieldsRow}>
              <PlannerField label="Goal" value="Build Muscle" Icon={Target} onPress={onGetStarted} />
              <PlannerField label="Focus" value="Nutrition + Strength" Icon={CalendarBlank} onPress={onGetStarted} />
              <PlannerField label="Weekly time" value="4 sessions" Icon={Clock} onPress={onGetStarted} />
            </View>

            <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}>
              <Text variant="body" weight="bold" style={styles.primaryCtaText}>
                Build my plan
              </Text>
            </Pressable>
          </View>

          <Image
            source={plannerIllustration}
            style={[styles.cardIllustration, !isDesktop && styles.cardIllustrationMobile]}
            contentFit="contain"
          />
        </View>

        <View style={[styles.benefitsPanel, isDesktop && styles.benefitsDesktop]}>
          <Text variant="heading3" weight="bold" style={styles.benefitsTitle}>
            Benefits
          </Text>

          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitRow}>
              <View style={styles.benefitIconBox}>
                <benefit.icon size={20} weight="bold" color={LANDING_COLORS.text} />
              </View>
              <View style={styles.benefitCopy}>
                <Text variant="body" weight="semibold" style={styles.benefitTitle}>
                  {benefit.title}
                </Text>
                <Text variant="body" style={styles.benefitText}>
                  {benefit.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
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
  container: {
    gap: spacing.xl,
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  card: {
    flex: 1,
    borderRadius: radii['2xl'],
    backgroundColor: LANDING_COLORS.accent.teal,
    borderWidth: 1,
    borderColor: LANDING_COLORS.border,
    padding: 28,
    overflow: 'hidden',
  },
  cardDesktop: {
    flex: 2,
    minHeight: 520,
  },
  cardContent: {
    zIndex: 1,
  },
  cardContentDesktop: {
    maxWidth: '72%',
    minWidth: 0,
    paddingRight: spacing.lg,
  },
  cardCopy: {
    maxWidth: 420,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    color: LANDING_COLORS.text,
    fontSize: 54,
    lineHeight: 56,
    letterSpacing: -2,
  },
  cardTitleMobile: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  cardSubtitle: {
    color: LANDING_COLORS.textOnAccent,
    fontSize: 20,
    lineHeight: 30,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  field: {
    flex: 1,
    minWidth: 180,
  },
  fieldPressed: {
    opacity: 0.88,
  },
  fieldLabel: {
    color: LANDING_COLORS.fieldLabel,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: LANDING_COLORS.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: LANDING_COLORS.borderField,
  },
  fieldValue: {
    color: LANDING_COLORS.text,
  },
  primaryCta: {
    marginTop: spacing.sm,
    backgroundColor: LANDING_COLORS.ctaBg,
    borderRadius: radii.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 520,
  },
  primaryCtaText: {
    color: LANDING_COLORS.ctaText,
    fontSize: 18,
  },
  cardIllustration: {
    position: 'absolute',
    right: -12,
    bottom: -28,
    width: 280,
    height: 280,
    opacity: 0.72,
  },
  cardIllustrationMobile: {
    position: 'relative',
    right: 0,
    bottom: 0,
    width: 220,
    height: 220,
    alignSelf: 'flex-end',
    marginTop: spacing.lg,
  },
  benefitsPanel: {
    borderRadius: radii['2xl'],
    backgroundColor: LANDING_COLORS.bg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    padding: 24,
    gap: spacing.lg,
  },
  benefitsDesktop: {
    flex: 1,
  },
  benefitsTitle: {
    color: LANDING_COLORS.text,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.borderSubtle,
  },
  benefitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.surfaceVariant,
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    color: LANDING_COLORS.text,
    marginBottom: 4,
  },
  benefitText: {
    color: BRAND_COLORS.textSecondary,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.88,
  },
});

export default HowItWorks;
