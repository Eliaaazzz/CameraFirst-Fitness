import { Flame } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
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
}

interface NutritionRingsCardProps {
  data: NutritionRingsData;
  title?: string;
  showFat?: boolean;
  animated?: boolean;
}

// ============================================================================

// APPLE WATCH NEON COLORS - Vibrant & Bold

// ============================================================================



const RING_COLORS = {
  // Rings
  protein: '#34C759', // Green
  fat: '#FF3B30', // Red
  carbs: '#007AFF', // Blue

  // Center icon / accents
  calories: '#FF9500', // Orange
};

const TRACK_COLOR = '#E5E7EB';



// Ring configuration with proper spacing



const STROKE_WIDTH = 22;  // Thicker, more like Apple Watch







interface RingConfig {



  key: 'protein' | 'carbs' | 'fat';



  label: string;



  color: string;



  radius: number;



}







// 3 Rings Layout (Protein, Fat, Carbs)



const RING_CONFIGS: RingConfig[] = [



  {



    key: 'protein',



    label: 'Protein',



    color: RING_COLORS.protein,



    radius: 130, // Outer



  },



  {



    key: 'fat',



    label: 'Fat',



    color: RING_COLORS.fat,



    radius: 104, // Middle



  },



  {



    key: 'carbs',



    label: 'Carbs',



    color: RING_COLORS.carbs,



    radius: 78,  // Inner



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

  // Calculate circumference

  const circumference = 2 * Math.PI * radius;



  // Clamp percentage to 100% for visual

  const clampedPercentage = Math.min(percentage, 100);



  // Animated progress value

  const progress = useSharedValue(0);



  useEffect(() => {

    if (animated) {

      progress.value = withDelay(

        delay,

        withTiming(clampedPercentage / 100, {

          duration: 800,

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



  return (

    <>

      {/* Background Track - Gray track (Apple Watch style) */}

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

  readonly compact?: boolean;

}



function LegendItem({ color, label, current, target, unit, compact = false }: LegendItemProps) {

  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;



  return (

    <View style={[styles.legendItem, compact && styles.legendItemCompact]}>

      {/* Colored dot indicator */}

      <View
        style={[
          styles.legendDot,
          compact && styles.legendDotCompact,
          { backgroundColor: color },
        ]}
      />



      {/* Label and values */}

      <View style={styles.legendContent}>

        <Text
          variant="caption"
          style={compact ? [styles.legendLabel, styles.legendLabelCompact] : styles.legendLabel}
        >

          {label}

        </Text>

        <View style={styles.legendValues}>

          <Text
            variant="body"
            weight="bold"
            style={compact ? [styles.legendCurrent, styles.legendCurrentCompact] : styles.legendCurrent}
          >

            {Math.round(current)}

          </Text>

          <Text
            variant="caption"
            style={compact ? [styles.legendTarget, styles.legendTargetCompact] : styles.legendTarget}
          >

            / {target}{unit}

          </Text>

        </View>

      </View>



      {/* Percentage badge */}

      <View style={[styles.percentBadge, compact && styles.percentBadgeCompact, { backgroundColor: `${color}20` }]}>

        <Text
          style={
            compact
              ? [styles.percentText, styles.percentTextCompact, { color }]
              : [styles.percentText, { color }]
          }
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

  title,

  showFat = true,

  animated = true,

}: NutritionRingsCardProps) {

  const { t } = useLanguageStore();

  const displayTitle = title || t.todaysNutrition;

  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const ringConfigs = showFat
    ? RING_CONFIGS
    : RING_CONFIGS.filter((config) => config.key !== 'fat');



  // SVG dimensions - Balanced

  const svgSize = 320;

  const centerX = 160;

  const centerY = 160;



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



      {/* Content: Rings + Legend */}

      <View style={[styles.content, isCompact ? styles.contentCompact : styles.contentWide]}>

        {/* Rings Container */}

        <View style={[styles.ringsContainer, isCompact && styles.ringsContainerCompact]}>

          <Svg width="100%" height="100%" viewBox={`0 0 ${svgSize} ${svgSize}`}>

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



          {/* Center content - Fits inside r=70 (Diameter 140) */}

          <View style={[styles.centerContent, isCompact && styles.centerContentCompact]}>

            <Flame

              size={isCompact ? 28 : 32}

              weight="fill"

              color={RING_COLORS.calories}

            />

            <Text
              style={isCompact ? [styles.centerCalories, styles.centerCaloriesCompact] : styles.centerCalories}
            >

              {Math.round(data.calories.current)}

            </Text>

            <Text style={isCompact ? [styles.centerSubtext, styles.centerSubtextCompact] : styles.centerSubtext}>

              of {data.calories.target} kcal

            </Text>

          </View>

        </View>



        {/* Vertical Legend */}

        <View style={[styles.legend, isCompact && styles.legendCompact]}>

          <LegendItem

            color={RING_COLORS.calories}

            label="Calories"

            current={data.calories.current}

            target={data.calories.target}

            unit=""

            compact={isCompact}

          />

          <LegendItem

            color={RING_COLORS.protein}

            label="Protein"

            current={data.protein.current}

            target={data.protein.target}

            unit="g"

            compact={isCompact}

          />

          {showFat && (
            <LegendItem
              color={RING_COLORS.fat}
              label="Fat"
              current={data.fat?.current || 0}
              target={data.fat?.target || 0}
              unit="g"
              compact={isCompact}
            />
          )}

          <LegendItem

            color={RING_COLORS.carbs}

            label="Carbs"

            current={data.carbs.current}

            target={data.carbs.target}

            unit="g"

            compact={isCompact}

          />

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

  content: {

    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',

  },

  contentWide: {
    flexDirection: 'row',
    gap: spacing.xl,
  },

  contentCompact: {
    flexDirection: 'column',
    gap: spacing.lg,
  },

  ringsContainer: {

    position: 'relative',

    flexGrow: 1,
    flexShrink: 1,
    minWidth: 240,
    aspectRatio: 1,
    justifyContent: 'center',

    alignItems: 'center',

    padding: spacing.md,

  },

  ringsContainerCompact: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    alignSelf: 'stretch',
  },

  centerContent: {

    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: spacing.sm,

  },

  centerContentCompact: {
    paddingHorizontal: spacing.xs,
  },

  centerCalories: {

    color: '#111827',

    fontSize: 48, // Text-5xl

    fontWeight: '700',

    marginTop: 4,

    textAlign: 'center',

  },

  centerCaloriesCompact: {
    fontSize: 40,
  },

  centerSubtext: {

    color: '#6B7280',

    fontSize: 14, // Text-sm

    fontWeight: '500',

    marginTop: 2,

    textAlign: 'center',

  },

  centerSubtextCompact: {
    fontSize: 12,
  },

  // Vertical legend

  legend: {

    flexGrow: 1,
    flexShrink: 1,
    minWidth: 220,
    alignSelf: 'stretch',

    gap: spacing.xl, // Balanced spacing

    justifyContent: 'center',

  },

  legendCompact: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    width: '100%',
    gap: spacing.md,
  },

  legendItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    flexWrap: 'wrap',

  },

  legendItemCompact: {
    gap: spacing.xs,
  },

  legendDot: {

    width: 10,

    height: 10,

    borderRadius: 5,

  },

  legendDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendContent: {

    flex: 1,

    minWidth: 0,

  },

  legendLabel: {

    color: '#6B7280',

    fontSize: 13,

    fontWeight: '500',

    marginBottom: 1,

  },

  legendLabelCompact: {
    fontSize: 12,
  },

  legendValues: {

    flexDirection: 'row',

    alignItems: 'baseline',

  },

  legendCurrent: {

    color: '#111827',

    fontSize: 16,

    fontWeight: '700',

  },

  legendCurrentCompact: {
    fontSize: 15,
  },

  legendTarget: {

    color: '#9CA3AF',

    fontSize: 13,

    fontWeight: '400',

    marginLeft: 2,

  },

  legendTargetCompact: {
    fontSize: 12,
  },

  percentBadge: {

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 10,

    flexShrink: 0,

  },

  percentBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },

  percentText: {

    fontSize: 11,

    fontWeight: '600',

  },

  percentTextCompact: {
    fontSize: 10,
  },

});



export default NutritionRingsCard;
