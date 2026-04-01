import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { SafeAreaWrapper, Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';

const SOURCES = [
  {
    title: 'Default Calorie Target (2,000 kcal)',
    body: 'Based on the USDA Dietary Guidelines for Americans 2020–2025, which recommend approximately 2,000 kcal/day for a moderately active adult.',
    url: 'https://www.dietaryguidelines.gov/',
  },
  {
    title: 'Protein Recommendation (130 g)',
    body: 'Derived from the Institute of Medicine Dietary Reference Intakes (DRI). The RDA for protein is 0.8 g/kg body weight; 130 g reflects a fitness-oriented target for active individuals.',
    url: 'https://nap.nationalacademies.org/catalog/10490/dietary-reference-intakes-for-energy-carbohydrate-fiber-fat-fatty-acids-cholesterol-protein-and-amino-acids',
  },
  {
    title: 'Carbohydrate & Fat Targets',
    body: 'The Acceptable Macronutrient Distribution Ranges (AMDR) recommend 45–65% of calories from carbohydrates and 20–35% from fat (Institute of Medicine).',
    url: 'https://nap.nationalacademies.org/catalog/10490/dietary-reference-intakes-for-energy-carbohydrate-fiber-fat-fatty-acids-cholesterol-protein-and-amino-acids',
  },
  {
    title: 'Blood Sugar Estimation',
    body: 'The estimated blood sugar impact shown in the app is a simplified model based on the glycemic load concept. It is not a clinical measurement and should not be used for medical decisions. Consult a healthcare professional for blood sugar management.',
    url: 'https://www.health.harvard.edu/diseases-and-conditions/glycemic-index-and-glycemic-load-for-100-foods',
  },
];

function openURL(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Unable to open link', 'Please visit the URL manually in your browser.');
  });
}

function SourceCard({ title, body, url }: typeof SOURCES[number]) {
  return (
    <View style={styles.sourceCard}>
      <Text style={styles.sourceTitle}>{title}</Text>
      <Text style={styles.sourceBody}>{body}</Text>
      {url && (
        <Pressable onPress={() => openURL(url)} style={styles.linkRow}>
          <Feather name="external-link" size={14} color={BRAND_COLORS.secondary} />
          <Text style={styles.linkText}>View source</Text>
        </Pressable>
      )}
    </View>
  );
}

export function AboutNutritionDataScreen() {
  return (
    <SafeAreaWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>About Nutrition Data</Text>

        {/* Section 1: Daily targets */}
        <Text style={styles.sectionTitle}>Daily Nutrition Targets</Text>
        <Text style={styles.paragraph}>
          The default daily calorie and macronutrient targets displayed in AuraFitness are based on
          established dietary guidelines. Individual needs vary based on age, sex, weight, height,
          and activity level. Consult a registered dietitian or healthcare provider for personalised
          advice.
        </Text>

        {SOURCES.map((s) => (
          <SourceCard key={s.title} {...s} />
        ))}

        {/* Section 2: AI estimates */}
        <Text style={styles.sectionTitle}>AI-Generated Estimates</Text>
        <Text style={styles.paragraph}>
          When you scan a meal using your camera, nutritional values (calories, protein,
          carbohydrates, fat, and sugar) are estimated using AI image recognition. These values are
          approximate and may not reflect the exact nutritional content of your food.
        </Text>

        <View style={styles.disclaimerBox}>
          <Feather name="alert-circle" size={18} color={BRAND_COLORS.warning} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            AI-generated nutritional estimates are for informational purposes only and are not
            intended as medical or dietary advice. Always consult a qualified healthcare
            professional before making changes to your diet, especially if you have diabetes or
            other health conditions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: BRAND_COLORS.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLORS.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: BRAND_COLORS.textMuted,
    marginBottom: spacing.md,
  },
  sourceCard: {
    backgroundColor: BRAND_COLORS.surfaceVariant,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
  },
  sourceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_COLORS.textPrimary,
    marginBottom: 6,
  },
  sourceBody: {
    fontSize: 13,
    lineHeight: 20,
    color: BRAND_COLORS.textDisabled,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND_COLORS.secondary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.sm,
  },
  disclaimerIcon: {
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#92400E',
  },
});
