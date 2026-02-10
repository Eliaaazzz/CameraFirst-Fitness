import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { DotsThree, Fire } from 'phosphor-react-native';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { Text } from '@/components/Text';
import { BRAND_COLORS, colors, radii, saasShadows, spacing } from '@/utils';

// Create animated SVG circle for native
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface MacroData {
  current: number;
  target: number;
}

export interface NutritionCardData {
  calories: MacroData;
  macros: {
    protein: MacroData;
    carbs: MacroData;
    fat: MacroData;
  };
}

interface NutritionCardProps {
  data: NutritionCardData;
  onEdit?: () => void;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  animated?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MACRO_COLORS = {
  protein: BRAND_COLORS.macros.protein,
  fat: BRAND_COLORS.macros.fat,
  carbs: BRAND_COLORS.macros.carbs,
};

const GAUGE_COLORS = {
  progress: BRAND_COLORS.macros.calories,
  track: '#F3F4F6',    // Gray-100
};

// ============================================================================
// ANIMATED PROGRESS BAR COMPONENT
// ============================================================================

interface MacroProgressProps {
  label: string;
  current: number;
  target: number;
  color: string;
  delay?: number;
  animated?: boolean;
  onPress?: () => void;
}

function MacroProgress({ label, current, target, color, delay = 0, animated = true, onPress }: MacroProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        delay,
        withTiming(percentage, {
          duration: 1000,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      progress.value = percentage;
    }
  }, [percentage, animated, delay]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Pressable 
      style={({ pressed }) => [styles.macroItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {/* Label */}
      <Text variant="caption" weight="bold" style={styles.macroLabel}>{label}</Text>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: color },
              progressStyle
            ]}
          />
        </View>
      </View>

      {/* Values */}
      <View style={styles.macroValueRow}>
        <Text variant="caption" weight="semibold" style={styles.macroCurrentValue}>
          {Math.round(current)}
        </Text>
        <Text variant="caption" style={styles.macroTargetValue}>
          /{target} g
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================================
// SEMI-CIRCLE GAUGE COMPONENT (RECHARTS - WEB)
// ============================================================================

interface SemiCircleGaugeProps {
  current: number;
  target: number;
  animated?: boolean;
}

function SemiCircleGaugeWeb({ current, target, animated = true }: SemiCircleGaugeProps) {
  const consumed = Math.min(current, target);
  const remaining = Math.max(target - current, 0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = 1;
    }
  }, [animated]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1]) }],
  }));

  // Data for semi-circle: consumed + remaining
  const data = useMemo(() => [
    { name: 'consumed', value: consumed, color: GAUGE_COLORS.progress },
    { name: 'remaining', value: remaining, color: GAUGE_COLORS.track },
  ], [consumed, remaining]);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="75%"           // Key: Push center down for semi-circle
              startAngle={180}
              endAngle={0}
              innerRadius={85}
              outerRadius={105}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={10}  // Modern rounded ends
              isAnimationActive={animated}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </View>

      {/* Center label - positioned absolutely */}
      <Animated.View style={[styles.gaugeCenterLabel, labelStyle]}>
        <Fire size={24} weight="fill" color="#F97316" style={styles.fireIcon} />
        <Text style={styles.gaugeValue}>{current}</Text>
        <Text variant="caption" style={styles.gaugeUnit}>
          of {target} kcal
        </Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// SEMI-CIRCLE GAUGE COMPONENT (SVG - NATIVE iOS/Android)
// ============================================================================

