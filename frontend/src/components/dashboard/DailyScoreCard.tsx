/**
 * DailyScoreCard — 270° gauge + metric breakdown.
 *
 * Design rules applied:
 * - Gauge stroke: 10px (down from 14) — thinner, more refined
 * - No box-in-box: metric rows on white, no tinted backgrounds or borders
 * - Percentage: colored bold text only, no pill background
 * - Track bars: 4px thin, 5% opacity track
 * - Data-first: numbers bold black, labels light gray
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
import { spacing } from '@/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface DailyScoreData {
  calories: number;
  calorieGoal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  hydrationCups: number;
  hydrationGoal: number;
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
  const calAdherence = data.calorieGoal > 0
    ? 1 - Math.min(1, Math.abs(data.calories - data.calorieGoal) / data.calorieGoal) : 0;
  const macroAdherence = (m: { current: number; goal: number }) =>
    m.goal > 0 ? 1 - Math.min(1, Math.abs(m.current - m.goal) / m.goal) : 0;
  const macroScore = (macroAdherence(data.protein) + macroAdherence(data.carbs) + macroAdherence(data.fat)) / 3;
  const hydrationScore = data.hydrationGoal > 0 ? Math.min(1, data.hydrationCups / data.hydrationGoal) : 0;
  const streakScore = Math.min(1, data.streak / 30);
  return Math.round((calAdherence * 0.4 + macroScore * 0.3 + hydrationScore * 0.15 + streakScore * 0.15) * 100);
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Getting Started';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#0EA5E9';
  if (score >= 40) return '#F97316';
  return '#EF4444';
}

// ============================================================================
// METRIC PALETTE
// ============================================================================

const METRIC = {
  calories:  { color: '#F97316', track: 'rgba(249,115,22,0.06)' },
  macros:    { color: '#0D9488', track: 'rgba(13,148,136,0.06)' },
  hydration: { color: '#3B82F6', track: 'rgba(59,130,246,0.06)' },
  streak:    { color: '#F59E0B', track: 'rgba(245,158,11,0.06)' },
};

// ============================================================================
// GAUGE CONFIG — thinner stroke
// ============================================================================

const DIAL_SIZE = 120;
const STROKE_WIDTH = 10;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_SWEEP = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_SWEEP;
const GAUGE_ROTATION = 135;

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
    progress.value = animated
      ? withDelay(200, withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) }))
      : target;
  }, [score, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - progress.value),
  }));

  const cx = DIAL_SIZE / 2;
  const cy = DIAL_SIZE / 2;

  return (
    <View
      style={[styles.card, BENTO_CARD_WEB_STYLES as any]}
      accessible accessibilityRole="summary"
      accessibilityLabel={`Daily score: ${score} out of 100, ${label}`}
    >
      <Text style={styles.sectionLabel}>Daily Score</Text>

      <View style={[styles.row, isNarrow && styles.rowVertical]}>
        {/* Gauge */}
        <View style={styles.dialContainer}>
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
            <G transform={`rotate(${GAUGE_ROTATION}, ${cx}, ${cy})`}>
              <Circle cx={cx} cy={cy} r={RADIUS} stroke="rgba(0,0,0,0.04)" strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]} />
              <AnimatedCircle cx={cx} cy={cy} r={RADIUS} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]} animatedProps={animatedProps} />
            </G>
          </Svg>
          <View style={styles.dialCenter}>
            <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <MetricRow label="Calories" value={data.calorieGoal > 0 ? `${data.calories}/${data.calorieGoal}` : '--'} percent={data.calorieGoal > 0 ? Math.round((data.calories / data.calorieGoal) * 100) : 0} metric={METRIC.calories} />
          <MetricRow label="Macros" value="P/C/F" percent={Math.round(((mp(data.protein) + mp(data.carbs) + mp(data.fat)) / 3) * 100)} metric={METRIC.macros} />
          <MetricRow label="Hydration" value={`${data.hydrationCups}/${data.hydrationGoal}`} percent={data.hydrationGoal > 0 ? Math.round((data.hydrationCups / data.hydrationGoal) * 100) : 0} metric={METRIC.hydration} />
          <MetricRow label="Streak" value={`${data.streak}d`} percent={Math.min(100, Math.round((data.streak / 30) * 100))} metric={METRIC.streak} />
        </View>
      </View>
    </View>
  );
}

function mp(m: { current: number; goal: number }): number {
  return m.goal > 0 ? Math.min(1, m.current / m.goal) : 0;
}

// ============================================================================
// METRIC ROW — clean, no box-in-box
// ============================================================================

function MetricRow({ label, value, percent, metric }: {
  label: string; value: string; percent: number;
  metric: { color: string; track: string };
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <View style={styles.metricRow} accessibilityRole="text" accessibilityLabel={`${label}: ${value}, ${clamped}%`}>
      <View style={styles.metricHeader}>
        <View style={styles.metricLabelRow}>
          <View style={[styles.metricDot, { backgroundColor: metric.color }]} />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={[styles.metricPercent, { color: metric.color }]}>{clamped}%</Text>
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
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  rowVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.lg,
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
    paddingBottom: 6,
  },
  scoreNumber: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  breakdown: {
    flex: 1,
    gap: 12,
  },

  metricRow: {
    gap: 5,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '400',
  },
  metricPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  metricTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default DailyScoreCard;
