/**
 * DailyScoreCard — Vivid 270° gauge with bright metric readouts
 *
 * Redesigned: Whoop Recovery · Tesla Instrument Cluster
 *
 * Computes a 0-100 composite score from:
 *   - Calorie adherence (40%)
 *   - Macro balance (30%)
 *   - Hydration progress (15%)
 *   - Streak bonus (15%)
 *
 * Renders as a 270° animated SVG arc gauge with vivid per-metric
 * breakdown bars. The gauge gap sits at the bottom, creating a
 * classic instrument-panel silhouette.
 */
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { BRAND_COLORS, spacing } from '@/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface DailyScoreData {
  /** Current calorie intake */
  calories: number;
  /** Target calorie intake */
  calorieGoal: number;
  /** Protein current vs target */
  protein: { current: number; goal: number };
  /** Carbs current vs target */
  carbs: { current: number; goal: number };
  /** Fat current vs target */
  fat: { current: number; goal: number };
  /** Hydration cups consumed */
  hydrationCups: number;
  /** Hydration cups goal */
  hydrationGoal: number;
  /** Current streak in days */
  streak: number;
}

interface DailyScoreCardProps {
  data: DailyScoreData;
  animated?: boolean;
}

// ============================================================================
// SCORE CALCULATION
// ============================================================================

function computeDailyScore(data: DailyScoreData): number {
  // 1. Calorie adherence (40%) - how close to target (penalize both over and under)
  const calAdherence = data.calorieGoal > 0
    ? 1 - Math.min(1, Math.abs(data.calories - data.calorieGoal) / data.calorieGoal)
    : 0;

  // 2. Macro balance (30%) - average adherence across protein/carbs/fat
  const macroAdherence = (macro: { current: number; goal: number }) =>
    macro.goal > 0 ? 1 - Math.min(1, Math.abs(macro.current - macro.goal) / macro.goal) : 0;
  const macroScore = (macroAdherence(data.protein) + macroAdherence(data.carbs) + macroAdherence(data.fat)) / 3;

  // 3. Hydration (15%)
  const hydrationScore = data.hydrationGoal > 0
    ? Math.min(1, data.hydrationCups / data.hydrationGoal)
    : 0;

  // 4. Streak bonus (15%) - diminishing returns, cap at 30 days
  const streakScore = Math.min(1, data.streak / 30);

  const raw = calAdherence * 0.4 + macroScore * 0.3 + hydrationScore * 0.15 + streakScore * 0.15;
  return Math.round(raw * 100);
}

// ============================================================================
// VIVID SCORE LABELS & COLORS
// ============================================================================

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Getting Started';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // Vivid emerald
  if (score >= 60) return '#0EA5E9'; // Vivid sky blue
  if (score >= 40) return '#F97316'; // Vivid orange
  return '#EF4444';                  // Vivid red
}

// ============================================================================
// VIVID METRIC PALETTE — Distinct color per readout
// ============================================================================

const METRIC = {
  calories:  { color: '#F97316', tint: 'rgba(249,115,22,0.12)', track: 'rgba(249,115,22,0.08)' },
  macros:    { color: '#06B6D4', tint: 'rgba(6,182,212,0.12)',   track: 'rgba(6,182,212,0.08)' },
  hydration: { color: '#3B82F6', tint: 'rgba(59,130,246,0.12)',  track: 'rgba(59,130,246,0.08)' },
  streak:    { color: '#F59E0B', tint: 'rgba(245,158,11,0.12)',  track: 'rgba(245,158,11,0.08)' },
};

// ============================================================================
// 270° GAUGE ARC CONFIG — Gap centered at bottom
// ============================================================================

const DIAL_SIZE = 140;
const STROKE_WIDTH = 14;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_SWEEP = 0.75;                           // 270° of 360°
const ARC_LENGTH = CIRCUMFERENCE * ARC_SWEEP;
const GAUGE_ROTATION = 135;                        // Start at 7:30, gap at bottom
const TRACK_COLOR = 'rgba(0, 0, 0, 0.06)';

// ============================================================================
// COMPONENT
// ============================================================================

