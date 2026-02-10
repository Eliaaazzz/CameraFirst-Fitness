import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Flame, DotsThree } from 'phosphor-react-native';

import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, radii, saasShadows, spacing } from '@/utils';

// Recharts is only available on web
let PieChart: any;
let Pie: any;
let Cell: any;
let ResponsiveContainer: any;
let Defs: any;
let LinearGradient: any;
let Stop: any;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const recharts = require('recharts');
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
  Defs = recharts.Defs;
  LinearGradient = recharts.LinearGradient;
  Stop = recharts.Stop;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Macro = {
  current: number;
  target: number;
};

export type NutritionDashboardProps = {
  calories: Macro;
  macros: {
    protein: Macro;
    fat: Macro;
    carbs: Macro;
  };
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TRACK_COLOR = BRAND_COLORS.macros.calories + '20';
const GRADIENT_START = BRAND_COLORS.macros.calories;
const GRADIENT_END = BRAND_COLORS.primaryDark;

const MACRO_COLORS = {
  protein: BRAND_COLORS.macros.protein,
  fat: BRAND_COLORS.macros.fat,
  carbs: BRAND_COLORS.macros.carbs,
} as const;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const clampPercent = (current: number, target: number) =>
  target > 0 ? Math.min((current / target) * 100, 100) : 0;

// -----------------------------------------------------------------------------
// Component (web)
// -----------------------------------------------------------------------------

function NutritionDashboardWeb({ calories, macros }: NutritionDashboardProps) {
  const consumed = Math.min(calories.current, calories.target);
  const remaining = Math.max(calories.target - consumed, 0);
  const chartData = [
    { name: 'Consumed', value: consumed },
    { name: 'Remaining', value: remaining },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Flame size={22} weight="fill" color={GRADIENT_END} />
          <Text style={styles.title} weight="bold">
            Calories
          </Text>
        </View>
        <DotsThree size={22} weight="bold" color={colors.light.textMuted} />
      </View>

      {/* Gauge */}
      <View style={styles.gaugeArea}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Defs>
              <LinearGradient id="calorieGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={GRADIENT_START} />
                <Stop offset="100%" stopColor={GRADIENT_END} />
              </LinearGradient>
            </Defs>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="95%"
              startAngle={180}
              endAngle={0}
              innerRadius={88}
              outerRadius={110}
              stroke="none"
              paddingAngle={0}
              cornerRadius={10}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              <Cell fill="url(#calorieGradient)" />
              <Cell fill={TRACK_COLOR} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center content */}
        <View style={styles.centerLabel}>
          <Flame size={24} weight="fill" color={GRADIENT_END} style={{ marginBottom: 4 }} />
          <Text style={styles.kcalValue} weight="bold">
            {calories.current}
            <Text style={styles.kcalUnit}> kcal</Text>
          </Text>
          <Text style={styles.subLabel}>of {calories.target} kcal</Text>
        </View>

        {/* End-cap dot to mimic reference */}
        <View style={styles.endCapWrapper}>
          <View style={styles.endCap} />
        </View>
      </View>

      {/* Macros */}
      <View style={styles.macrosRow}>
        {(
          [
            { key: 'protein', label: 'Protein', color: MACRO_COLORS.protein, data: macros.protein },
            { key: 'fat', label: 'Fat', color: MACRO_COLORS.fat, data: macros.fat },
            { key: 'carbs', label: 'Carbs', color: MACRO_COLORS.carbs, data: macros.carbs },
          ] as const
        ).map(({ key, label, color, data }) => (
          <View key={key} style={styles.macroItem}>
            <Text style={styles.macroLabel} weight="bold">
              {label}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: color, width: `${clampPercent(data.current, data.target)}%` },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>
              {data.current} / {data.target} g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Component (native fallback)
// -----------------------------------------------------------------------------

function NutritionDashboardNative({ calories, macros }: NutritionDashboardProps) {
  // Simple fallback showing numbers; the rich gauge is web-only.
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Flame size={22} weight="fill" color={GRADIENT_END} />
          <Text style={styles.title} weight="bold">
            Calories
          </Text>
        </View>
        <DotsThree size={22} weight="bold" color={colors.light.textMuted} />
      </View>
      <Text style={styles.kcalValue} weight="bold">
        {calories.current}
        <Text style={styles.kcalUnit}> kcal</Text>
      </Text>
      <Text style={styles.subLabel}>of {calories.target} kcal</Text>
      <View style={[styles.macrosRow, { marginTop: spacing.lg }]}>
        {(
          [
            { key: 'protein', label: 'Protein', color: MACRO_COLORS.protein, data: macros.protein },
            { key: 'fat', label: 'Fat', color: MACRO_COLORS.fat, data: macros.fat },
            { key: 'carbs', label: 'Carbs', color: MACRO_COLORS.carbs, data: macros.carbs },
          ] as const
        ).map(({ key, label, color, data }) => (
          <View key={key} style={styles.macroItem}>
            <Text style={styles.macroLabel} weight="bold">
              {label}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: color, width: `${clampPercent(data.current, data.target)}%` },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>
              {data.current} / {data.target} g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Public component
// -----------------------------------------------------------------------------

export function NutritionDashboard(props: NutritionDashboardProps) {
  if (Platform.OS === 'web') {
    return <NutritionDashboardWeb {...props} />;
  }
  return <NutritionDashboardNative {...props} />;
}

export const SAMPLE_NUTRITION_DASHBOARD: NutritionDashboardProps = {
  calories: { current: 1721, target: 2213 },
  macros: {
    protein: { current: 11, target: 84 },
    fat: { current: 25, target: 63 },
    carbs: { current: 338, target: 338 },
  },
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#f2f3f5',
    ...saasShadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    color: colors.light.textPrimary,
  },
  gaugeArea: {
    position: 'relative',
    height: 200,
    justifyContent: 'flex-end',
  },
  centerLabel: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalValue: {
    fontSize: 40,
    color: colors.light.textPrimary,
    lineHeight: 44,
  },
  kcalUnit: {
    fontSize: 18,
    color: colors.light.textPrimary,
  },
  subLabel: {
    marginTop: 4,
    color: colors.light.textMuted,
    fontSize: 14,
  },
  endCapWrapper: {
    position: 'absolute',
    right: '13%',
    top: 18,
  },
  endCap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffe7d5',
    borderWidth: 4,
    borderColor: '#f7a35c',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  macroItem: {
    flex: 1,
  },
  macroLabel: {
    color: colors.light.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  macroValue: {
    marginTop: 6,
    color: colors.light.textMuted,
    fontSize: 12,
  },
});

export default NutritionDashboard;
