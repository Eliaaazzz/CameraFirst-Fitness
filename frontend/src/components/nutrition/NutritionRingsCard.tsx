/**
 * NutritionRingsCard — Apple Fitness-grade nutrition rings.
 *
 * Design rules applied:
 * - Stroke 12px (down from 18) with round caps
 * - Track color: 6% opacity of ring's own color (near-invisible)
 * - Legend: 8px dots (not bars), no pill badges — colored bold % text only
 * - Data-first typography: numbers black+bold, units light gray
 * - No dividers — whitespace separates
 * - Card: 14px radius, micro-shadow, no border
 */
import { Flame, BookOpen, ArrowSquareOut } from 'phosphor-react-native';
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

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { Text } from '@/components/Text';
import { useLanguageStore } from '@/stores';
import {
  BRAND_COLORS,
  NUTRITION_REFERENCES,
  openExternalUrl,
  spacing,
} from '@/utils';

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
  bloodSugarRise?: number;
}

interface NutritionRingsCardProps {
  data: NutritionRingsData;
  title?: string;
  showFat?: boolean;
  animated?: boolean;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  onSourcesPress?: () => void;
}

// ============================================================================
// VIVID RING COLORS — Apple Fitness saturation level
// ============================================================================

const RING_COLORS = {
  protein: '#0D9488',   // Vivid teal (up from muted #2F7A6A)
  fat: '#EA580C',       // Vivid orange (up from muted #C96A34)
  carbs: '#65A30D',     // Vivid lime (up from muted #8A9B4F)
};

// ============================================================================
// RING CONFIGURATION — thinner, more elegant
// ============================================================================

const STROKE_WIDTH = 12; // Down from 18 — thinner, more refined

interface RingConfig {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  color: string;
  trackColor: string;
  radius: number;
}

const RING_CONFIGS: RingConfig[] = [
  {
    key: 'protein',
    label: 'Protein',
    color: RING_COLORS.protein,
    trackColor: 'rgba(13, 148, 136, 0.07)', // 7% opacity — near invisible
    radius: 85,
  },
  {
    key: 'fat',
    label: 'Fat',
    color: RING_COLORS.fat,
    trackColor: 'rgba(234, 88, 12, 0.07)',
    radius: 66,
  },
  {
    key: 'carbs',
    label: 'Carbs',
    color: RING_COLORS.carbs,
    trackColor: 'rgba(101, 163, 13, 0.07)',
    radius: 47,
  },
];

// ============================================================================
// ANIMATED RING
// ============================================================================

interface AnimatedRingProps {
  readonly color: string;
  readonly trackColor: string;
  readonly radius: number;
  readonly percentage: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly animated: boolean;
  readonly delay: number;
}

