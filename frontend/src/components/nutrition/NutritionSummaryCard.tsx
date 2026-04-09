import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { SugarStackVisualizer } from './SugarStackVisualizer';
import { BRAND_COLORS } from '@/utils';

interface Total {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  netCarbs?: number;
  sugarCubes?: number;
}

interface NutritionSummaryCardProps {
  total: Total;
}

export function NutritionSummaryCard({ total }: NutritionSummaryCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Calculate sugar cubes if not provided (1 cube = 4g sugar)
  const sugarCubes = total.sugarCubes ?? (total.sugar ? total.sugar / 4 : 0);
  const hasSugarData = sugarCubes > 0;
  const macroCards = [
    { label: 'Protein', value: `${Math.round(total.protein)}g`, tone: '#EEF2FF', text: '#4338CA' },
    { label: 'Carbs', value: `${Math.round(total.carbs)}g`, tone: '#ECFDF5', text: '#047857' },
    { label: 'Fat', value: `${Math.round(total.fat)}g`, tone: '#FFF7ED', text: '#C2410C' },
  ];

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Meal summary</Text>
          <Text style={styles.title}>Estimated nutrition</Text>
        </View>
        <View style={styles.calorieBadge}>
          <Text style={styles.calorieBadgeValue}>{Math.round(total.calories)}</Text>
          <Text style={styles.calorieBadgeLabel}>kcal</Text>
        </View>
      </View>

      <View style={styles.macroGrid}>
        {macroCards.map((macro) => (
          <View key={macro.label} style={[styles.macroCard, { backgroundColor: macro.tone }]}>
            <Text style={[styles.macroValue, { color: macro.text }]}>{macro.value}</Text>
            <Text style={styles.macroLabel}>{macro.label}</Text>
          </View>
        ))}
      </View>

      {hasSugarData && (
        <View style={styles.sugarSection}>
          <View style={styles.divider} />
          <SugarStackVisualizer
            count={sugarCubes}
            mode="PREVENTION"
            animated={true}
          />
        </View>
      )}

      {/* AI estimation disclaimer */}
      <View style={styles.disclaimerRow}>
        <Text style={styles.disclaimerText}>
          Estimated by AI (Gemini Vision) — values are approximate. Verify with packaging or a healthcare professional.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891B2',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  calorieBadge: {
    minWidth: 96,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.primaryTint,
  },
  calorieBadgeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_COLORS.primaryDark,
  },
  calorieBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  macroCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sugarSection: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  disclaimerRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  disclaimerText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 16,
  },
});
