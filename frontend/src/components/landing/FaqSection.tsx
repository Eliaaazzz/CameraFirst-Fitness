import { CaretDown } from 'phosphor-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components';
import { BRAND_COLORS, radii, spacing } from '@/utils';

const FAQS = [
  {
    question: 'How accurate is the AI meal scan?',
    answer: 'The scan is designed to speed up logging. You can review the suggested food, serving size, and nutrition before saving.',
  },
  {
    question: 'Is my data private?',
    answer: 'Your account data stays inside your product account and can be exported when you want to review or move it elsewhere.',
  },
  {
    question: 'Can I use it without the camera?',
    answer: 'Yes. You can log meals manually, browse recipes, and track workouts even if you never open the camera.',
  },
  {
    question: 'What is included in the free plan?',
    answer: 'Free includes meal logging, daily score, and basic progress views. Paid plans add AI scan, exports, and advanced reporting.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Paid plans are monthly and you can change or cancel them from your account settings.',
  },
] as const;

export function FaqSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <View style={styles.section}>
      <Text
        variant="heading1"
        weight="bold"
        style={isDesktop ? styles.title : [styles.title, styles.titleMobile]}
      >
        Frequently asked questions
      </Text>
      <Text variant="heading4" style={styles.subtitle}>
        Everything you need to know before getting started.
      </Text>

      <View style={styles.list}>
        {FAQS.map((item, index) => {
          const isOpen = index === openIndex;
          return (
            <Pressable
              key={item.question}
              onPress={() => setOpenIndex(isOpen ? -1 : index)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={styles.questionRow}>
                <Text variant="heading4" weight="bold" style={styles.question}>
                  {item.question}
                </Text>
                <CaretDown
                  size={18}
                  weight="bold"
                  color="#111111"
                  style={isOpen ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </View>
              {isOpen ? (
                <Text variant="body" style={styles.answer}>
                  {item.answer}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
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
    marginBottom: spacing['2xl'],
    fontSize: 20,
    lineHeight: 32,
    maxWidth: 720,
  },
  list: {
    gap: spacing.md,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  question: {
    flex: 1,
    color: '#111111',
  },
  answer: {
    color: BRAND_COLORS.textSecondary,
    marginTop: spacing.md,
    lineHeight: 26,
    maxWidth: 840,
  },
  pressed: {
    opacity: 0.92,
  },
});

export default FaqSection;
