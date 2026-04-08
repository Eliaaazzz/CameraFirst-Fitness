import { CaretRight, Flame, Info, BookOpen, ArrowSquareOut } from 'phosphor-react-native';
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

import { AIDisclaimer } from '@/components/common/AIDisclaimer';
import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { Text } from '@/components/Text';
import { useLanguageStore } from '@/stores';
import {
  BRAND_COLORS,
  NUTRITION_REFERENCES,
  openExternalUrl,
  spacing,
} from '@/utils';

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
  onSourcesPress?: () => void;
}

// ============================================================================
// MACRO COLORS - Consistent & Bold
// ============================================================================

const RING_COLORS = {
  protein: BRAND_COLORS.secondary, // Cyan
  fat: BRAND_COLORS.primary,       // Primary orange
  carbs: BRAND_COLORS.rings.carbs,  // Olive green
  calories: BRAND_COLORS.macros.calories,
  bloodSugar: BRAND_COLORS.rings.bloodSugar, // Blood sugar ring
};

const TRACK_COLOR = BRAND_COLORS.rings.track;

// ============================================================================
// RING CONFIGURATION
// ============================================================================

// Stroke width relative to viewBox (will scale with container)
const STROKE_WIDTH = 18;

interface RingConfig {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  color: string;
  trackColor: string;
  radius: number;
}

// 3 Rings Layout (Protein outer, Fat middle, Carbs inner)
// ViewBox is 200x200, center at 100,100
// Each ring has its own colored track for brighter readability
const RING_CONFIGS: RingConfig[] = [
  {
    key: 'protein',
    label: 'Protein',
    color: RING_COLORS.protein,
    trackColor: 'rgba(47, 122, 106, 0.18)',
    radius: 85,
  },
  {
    key: 'fat',
    label: 'Fat',
    color: RING_COLORS.fat,
    trackColor: 'rgba(201, 106, 52, 0.18)',
    radius: 64,
  },
  {
    key: 'carbs',
    label: 'Carbs',
    color: RING_COLORS.carbs,
    trackColor: 'rgba(138, 155, 79, 0.18)',
    radius: 43,
  },
];

