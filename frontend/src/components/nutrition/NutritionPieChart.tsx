import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
} from 'react-native-reanimated';

import { LogMealButton } from '@/components/LogMealButton';
import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Only import Recharts on web platform
let PieChart: any;
let Pie: any;
let Cell: any;
let ResponsiveContainer: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
}

// ============================================================================
// TYPES
// ============================================================================

interface MacroData {
  current: number;
  target: number;
}

export interface NutritionPieChartData {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat?: MacroData;
}

interface NutritionPieChartProps {
  readonly data: NutritionPieChartData;
  readonly title?: string;
  readonly showFat?: boolean;
  readonly onLogMeal?: () => void;
}

// ============================================================================
// MACRO COLORS CONFIG
// ============================================================================

const MACRO_COLORS = {
  calories: '#8b5cf6', // Purple - primary brand color
  protein: '#10B981', // Emerald green
  carbs: '#F59E0B', // Amber/Orange
  fat: '#EF4444', // Red
  background: '#f3f4f6', // Light gray for unfilled portion
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionPieChart({
  data,
  title = "Today's Nutrition",
  showFat = false,
  onLogMeal,
}: NutritionPieChartProps) {
  // Animation values
  const cardProgress = useSharedValue(0);
  const chartProgress = useSharedValue(0);
  const legendProgress = useSharedValue(0);

  // Staggered entrance animation
  useEffect(() => {
    cardProgress.value = withSpring(1, { damping: 18, stiffness: 100 });
    chartProgress.value = withDelay(150, withSpring(1, { damping: 20, stiffness: 80 }));
    legendProgress.value = withDelay(300, withSpring(1, { damping: 18, stiffness: 100 }));
  }, []);

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardProgress.value,
    transform: [
      { translateY: interpolate(cardProgress.value, [0, 1], [20, 0]) },
      { scale: interpolate(cardProgress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  const chartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chartProgress.value,
    transform: [
      { scale: interpolate(chartProgress.value, [0, 1], [0.8, 1]) },
      { rotate: `${interpolate(chartProgress.value, [0, 1], [-10, 0])}deg` },
    ],
  }));

  const legendAnimatedStyle = useAnimatedStyle(() => ({
    opacity: legendProgress.value,
    transform: [{ translateY: interpolate(legendProgress.value, [0, 1], [12, 0]) }],
  }));

  // Prepare pie chart data - each macro as a segment
  const pieData = [
    {
      name: 'Calories',
      value: data.calories.current,
      fill: MACRO_COLORS.calories,
    },
    {
      name: 'Protein',
      value: data.protein.current,
      fill: MACRO_COLORS.protein,
    },
    {
      name: 'Carbs',
      value: data.carbs.current,
      fill: MACRO_COLORS.carbs,
    },
  ];

  if (showFat && data.fat) {
    pieData.push({
      name: 'Fat',
      value: data.fat.current,
      fill: MACRO_COLORS.fat,
    });
  }

  // Ensure we have some value for the chart (avoid empty pie)
  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);
  const isEmpty = totalValue <= 0;
  const chartData = totalValue > 0 ? pieData : pieData.map(item => ({ ...item, value: 1 }));

  // Format calorie subtitle for header
  const calorieSubtitle = `${Math.round(data.calories.current)} / ${data.calories.target} kcal`;

  // Macro items for the legend
  const macroItems = [
    {
      key: 'calories',
      label: 'Calories',
      current: data.calories.current,
      target: data.calories.target,
      unit: ' kcal',
      color: MACRO_COLORS.calories,
    },
    {
      key: 'protein',
      label: 'Protein',
      current: data.protein.current,
      target: data.protein.target,
      unit: 'g',
      color: MACRO_COLORS.protein,
    },
    {
      key: 'carbs',
      label: 'Carbs',
      current: data.carbs.current,
      target: data.carbs.target,
      unit: 'g',
      color: MACRO_COLORS.carbs,
    },
  ];

  if (showFat && data.fat) {
    macroItems.push({
      key: 'fat',
      label: 'Fat',
      current: data.fat.current,
      target: data.fat.target,
      unit: 'g',
      color: MACRO_COLORS.fat,
    });
  }

  // Web-only Recharts implementation
  if (Platform.OS !== 'web') {
    // Fallback for non-web platforms - simple text display
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text variant="heading3" weight="bold" style={styles.title}>
            {title}
          </Text>
          <Text variant="caption" style={styles.headerCalories}>
            {calorieSubtitle}
          </Text>
        </View>
        <Text variant="body">Charts only available on web</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" weight="bold" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" style={styles.headerCalories}>
          {calorieSubtitle}
        </Text>
      </View>

      {/* Content: Chart + Stats */}
      <View style={styles.content}>
        {/* Left: Pie Chart */}
        <View style={styles.chartColumn}>
          <Animated.View style={[styles.chartContainer, chartAnimatedStyle]}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius="70%"
                outerRadius="100%"
                cornerRadius="50%"
                paddingAngle={5}
                dataKey="value"
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {chartData.map((entry: any) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Label or CTA when empty */}
            {isEmpty && onLogMeal ? (
              <View style={styles.emptyCenter}>
                <Text variant="heading2" weight="bold" style={styles.centerPercentage}>
                  0 kcal
                </Text>
                <LogMealButton onPress={onLogMeal} variant="compact" />
              </View>
            ) : (
              <View style={styles.centerLabel}>
                <Text variant="heading2" weight="bold" style={styles.centerPercentage}>
                  {Math.round(data.calories.current)} kcal
                </Text>
                <Text variant="caption" style={styles.centerSubtext}>
                  of {data.calories.target} kcal
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Right: 2x2 Stats Grid */}
        <Animated.View style={[styles.statsGrid, legendAnimatedStyle]}>
          {macroItems.map((macro) => {
            return (
              <View key={macro.key} style={styles.statItem}>
                <View style={styles.statLabelRow}>
                  <View style={[styles.statDot, { backgroundColor: macro.color }]} />
                  <Text variant="caption" style={styles.statLabel}>
                    {macro.label}
                  </Text>
                </View>
                <Text variant="heading3" weight="bold" style={styles.statValue}>
                  {Math.round(macro.current)}{macro.unit}
                </Text>
                <Text variant="caption" style={styles.statTarget}>
                  / {macro.target}{macro.unit}
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    padding: spacing.lg,
    ...saasShadows.cardElevated,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    fontWeight: '700',
  },
  headerCalories: {
    color: '#4B5563',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  chartColumn: {
    flexBasis: '40%',
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPercentage: {
    color: BRAND_COLORS.primary,
    fontSize: 28,
  },
  centerSubtext: {
    color: colors.light.textSecondary,
    fontSize: 12,
    marginTop: -2,
  },
  emptyCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statsGrid: {
    flexBasis: '60%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  statItem: {
    flexBasis: '48%',
    minWidth: 160,
    alignItems: 'flex-start',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    color: colors.light.textSecondary,
  },
  statValue: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 18,
  },
  statTarget: {
    color: colors.light.textMuted,
    fontSize: 11,
  },
});

export default NutritionPieChart;
