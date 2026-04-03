/**
 * InsightCard - Smart data-driven insight nuggets
 *
 * Displays a compact card with a one-liner insight derived from
 * nutrition and activity data. Inspired by Linear's issue cards
 * with a colored left accent bar.
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

interface InsightCardProps {
  /** The insight text */
  text: string;
  /** Accent color for the left bar */
  color: string;
  /** Small icon or emoji */
  icon: string;
}

export function InsightCard({ text, color, icon }: InsightCardProps) {
  return (
    <View style={[styles.card, Platform.OS === 'web' && styles.cardWeb]}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text variant="caption" style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

/**
 * Generate insight strings from nutrition data.
 * Returns an array of { text, color, icon } objects.
 */
export function generateInsights(data: {
  calories: number;
  calorieGoal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  mealCount: number;
  streak: number;
}): InsightCardProps[] {
  const insights: InsightCardProps[] = [];

  // Protein insight
  if (data.protein.goal > 0 && data.protein.current > 0) {
    const proteinPct = Math.round((data.protein.current / data.protein.goal) * 100);
    if (proteinPct >= 80) {
      insights.push({
        text: `Great protein intake! ${proteinPct}% of your target reached.`,
        color: '#10B981',
        icon: '💪',
      });
    } else if (proteinPct < 50 && data.mealCount >= 2) {
      insights.push({
        text: `Protein is at ${proteinPct}%. Consider a high-protein snack.`,
        color: '#F59E0B',
        icon: '🥩',
      });
    }
  }

  // Calorie balance
  if (data.calorieGoal > 0 && data.calories > 0) {
    const calPct = Math.round((data.calories / data.calorieGoal) * 100);
    if (calPct > 110) {
      insights.push({
        text: `You're ${calPct - 100}% over your calorie target today.`,
        color: '#EF4444',
        icon: '⚡',
      });
    } else if (calPct >= 85 && calPct <= 105) {
      insights.push({
        text: `Right on track! ${calPct}% of your calorie goal.`,
        color: '#06B6D4',
        icon: '✨',
      });
    }
  }

  // Streak insight
  if (data.streak >= 7) {
    insights.push({
      text: `${data.streak}-day streak! Consistency builds results.`,
      color: '#F97316',
      icon: '🔥',
    });
  }

  // Meal frequency
  if (data.mealCount === 0) {
    insights.push({
      text: "No meals logged yet today. Snap your first meal!",
      color: '#9CA3AF',
      icon: '📸',
    });
  }

  return insights.slice(0, 2); // Max 2 insights
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardWeb: {
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  } as any,
  accent: {
    width: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    color: BRAND_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default InsightCard;
