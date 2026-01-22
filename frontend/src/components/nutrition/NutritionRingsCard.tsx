import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';

import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, saasShadows, spacing } from '@/utils';

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface MacroData {
  current: number;
  target: number;
}

export interface NutritionRingsData {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat?: MacroData;
}

interface NutritionRingsCardProps {
  data: NutritionRingsData;
  title?: string;
  showFat?: boolean;
  animated?: boolean;
}

// ============================================================================
// RING CONFIGURATION
// ============================================================================

interface RingConfig {
  key: string;
  label: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  radius: number;
  strokeWidth: number;
}

const RING_CONFIGS: RingConfig[] = [
  {
    key: 'calories',
    label: 'Calories',
    color: '#A78BFA', // Violet-400
    gradientStart: '#7C3AED', // Violet-600
    gradientEnd: '#EC4899', // Pink-500
    radius: 52,
    strokeWidth: 12,
  },
  {
    key: 'protein',
    label: 'Protein',
    color: '#10B981', // Emerald-500
    gradientStart: '#059669', // Emerald-600
    gradientEnd: '#34D399', // Emerald-400
    radius: 38,
    strokeWidth: 10,
  },
  {
    key: 'carbs',
    label: 'Carbs',
    color: '#F59E0B', // Amber-500
    gradientStart: '#D97706', // Amber-600
    gradientEnd: '#FBBF24', // Amber-400
    radius: 26,
    strokeWidth: 8,
  },
];

// ============================================================================
// ANIMATED RING COMPONENT
// ============================================================================

interface AnimatedRingProps {
  config: RingConfig;
  percentage: number;
  centerX: number;
  centerY: number;
  animated: boolean;
  delay: number;
}

function AnimatedRing({
  config,
  percentage,
  centerX,
  centerY,
  animated,
  delay,
}: AnimatedRingProps) {
  const { radius, strokeWidth, gradientStart, gradientEnd } = config;

  // Calculate circumference
  const circumference = 2 * Math.PI * radius;

  // Clamp percentage to 100% for visual (can show > 100% in legend)
  const clampedPercentage = Math.min(percentage, 100);

  // Animated progress value
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        delay,
        withTiming(clampedPercentage / 100, {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      progress.value = clampedPercentage / 100;
    }
  }, [clampedPercentage, animated, delay]);

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  const gradientId = `gradient-${config.key}`;

  return (
    <>
      {/* Gradient definition */}
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradientStart} />
          <Stop offset="100%" stopColor={gradientEnd} />
        </LinearGradient>
      </Defs>

      {/* Background track */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={config.color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={0.15}
      />

      {/* Progress ring - rotated -90deg to start from top */}
      <G transform={`rotate(-90, ${centerX}, ${centerY})`}>
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </G>
    </>
  );
}

// ============================================================================
// LEGEND ITEM COMPONENT
// ============================================================================

interface LegendItemProps {
  config: RingConfig;
  current: number;
  target: number;
  unit: string;
}

