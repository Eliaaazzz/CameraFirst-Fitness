import { Flame } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '@/components/Text';
import { useLanguageStore } from '@/stores';
import { BRAND_COLORS, spacing } from '@/utils';

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
  /** Estimated blood sugar rise in mg/dL (moderate T2 diabetes baseline) */
  bloodSugarRise?: number;
}

interface NutritionRingsCardProps {
  data: NutritionRingsData;
  title?: string;
  showFat?: boolean;
  animated?: boolean;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
}

// ============================================================================
// MACRO COLORS - Consistent & Bold
// ============================================================================

const RING_COLORS = {
  protein: BRAND_COLORS.secondary, // Cyan
  fat: BRAND_COLORS.primary,       // Primary orange
  carbs: '#86EFAC',                // Light green
  calories: BRAND_COLORS.macros.calories,
  bloodSugar: '#E11D48',           // Rose-600 for blood sugar
};

const TRACK_COLOR = '#E5E7EB';

// ============================================================================
// RING CONFIGURATION
// ============================================================================

// Stroke width relative to viewBox (will scale with container)
const STROKE_WIDTH = 18;

interface RingConfig {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  color: string;
  radius: number; // Relative to viewBox center
}

// 3 Rings Layout (Protein outer, Fat middle, Carbs inner)
// ViewBox is 200x200, center at 100,100
// Radii are calculated to fit nicely with gaps
const RING_CONFIGS: RingConfig[] = [
  {
    key: 'protein',
    label: 'Protein',
    color: RING_COLORS.protein,
    radius: 85, // Outer ring
  },
  {
    key: 'fat',
    label: 'Fat',
    color: RING_COLORS.fat,
    radius: 64, // Middle ring
  },
  {
    key: 'carbs',
    label: 'Carbs',
    color: RING_COLORS.carbs,
    radius: 43, // Inner ring
  },
];

// ============================================================================
// ANIMATED RING COMPONENT - Raw SVG Circle
// ============================================================================

interface AnimatedRingProps {
  readonly color: string;
  readonly radius: number;
  readonly percentage: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly animated: boolean;
  readonly delay: number;
}

function AnimatedRing({
  color,
  radius,
  percentage,
  centerX,
  centerY,
  animated,
  delay,
}: AnimatedRingProps) {
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(percentage, 100);
  const targetProgress = clampedPercentage / 100;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        delay,
        withTiming(targetProgress, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      progress.value = targetProgress;
    }
  }, [targetProgress, animated, delay]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return { strokeDashoffset };
  });

  return (
    <>
      {/* Background Track - Gray (Apple Watch style) */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={TRACK_COLOR}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        opacity={1}
        strokeLinecap="round"
      />
      {/* Progress Ring - Rotated -90deg to start from top */}
      <G transform={`rotate(-90, ${centerX}, ${centerY})`}>
        <AnimatedCircle
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
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
  readonly color: string;
  readonly label: string;
  readonly current: number;
  readonly target: number;
  readonly unit: string;
  readonly isCompact?: boolean;
  readonly onPress?: () => void;
}

function LegendItem({ color, label, current, target, unit, isCompact = false, onPress }: LegendItemProps) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.legendItem, 
        isCompact && styles.legendItemCompact,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
      ]}
      onPress={onPress}
    >
      {/* Colored dot indicator */}
      <View style={[styles.legendDot, { backgroundColor: color }]} />

      {/* Label and values */}
      <View style={styles.legendContent}>
        <Text variant="caption" style={styles.legendLabel}>
          {label}
        </Text>
        <View style={styles.legendValues}>
          <Text variant="body" weight="bold" style={styles.legendCurrent}>
            {Math.round(current)}
          </Text>
          <Text variant="caption" style={styles.legendTarget}>
            / {target}{unit}
          </Text>
        </View>
      </View>

      {/* Percentage badge */}
      <View style={[styles.percentBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.percentText, { color }]}>
          {percentage}%
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// BLOOD SUGAR RISE ITEM
// ============================================================================

interface BloodSugarItemProps {
  readonly value: number;
  readonly isCompact?: boolean;
}