function AnimatedRing({
  color,
  trackColor,
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

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <>
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={trackColor}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeLinecap="round"
      />
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
// LEGEND ITEM — Apple Fitness style: dot + data-first typography
// ============================================================================

function LegendItem({ color, label, current, target, unit, onPress }: {
  color: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  onPress?: () => void;
}) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.legendItem,
        pressed && { opacity: 0.7 }
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${Math.round(current)} of ${target}${unit}, ${percentage} percent`}
    >
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendContent}>
        <Text style={styles.legendLabel}>{label}</Text>
        <View style={styles.legendValues}>
          <Text style={styles.legendCurrent}>{Math.round(current)}</Text>
          <Text style={styles.legendTarget}>/ {target}{unit}</Text>
        </View>
      </View>
      {/* No pill badge — just colored bold text */}
      <Text style={[styles.legendPercent, { color }]}>{percentage}%</Text>
    </Pressable>
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
  onSourcesPress,
}: NutritionRingsCardProps) {
  const { t } = useLanguageStore();
  const displayTitle = title || t.todaysNutrition;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isTablet = !isMobile && Platform.OS !== 'web' && width >= 700;

  const ringConfigs = showFat
    ? RING_CONFIGS
    : RING_CONFIGS.filter((config) => config.key !== 'fat');

  const viewBoxSize = 200;
  const centerX = 100;
  const centerY = 100;

  const percentages: Record<string, number> = {
    calories: data.calories.target > 0 ? (data.calories.current / data.calories.target) * 100 : 0,
    protein: data.protein.target > 0 ? (data.protein.current / data.protein.target) * 100 : 0,
    fat: data.fat && data.fat.target > 0 ? (data.fat.current / data.fat.target) * 100 : 0,
    carbs: data.carbs.target > 0 ? (data.carbs.current / data.carbs.target) * 100 : 0,
  };

  return (
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      {/* Header — minimal */}
      <View style={styles.header}>
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      {/* Content */}
      <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
        {/* Rings */}
        <View style={[styles.ringsWrapper, isMobile ? styles.ringsWrapperMobile : styles.ringsWrapperDesktop]}
          accessible accessibilityRole="summary"
          accessibilityLabel={`Nutrition rings. Protein: ${Math.round(percentages.protein)}%. Fat: ${Math.round(percentages.fat)}%. Carbs: ${Math.round(percentages.carbs)}%.`}
        >
          <View style={styles.ringsAspectBox}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} preserveAspectRatio="xMidYMid meet">
              {ringConfigs.map((config, index) => (
                <AnimatedRing
                  key={config.key}
                  color={config.color}
                  trackColor={config.trackColor}
                  radius={config.radius}
                  percentage={percentages[config.key]}
                  centerX={centerX}
                  centerY={centerY}
                  animated={animated}
                  delay={index * 100}
                />
              ))}
              <Circle cx={centerX} cy={centerY} r={38} fill="white" />
            </Svg>

            {/* Center calories */}
            <Pressable
              style={({ pressed }) => [styles.centerContent, pressed && { opacity: 0.7 }]}
              onPress={() => onMacroPress?.('calories')}
              accessibilityRole="button"
              accessibilityLabel={`Calories: ${Math.round(data.calories.current)} of ${data.calories.target}`}
            >
              <Flame size={isMobile ? 18 : 20} weight="fill" color="#111111" />
              <Text style={isMobile ? [styles.centerCalories, styles.centerCaloriesMobile] : styles.centerCalories}>
                {Math.round(data.calories.current)}
              </Text>
              <Text style={styles.centerSubtext}>kcal</Text>
            </Pressable>
          </View>
        </View>

        {/* Legend */}
        <View style={[styles.legend, isMobile ? styles.legendMobile : styles.legendDesktop]}>
          <LegendItem color={RING_COLORS.protein} label="Protein" current={data.protein.current} target={data.protein.target} unit="g" onPress={() => onMacroPress?.('protein')} />
          {showFat && <LegendItem color={RING_COLORS.fat} label="Fat" current={data.fat?.current || 0} target={data.fat?.target || 0} unit="g" onPress={() => onMacroPress?.('fat')} />}
          <LegendItem color={RING_COLORS.carbs} label="Carbs" current={data.carbs.current} target={data.carbs.target} unit="g" onPress={() => onMacroPress?.('carbs')} />
        </View>
      </View>

      {/* Citation footnote */}
      <Pressable
        style={styles.citationFootnote}
        onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open source', 'Please open the FDA reference in your browser.')}
        accessibilityRole="link"
        accessibilityLabel={NUTRITION_REFERENCES.fdaDailyValues.title}
      >
        <BookOpen size={11} color="#9CA3AF" />
        <Text style={styles.citationText}>Source: FDA Daily Values (2,000 kcal · 50g P · 275g C · 78g F)</Text>
        <ArrowSquareOut size={10} color="#9CA3AF" />
      </Pressable>
    </View>
  );
}

export function getCalorieSubtitle(current: number, target: number): string {
  return `${Math.round(current)} / ${target} kcal`;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    overflow: 'hidden' as const,
  },
  cardTablet: {
    maxWidth: 700,
    alignSelf: 'center' as const,
    width: '100%' as any,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    color: '#6B7280', // Gray — subordinate to section title
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentDesktop: {
    flexDirection: 'row',
    gap: 32,
  },
  contentMobile: {
    flexDirection: 'column',
    gap: spacing.lg,
  },

  ringsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsWrapperDesktop: {
    flex: 1,
    maxWidth: 260,
    minWidth: 200,
  },
  ringsWrapperMobile: {
    width: '100%',
    maxWidth: 240,
  },
  ringsAspectBox: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },

  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCalories: {
    color: '#111111',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  centerCaloriesMobile: {
    fontSize: 28,
    lineHeight: 32,
  },
  centerSubtext: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    marginTop: 1,
  },

  legend: {
    justifyContent: 'center',
  },
  legendDesktop: {
    flex: 1,
    minWidth: 180,
    maxWidth: 260,
    gap: 20,
  },
  legendMobile: {
    width: '100%',
    gap: 16,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  legendTarget: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 3,
  },
  legendPercent: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },

  citationFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 14,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  citationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
  },
});

export default NutritionRingsCard;
