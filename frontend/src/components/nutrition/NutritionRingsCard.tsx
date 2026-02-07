import { Flame } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

  // Outer Ring: Calories - Neon Orange-Red

  calories: '#FF3B30',



  // Second Ring: Protein - Neon Green

  protein: '#34C759',



  // Third Ring: Fat - Neon Yellow/Gold

  fat: '#FFD60A',



  // Inner Ring: Carbs - Electric Blue

  carbs: '#007AFF',

};



// Ring configuration with proper spacing



const STROKE_WIDTH = 22;  // Thicker, more like Apple Watch







interface RingConfig {



  key: 'protein' | 'carbs' | 'fat';



  label: string;



  color: string;



  radius: number;



}







// 3 Rings Layout (Protein, Carbs, Fat)



const RING_CONFIGS: RingConfig[] = [



  {



    key: 'protein',



    label: 'Protein',



    color: RING_COLORS.protein,



    radius: 130, // Outer



  },



  {



    key: 'carbs',



    label: 'Carbs',



    color: RING_COLORS.carbs,



    radius: 104, // Middle



  },



  {



    key: 'fat',



    label: 'Fat',



    color: RING_COLORS.fat,



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

      {/* Background Track - Same color at 15% opacity */}

      <Circle

        cx={centerX}

        cy={centerY}

        r={radius}

        stroke={color}

        strokeWidth={STROKE_WIDTH}

        fill="none"

        opacity={0.15}

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

  readonly color: string;

  readonly label: string;

  readonly current: number;

  readonly target: number;

  readonly unit: string;

}



function LegendItem({ color, label, current, target, unit }: LegendItemProps) {

  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;



  return (

    <View style={styles.legendItem}>

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

    </View>

  );

}



// ============================================================================

// MAIN COMPONENT

// ============================================================================



export function NutritionRingsCard({

  data,

  title,

  showFat = true, // Default to true now as we force render 4 rings

  animated = true,

}: NutritionRingsCardProps) {

  const { t } = useLanguageStore();

  const displayTitle = title || t.todaysNutrition;



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

      <View style={styles.content}>

        {/* Rings Container */}

        <View style={styles.ringsContainer}>

          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>

            {RING_CONFIGS.map((config, index) => (

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

          <View style={styles.centerContent}>

            <Flame

              size={32}

              weight="fill"

              color={RING_COLORS.calories}

            />

            <Text style={styles.centerCalories}>

              {Math.round(data.calories.current)}

            </Text>

            <Text style={styles.centerSubtext}>

              of {data.calories.target} kcal

            </Text>

          </View>

        </View>



        {/* Vertical Legend */}

        <View style={styles.legend}>

          <LegendItem

            color={RING_COLORS.calories}

            label="Calories"

            current={data.calories.current}

            target={data.calories.target}

            unit=""

          />

          <LegendItem

            color={RING_COLORS.protein}

            label="Protein"

            current={data.protein.current}

            target={data.protein.target}

            unit="g"

          />

          <LegendItem

            color={RING_COLORS.fat}

            label="Fat"

            current={data.fat?.current || 0}

            target={data.fat?.target || 0}

            unit="g"

          />

          <LegendItem

            color={RING_COLORS.carbs}

            label="Carbs"

            current={data.carbs.current}

            target={data.carbs.target}

            unit="g"

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

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.xl,

  },

  ringsContainer: {

    position: 'relative',

    width: 320,

    height: 320,

    justifyContent: 'center',

    alignItems: 'center',

  },

  centerContent: {

    position: 'absolute',

    alignItems: 'center',

    justifyContent: 'center',

    width: 100, // Expanded to fit more text

  },

  centerCalories: {

    color: '#111827',

    fontSize: 48, // Text-5xl

    fontWeight: '700',

    marginTop: 4,

    textAlign: 'center',

  },

  centerSubtext: {

    color: '#6B7280',

    fontSize: 14, // Text-sm

    fontWeight: '500',

    marginTop: 2,

    textAlign: 'center',

  },

  // Vertical legend

  legend: {

    flex: 1,

    gap: spacing.xl, // Balanced spacing

    justifyContent: 'center',

  },

  legendItem: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

  },

  legendDot: {

    width: 10,

    height: 10,

    borderRadius: 5,

  },

  legendContent: {

    flex: 1,

  },

  legendLabel: {

    color: '#6B7280',

    fontSize: 13,

    fontWeight: '500',

    marginBottom: 1,

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

  legendTarget: {

    color: '#9CA3AF',

    fontSize: 13,

    fontWeight: '400',

    marginLeft: 2,

  },

  percentBadge: {

    paddingHorizontal: 8,

    paddingVertical: 3,

    borderRadius: 10,

  },

  percentText: {

    fontSize: 11,

    fontWeight: '600',

  },

});



export default NutritionRingsCard;