function BloodSugarItem({ value, isCompact = false }: BloodSugarItemProps) {
  // Severity: <50 low, 50-100 moderate, >100 high
  const severity = value < 50 ? 'low' : value < 100 ? 'moderate' : 'high';
  const severityLabel = severity === 'low' ? 'Low' : severity === 'moderate' ? 'Med' : 'High';
  const color = RING_COLORS.bloodSugar;

  return (
    <View style={[styles.legendItem, isCompact && styles.legendItemCompact]}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendContent}>
        <Text variant="caption" style={styles.legendLabel}>
          Blood Sugar Est.
        </Text>
        <View style={styles.legendValues}>
          <Text variant="body" weight="bold" style={styles.legendCurrent}>
            +{value}
          </Text>
          <Text variant="caption" style={styles.legendTarget}>
            mg/dL
          </Text>
        </View>
      </View>
      <View style={[styles.percentBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.percentText, { color }]}>
          {severityLabel}
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
  title,
  showFat = true,
  animated = true,
  onMacroPress,
}: NutritionRingsCardProps) {
  const { t } = useLanguageStore();
  const displayTitle = title || t.todaysNutrition;
  const { width } = useWindowDimensions();

  // Breakpoint: below 600px = mobile (vertical stack)
  const isMobile = width < 600;

  const ringConfigs = showFat
    ? RING_CONFIGS
    : RING_CONFIGS.filter((config) => config.key !== 'fat');

  // SVG viewBox dimensions (fixed ratio, scales with container)
  const viewBoxSize = 200;
  const centerX = 100;
  const centerY = 100;

  // Calculate percentages
  const percentages: Record<string, number> = {
    calories: data.calories.target > 0
      ? (data.calories.current / data.calories.target) * 100
      : 0,
    protein: data.protein.target > 0
      ? (data.protein.current / data.protein.target) * 100
      : 0,
    fat: data.fat && data.fat.target > 0
      ? (data.fat.current / data.fat.target) * 100
      : 0,
    carbs: data.carbs.target > 0
      ? (data.carbs.current / data.carbs.target) * 100
      : 0,
  };

  return (
    <View style={[styles.card, webCardShadow as any]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" weight="bold" style={styles.title}>
          {displayTitle}
        </Text>
        <Text variant="caption" style={styles.headerSubtitle}>
          {Math.round(data.calories.current)} / {data.calories.target} kcal
        </Text>
      </View>

      {/* Content: Flex container that wraps */}
      {/* Desktop: flex-row (side-by-side), Mobile: flex-col (stacked) */}
      <View style={[
        styles.content,
        isMobile ? styles.contentMobile : styles.contentDesktop
      ]}>
        {/* LEFT: Rings Container - scales based on parent width */}
        <View style={[
          styles.ringsWrapper,
          isMobile ? styles.ringsWrapperMobile : styles.ringsWrapperDesktop
        ]}>
          <View style={styles.ringsAspectBox}>
            {/* SVG with viewBox for scaling */}
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {ringConfigs.map((config, index) => (
                <AnimatedRing
                  key={config.key}
                  color={config.color}
                  radius={config.radius}
                  percentage={percentages[config.key]}
                  centerX={centerX}
                  centerY={centerY}
                  animated={animated}
                  delay={index * 100}
                />
              ))}
            </Svg>

            {/* Center content - Calories display (NOT a ring) */}
            <Pressable 
              style={({ pressed }) => [
                styles.centerContent,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => onMacroPress?.('calories')}
            >
              <Flame
                size={isMobile ? 24 : 28}
                weight="fill"
                color="#F97316"
              />
              <Text style={
                isMobile
                  ? [styles.centerCalories, styles.centerCaloriesMobile]
                  : styles.centerCalories
              }>
                {Math.round(data.calories.current)}
              </Text>
              {/* Blue Decorator Line */}
              <View style={styles.centerDivider} />
              <Text style={
                isMobile
                  ? [styles.centerSubtext, styles.centerSubtextMobile]
                  : styles.centerSubtext
              }>
                kcal
              </Text>
            </Pressable>
          </View>
        </View>

        {/* RIGHT: Legend - adapts layout based on screen size */}
        <View style={[
          styles.legend,
          isMobile ? styles.legendMobile : styles.legendDesktop
        ]}>
          <LegendItem
            color={RING_COLORS.protein}
            label="Protein"
            current={data.protein.current}
            target={data.protein.target}
            unit="g"
            isCompact={isMobile}
            onPress={() => onMacroPress?.('protein')}
          />
          {showFat && (
            <LegendItem
              color={RING_COLORS.fat}
              label="Fat"
              current={data.fat?.current || 0}
              target={data.fat?.target || 0}
              unit="g"
              isCompact={isMobile}
              onPress={() => onMacroPress?.('fat')}
            />
          )}
          <LegendItem
            color={RING_COLORS.carbs}
            label="Carbs"
            current={data.carbs.current}
            target={data.carbs.target}
            unit="g"
            isCompact={isMobile}
            onPress={() => onMacroPress?.('carbs')}
          />
          {data.bloodSugarRise != null && (
            <BloodSugarItem
              value={data.bloodSugarRise}
              isCompact={isMobile}
            />
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Get calorie subtitle string for use with DashboardCard
 */
export function getCalorieSubtitle(current: number, target: number): string {
  return `${Math.round(current)} / ${target} kcal`;
}

// ============================================================================
// STYLES
// ============================================================================

const webCardShadow = Platform.OS === 'web' ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' } : {};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  headerSubtitle: {
    color: '#6B7280',
  },

  // ========== FLEX CONTAINER ==========
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Desktop: side-by-side (row)
  contentDesktop: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  // Mobile: vertical stack (column)
  contentMobile: {
    flexDirection: 'column',
    gap: spacing.lg,
  },

  // ========== RINGS WRAPPER ==========
  ringsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Desktop: constrained width, side-by-side with legend
  ringsWrapperDesktop: {
    flex: 1,
    maxWidth: 280,
    minWidth: 200,
  },
  // Mobile: full width, centered above legend
  ringsWrapperMobile: {
    width: '100%',
    maxWidth: 260,
  },

  // Aspect ratio box to maintain 1:1 ratio
  ringsAspectBox: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },

  // Center content (calories) - absolutely positioned in center
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  centerCalories: {
    color: '#F97316', // Orange Primary
    fontSize: 36,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  centerCaloriesMobile: {
    fontSize: 28,
  },
  centerDivider: {
    height: 2,
    width: 24,
    backgroundColor: '#06B6D433', // Cyan with opacity
    borderRadius: 1,
    marginVertical: 4,
  },
  centerSubtext: {
    color: '#06B6D4', // Cyan Secondary
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  centerSubtextMobile: {
    fontSize: 10,
  },

  // ========== LEGEND ==========
  legend: {
    justifyContent: 'center',
  },
  // Desktop: vertical list on the right
  legendDesktop: {
    flex: 1,
    minWidth: 180,
    maxWidth: 240,
    gap: spacing.lg,
  },
  // Mobile: below the chart, full width
  legendMobile: {
    width: '100%',
    gap: spacing.md,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendItemCompact: {
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendContent: {
    flex: 1,
    minWidth: 0,
  },
  legendLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 1,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  legendCurrent: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  legendTarget: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
    marginLeft: 2,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default NutritionRingsCard;