// ============================================================================
// ANIMATED RING COMPONENT - Raw SVG Circle
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

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return { strokeDashoffset };
  });

  return (
    <>
      {/* Background Track — per-ring color for vivid readout */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={trackColor}
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
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${Math.round(current)} of ${target}${unit}, ${percentage} percent`}
      accessibilityHint={`View ${label.toLowerCase()} details`}
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
  const severity: "low" | "moderate" | "high" = value < 50 ? 'low' : value < 100 ? 'moderate' : 'high';
  const severityLabel = { low: 'Low', moderate: 'Med', high: 'High' }[severity];
  const color = RING_COLORS.bloodSugar;

  return (
    <View
      style={[styles.legendItem, isCompact && styles.legendItemCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Blood sugar estimated rise: plus ${value} milligrams per deciliter, severity ${severityLabel.toLowerCase()}`}
    >
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
  onSourcesPress,
}: NutritionRingsCardProps) {
  const { t } = useLanguageStore();
  const displayTitle = title || t.todaysNutrition;
  const { width } = useWindowDimensions();

  // Breakpoint: below 600px = mobile (vertical stack)
  const isMobile = width < 600;
  // On tablets (iPad), constrain the card width for a balanced look
  const isTablet = !isMobile && Platform.OS !== 'web' && width >= 700;

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
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3" weight="bold" style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
        <View style={styles.headerRight}>
          {onSourcesPress && (
            <Pressable
              onPress={onSourcesPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View nutrition data sources"
              style={({ pressed }) => pressed && { opacity: 0.5 }}
            >
              <Info size={18} color={BRAND_COLORS.textMuted} />
            </Pressable>
          )}
          <Text variant="caption" style={styles.headerSubtitle} numberOfLines={1}>
            {Math.round(data.calories.current)} / {data.calories.target} kcal
          </Text>
        </View>
      </View>

      {/* Content: Flex container that wraps */}
      {/* Desktop: flex-row (side-by-side), Mobile: flex-col (stacked) */}
      <View style={[
        styles.content,
        isMobile ? styles.contentMobile : styles.contentDesktop
      ]}>
        {/* LEFT: Rings Container - scales based on parent width */}
        <View
          style={[
            styles.ringsWrapper,
            isMobile ? styles.ringsWrapperMobile : styles.ringsWrapperDesktop
          ]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`Nutrition rings. Protein: ${Math.round(data.protein.current)} of ${data.protein.target}g, ${Math.round(percentages.protein)} percent. ${showFat && data.fat ? `Fat: ${Math.round(data.fat.current)} of ${data.fat.target}g, ${Math.round(percentages.fat)} percent. ` : ''}Carbs: ${Math.round(data.carbs.current)} of ${data.carbs.target}g, ${Math.round(percentages.carbs)} percent.`}
        >
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
                  trackColor={config.trackColor}
                  radius={config.radius}
                  percentage={percentages[config.key]}
                  centerX={centerX}
                  centerY={centerY}
                  animated={animated}
                  delay={index * 100}
                />
              ))}
              {/* White circle to mask ring tracks behind center content */}
              <Circle
                cx={centerX}
                cy={centerY}
                r={36}
                fill="white"
                opacity={0.97}
              />
            </Svg>

            {/* Center content - Calories display (NOT a ring) */}
            <Pressable
              style={({ pressed }) => [
                styles.centerContent,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
              ]}
              onPress={() => onMacroPress?.('calories')}
              accessibilityRole="button"
              accessibilityLabel={`Calories: ${Math.round(data.calories.current)} of ${data.calories.target}, ${data.calories.target > 0 ? Math.round((data.calories.current / data.calories.target) * 100) : 0} percent`}
              accessibilityHint="View calorie details"
            >
              <Flame
                size={isMobile ? 20 : 22}
                weight="fill"
                color={BRAND_COLORS.primary}
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
                KCAL
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
          {data.bloodSugarRise != null && (
            <AIDisclaimer compact />
          )}
        </View>
      </View>

      {/* Citation footer — Apple 1.4.1: single clear source with data values */}
      <View style={styles.citationFooter}>
        <View style={styles.citationHeader}>
          <BookOpen size={12} color={BRAND_COLORS.textSecondary} />
          <Text style={styles.citationLabel}>Source</Text>
        </View>
        <Text style={styles.targetSourceBody}>
          Targets based on FDA Daily Values: 2,000 kcal · Protein 50 g · Carbs 275 g · Fat 78 g
        </Text>
        <Pressable
          onPress={() => openExternalUrl(
            NUTRITION_REFERENCES.fdaDailyValues.url,
            'Unable to open source',
            'Please open the FDA reference in your browser.'
          )}
          accessibilityRole="link"
          accessibilityLabel={NUTRITION_REFERENCES.fdaDailyValues.title}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <View style={styles.citationLinkRow}>
            <ArrowSquareOut size={11} color={BRAND_COLORS.secondary} />
            <Text style={styles.citationLink}>{NUTRITION_REFERENCES.fdaDailyValues.shortLabel}</Text>
          </View>
        </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  headerSubtitle: {
    color: '#374151',
    flexShrink: 0,
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
    color: BRAND_COLORS.primary,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    marginTop: 1,
    textAlign: 'center',
  },
  centerCaloriesMobile: {
    fontSize: 26,
    lineHeight: 32,
  },
  centerDivider: {
    height: 1.5,
    width: 20,
    backgroundColor: `${BRAND_COLORS.secondary}33`,
    borderRadius: 1,
    marginVertical: 2,
  },
  centerSubtext: {
    color: BRAND_COLORS.secondary,
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
    width: 4,
    height: 34,
    borderRadius: 2,
    flexShrink: 0,
  },
  legendContent: {
    flex: 1,
    minWidth: 0,
  },
  legendLabel: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 1,
  },
  legendValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  legendCurrent: {
    color: BRAND_COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  legendTarget: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 2,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ========== CITATION FOOTER — Apple 1.4.1 direct links ==========
  citationFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17, 17, 17, 0.08)',
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    gap: 6,
  },
  targetSourceCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#FBF8F2',
    borderWidth: 1,
    borderColor: '#E8E1D4',
    gap: 6,
  },
  targetSourceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND_COLORS.textPrimary,
  },
  targetSourceBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },
  targetSourceMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: BRAND_COLORS.textMuted,
  },
  targetSourceDetail: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4B5563',
  },
  citationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  citationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_COLORS.textSecondary,
  },
  citationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  citationLink: {
    fontSize: 11,
    fontWeight: '500',
    color: BRAND_COLORS.secondary,
    textDecorationLine: 'underline',
  },
  citationMore: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND_COLORS.textMuted,
    marginTop: 2,
  },
});

export default NutritionRingsCard;