export function DailyScoreCard({ data, animated = true }: DailyScoreCardProps) {
  const score = useMemo(() => computeDailyScore(data), [data]);
  const label = getScoreLabel(score);
  const color = getScoreColor(score);
  const progress = useSharedValue(0);
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 380;

  useEffect(() => {
    const target = score / 100;
    if (animated) {
      progress.value = withDelay(
        200,
        withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) })
      );
    } else {
      progress.value = target;
    }
  }, [score, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - progress.value),
  }));

  const cx = DIAL_SIZE / 2;
  const cy = DIAL_SIZE / 2;

  return (
    <View
      style={[styles.card, BENTO_CARD_WEB_STYLES as any]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Daily score: ${score} out of 100, ${label}`}
    >
      <View style={[styles.row, isNarrow && styles.rowVertical]}>
        {/* 270° Gauge Arc */}
        <View style={styles.dialPanel}>
          <View style={styles.dialContainer}>
            <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
              <G transform={`rotate(${GAUGE_ROTATION}, ${cx}, ${cy})`}>
                {/* Track — full 270° visible arc */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={RADIUS}
                  stroke={TRACK_COLOR}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]}
                />
                {/* Progress — fills from start (7:30) clockwise */}
                <AnimatedCircle
                  cx={cx}
                  cy={cy}
                  r={RADIUS}
                  stroke={color}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]}
                  animatedProps={animatedProps}
                />
              </G>
            </Svg>
            {/* Center: score number + label pill */}
            <View style={styles.dialCenter}>
              <Text variant="heading1" weight="bold" style={[styles.scoreNumber, { color }]}>
                {score}
              </Text>
              <View style={[styles.labelBadge, { backgroundColor: `${color}1A` }]}>
                <Text style={[styles.labelText, { color }]}>{label}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.dialCaption}>Overall pace today</Text>
        </View>

        {/* Metric Breakdown */}
        <View style={styles.breakdown}>
          <Text variant="label" weight="bold" style={styles.breakdownTitle}>DAILY SCORE</Text>
          <MetricBar
            label="Calories"
            value={data.calorieGoal > 0 ? `${data.calories}/${data.calorieGoal}` : '--'}
            percent={data.calorieGoal > 0 ? Math.round((data.calories / data.calorieGoal) * 100) : 0}
            metric={METRIC.calories}
          />
          <MetricBar
            label="Macros"
            value="P/C/F"
            percent={Math.round(
              ((macroPercent(data.protein) + macroPercent(data.carbs) + macroPercent(data.fat)) / 3) * 100
            )}
            metric={METRIC.macros}
          />
          <MetricBar
            label="Hydration"
            value={`${data.hydrationCups}/${data.hydrationGoal}`}
            percent={data.hydrationGoal > 0 ? Math.round((data.hydrationCups / data.hydrationGoal) * 100) : 0}
            metric={METRIC.hydration}
          />
          <MetricBar
            label="Streak"
            value={`${data.streak}d`}
            percent={Math.min(100, Math.round((data.streak / 30) * 100))}
            metric={METRIC.streak}
          />
        </View>
      </View>
    </View>
  );
}

function macroPercent(m: { current: number; goal: number }): number {
  if (m.goal <= 0) return 0;
  return Math.min(1, m.current / m.goal);
}

// ============================================================================
// METRIC BAR — Vivid colored readout with thick progress bar
// ============================================================================

function MetricBar({ label, value, percent, metric }: {
  label: string;
  value: string;
  percent: number;
  metric: { color: string; tint: string; track: string };
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View
      style={styles.metricRow}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}, ${clamped} percent`}
    >
      <View style={styles.metricHeader}>
        <View style={styles.metricLabelRow}>
          <View style={[styles.metricDot, { backgroundColor: metric.color }]} />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValue}>{value}</Text>
          <View style={[styles.metricBadge, { backgroundColor: metric.tint }]}>
            <Text style={[styles.metricBadgeText, { color: metric.color }]}>{clamped}%</Text>
          </View>
        </View>
      </View>
      <View style={[styles.metricTrack, { backgroundColor: metric.track }]}>
        <View style={[styles.metricFill, { width: `${clamped}%`, backgroundColor: metric.color }]} />
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? BENTO_CARD_STYLES : MOBILE_CARD_STYLES),
    padding: spacing.lg,
    ...(Platform.OS !== 'web' ? {
      backgroundColor: '#FFFEFB',
      borderColor: '#E9DED0',
      borderRadius: 28,
      shadowOpacity: 0.05,
    } : {}),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  rowVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.lg,
  },

  // ========== GAUGE ==========
  dialPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF8F1',
    borderWidth: 1,
    borderColor: '#E9E0D4',
    borderRadius: 26,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  dialContainer: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8, // Nudge up slightly since gauge gap is at bottom
  },
  scoreNumber: {
    fontSize: 42,
    lineHeight: 46,
  },
  labelBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dialCaption: {
    color: '#6B665F',
    fontSize: 12,
    marginTop: 6,
  },

  // ========== BREAKDOWN ==========
  breakdown: {
    flex: 1,
    gap: 14,
  },
  breakdownTitle: {
    color: BRAND_COLORS.textPrimary,
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },

  // ========== METRIC BAR ==========
  metricRow: {
    gap: 5,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FBF8F1',
    borderWidth: 1,
    borderColor: '#E9E0D4',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricLabel: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  metricBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  metricBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default DailyScoreCard;