function LegendItem({ config, current, target, unit }: LegendItemProps) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

  return (
    <View style={styles.legendItem}>
      <View style={styles.legendDot}>
        <View style={[styles.legendDotInner, { backgroundColor: config.color }]} />
      </View>
      <View style={styles.legendContent}>
        <Text variant="caption" style={styles.legendLabel}>
          {config.label}
        </Text>
        <View style={styles.legendValues}>
          <Text variant="body" weight="semibold" style={styles.legendCurrent}>
            {Math.round(current)}{unit}
          </Text>
          <Text variant="caption" style={styles.legendTarget}>
            / {target}{unit}
          </Text>
        </View>
      </View>
      <View style={[styles.legendPercentage, percentage >= 100 && styles.legendPercentageComplete]}>
        <Text
          variant="caption"
          weight="semibold"
          style={percentage >= 100 ? styles.legendPercentageTextComplete : styles.legendPercentageText}
        >
          {percentage}%
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionRingsCard({
  data,
  title = "Today's Nutrition",
  showFat = false,
  animated = true,
}: NutritionRingsCardProps) {
  // SVG dimensions
  const svgSize = 140;
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;

  // Calculate percentages
  const caloriesPercentage = data.calories.target > 0
    ? (data.calories.current / data.calories.target) * 100
    : 0;
  const proteinPercentage = data.protein.target > 0
    ? (data.protein.current / data.protein.target) * 100
    : 0;
  const carbsPercentage = data.carbs.target > 0
    ? (data.carbs.current / data.carbs.target) * 100
    : 0;

  const percentages = [caloriesPercentage, proteinPercentage, carbsPercentage];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" weight="semibold" style={styles.title}>
          {title}
        </Text>
        <Text variant="caption" style={styles.headerCalories}>
          {Math.round(data.calories.current)} / {data.calories.target} kcal
        </Text>
      </View>

      {/* Content: Rings + Legend */}
      <View style={styles.content}>
        {/* Rings Container */}
        <View style={styles.ringsContainer}>
          <Svg width={svgSize} height={svgSize}>
            {RING_CONFIGS.map((config, index) => (
              <AnimatedRing
                key={config.key}
                config={config}
                percentage={percentages[index]}
                centerX={centerX}
                centerY={centerY}
                animated={animated}
                delay={index * 150}
              />
            ))}
          </Svg>

          {/* Center percentage */}
          <View style={styles.centerLabel}>
            <Text variant="heading2" weight="bold" style={styles.centerPercentage}>
              {Math.round(caloriesPercentage)}%
            </Text>
            <Text variant="caption" style={styles.centerSubtext}>
              of goal
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem
            config={RING_CONFIGS[0]}
            current={data.calories.current}
            target={data.calories.target}
            unit=" kcal"
          />
          <LegendItem
            config={RING_CONFIGS[1]}
            current={data.protein.current}
            target={data.protein.target}
            unit="g"
          />
          <LegendItem
            config={RING_CONFIGS[2]}
            current={data.carbs.current}
            target={data.carbs.target}
            unit="g"
          />
          {showFat && data.fat && (
            <LegendItem
              config={{
                key: 'fat',
                label: 'Fat',
                color: '#EF4444',
                gradientStart: '#DC2626',
                gradientEnd: '#F87171',
                radius: 14,
                strokeWidth: 6,
              }}
              current={data.fat.current}
              target={data.fat.target}
              unit="g"
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)', // Subtle primary color border
    padding: spacing.lg,
    ...saasShadows.cardElevated, // More prominent shadow for visual hierarchy
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
  },
  headerCalories: {
    color: '#4B5563', // Darker for better readability
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringsContainer: {
    position: 'relative',
    width: 140,
    height: 140,
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
    fontSize: 24,
  },
  centerSubtext: {
    color: colors.light.textSecondary,
    fontSize: 11,
    marginTop: -2,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendContent: {
    flex: 1,
  },
  legendLabel: {
    color: colors.light.textSecondary,
    fontSize: 11,
    marginBottom: 1,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  legendCurrent: {
    color: '#1F2937', // Darker gray for better contrast (WCAG AA)
    fontSize: 14,
  },
  legendTarget: {
    color: '#6B7280', // Medium gray - still readable but secondary
    fontSize: 12,
    marginLeft: 2,
  },
  legendPercentage: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  legendPercentageComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  legendPercentageText: {
    color: BRAND_COLORS.primary,
    fontSize: 11,
  },
  legendPercentageTextComplete: {
    color: '#10B981',
  },
});

// ============================================================================
// MOCK DATA FOR TESTING
// ============================================================================

export const MOCK_NUTRITION_DATA: NutritionRingsData = {
  calories: { current: 465, target: 1900 },
  protein: { current: 98, target: 105 },
  carbs: { current: 45, target: 171 },
  fat: { current: 7, target: 74 },
};

export default NutritionRingsCard;