function SemiCircleGaugeNative({ current, target, animated = true }: SemiCircleGaugeProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const progress = useSharedValue(0);

  // SVG dimensions
  const size = 220;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  // Semi-circle circumference (half of full circle)
  const semiCircumference = Math.PI * radius;

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(percentage / 100, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = percentage / 100;
    }
  }, [percentage, animated]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = semiCircumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.9, 1]) }],
  }));

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.nativeSvgWrapper}>
        <Svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
          <Defs>
            <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FB923C" />
              <Stop offset="100%" stopColor="#F97316" />
            </LinearGradient>
          </Defs>

          {/* Background track (semi-circle) */}
          <G transform={`rotate(180, ${centerX}, ${centerY})`}>
            <Circle
              cx={centerX}
              cy={centerY}
              r={radius}
              stroke={GAUGE_COLORS.track}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${semiCircumference} ${semiCircumference}`}
            />
          </G>

          {/* Progress arc (semi-circle) */}
          <G transform={`rotate(180, ${centerX}, ${centerY})`}>
            <AnimatedCircle
              cx={centerX}
              cy={centerY}
              r={radius}
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={semiCircumference}
              animatedProps={animatedProps}
            />
          </G>
        </Svg>
      </View>

      {/* Center label */}
      <Animated.View style={[styles.gaugeCenterLabelNative, labelStyle]}>
        <Fire size={24} weight="fill" color="#F97316" style={styles.fireIcon} />
        <Text style={styles.gaugeValue}>{current}</Text>
        <Text variant="caption" style={styles.gaugeUnit}>
          of {target} kcal
        </Text>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionCard({ data, onEdit, onMacroPress, animated = true }: NutritionCardProps) {
  const GaugeComponent = Platform.OS === 'web' ? SemiCircleGaugeWeb : SemiCircleGaugeNative;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Fire size={20} weight="fill" color="#F97316" />
          <Text variant="heading3" weight="bold" style={styles.title}>
            Calories
          </Text>
        </View>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.editButtonPressed
          ]}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <DotsThree size={24} weight="bold" color={colors.light.textMuted} />
        </Pressable>
      </View>

      {/* Semi-Circle Gauge */}
      <Pressable 
        style={({ pressed }) => pressed && { opacity: 0.8 }}
        onPress={() => onMacroPress?.('calories')}
      >
        <GaugeComponent
          current={data.calories.current}
          target={data.calories.target}
          animated={animated}
        />
      </Pressable>

      {/* Macro Progress Bars */}
      <View style={styles.macrosContainer}>
        <MacroProgress
          label="Protein"
          current={data.macros.protein.current}
          target={data.macros.protein.target}
          color={MACRO_COLORS.protein}
          delay={400}
          animated={animated}
          onPress={() => onMacroPress?.('protein')}
        />
        <MacroProgress
          label="Fat"
          current={data.macros.fat.current}
          target={data.macros.fat.target}
          color={MACRO_COLORS.fat}
          delay={500}
          animated={animated}
          onPress={() => onMacroPress?.('fat')}
        />
        <MacroProgress
          label="Carbs"
          current={data.macros.carbs.current}
          target={data.macros.carbs.target}
          color={MACRO_COLORS.carbs}
          delay={600}
          animated={animated}
          onPress={() => onMacroPress?.('carbs')}
        />
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
    borderRadius: 32,          // More rounded for Bento style
    borderWidth: 1,
    borderColor: colors.light.borderSubtle,
    padding: spacing.xl,
    ...saasShadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.light.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  editButtonPressed: {
    backgroundColor: colors.light.primaryTint,
  },

  // Gauge styles
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 180,
    marginTop: -spacing.sm,
  },
  chartWrapper: {
    width: '100%',
    height: 180,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  nativeSvgWrapper: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  gaugeCenterLabel: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenterLabelNative: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireIcon: {
    marginBottom: 4,
  },
  gaugeValue: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.light.textPrimary,
    lineHeight: 52,
    letterSpacing: -1,
  },
  gaugeUnit: {
    fontSize: 14,
    color: colors.light.textMuted,
    marginTop: 4,
  },

  // Macro progress styles
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  macroItem: {
    flex: 1,
  },
  macroLabel: {
    color: colors.light.textPrimary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroCurrentValue: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
  macroTargetValue: {
    color: colors.light.textMuted,
    fontSize: 12,
  },
});

// ============================================================================
// SAMPLE DATA FOR TESTING (matches the design mockup)
// ============================================================================

export const SAMPLE_NUTRITION_DATA: NutritionCardData = {
  calories: { current: 1721, target: 2213 },
  macros: {
    protein: { current: 11, target: 84 },
    carbs: { current: 338, target: 338 },
    fat: { current: 25, target: 63 },
  },
};

export default NutritionCard;
