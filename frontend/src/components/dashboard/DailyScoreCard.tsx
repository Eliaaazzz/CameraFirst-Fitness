/**
 * DailyScoreCard - Whoop/Oura-inspired daily score dial
 *
 * Computes a 0-100 composite score from:
 *   - Calorie adherence (40%)
 *   - Macro balance (30%)
 *   - Hydration progress (15%)
 *   - Streak bonus (15%)
 *
 * Renders as an animated SVG arc with color gradient.
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
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

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

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Getting Started';
}

function getScoreColor(score: number): string {
  if (score >= 80) return BRAND_COLORS.semantic.info;
  if (score >= 60) return BRAND_COLORS.semantic.success;
  if (score >= 40) return BRAND_COLORS.primary;
  return BRAND_COLORS.semantic.error;
}

// ============================================================================
// COMPONENT
// ============================================================================

const DIAL_SIZE = 140;
const STROKE_WIDTH = 10;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_COLOR = 'rgba(0,0,0,0.06)';

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
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View
      style={[styles.card, BENTO_CARD_WEB_STYLES as any]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Daily score: ${score} out of 100, ${label}`}
    >
      <View style={[styles.row, isNarrow && styles.rowVertical]}>
        {/* Score Dial */}
        <View style={styles.dialContainer}>
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
            <Defs>
              <SvgGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor={color} stopOpacity={1} />
                <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </SvgGradient>
            </Defs>
            {/* Track */}
            <Circle
              cx={DIAL_SIZE / 2}
              cy={DIAL_SIZE / 2}
              r={RADIUS}
              stroke={TRACK_COLOR}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Progress arc */}
            <G transform={`rotate(-90, ${DIAL_SIZE / 2}, ${DIAL_SIZE / 2})`}>
              <AnimatedCircle
                cx={DIAL_SIZE / 2}
                cy={DIAL_SIZE / 2}
                r={RADIUS}
                stroke="url(#scoreGrad)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                animatedProps={animatedProps}
              />
            </G>
          </Svg>
          {/* Center text */}
          <View style={styles.dialCenter}>
            <Text variant="heading1" weight="bold" style={[styles.scoreNumber, { color }]}>
              {score}
            </Text>
            <Text variant="caption" style={styles.scoreLabel}>{label}</Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <Text variant="label" weight="bold" style={styles.breakdownTitle}>DAILY SCORE</Text>
          <BreakdownRow
            label="Calories"
            value={data.calorieGoal > 0 ? `${data.calories}/${data.calorieGoal}` : '--'}
            percent={data.calorieGoal > 0 ? Math.round((data.calories / data.calorieGoal) * 100) : 0}
            color={BRAND_COLORS.macros.calories}
          />
          <BreakdownRow
            label="Macros"
            value="P/C/F"
            percent={Math.round(
              ((macroPercent(data.protein) + macroPercent(data.carbs) + macroPercent(data.fat)) / 3) * 100
            )}
            color={BRAND_COLORS.secondary}
          />
          <BreakdownRow
            label="Hydration"
            value={`${data.hydrationCups}/${data.hydrationGoal}`}
            percent={data.hydrationGoal > 0 ? Math.round((data.hydrationCups / data.hydrationGoal) * 100) : 0}
            color={BRAND_COLORS.semantic.info}
          />
          <BreakdownRow
            label="Streak"
            value={`${data.streak}d`}
            percent={Math.min(100, Math.round((data.streak / 30) * 100))}
            color={BRAND_COLORS.semantic.warning}
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
// BREAKDOWN ROW
// ============================================================================

function BreakdownRow({ label, value, percent, color }: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  return (
    <View
      style={styles.breakdownRow}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}, ${clampedPercent} percent`}
    >
      <View style={styles.breakdownMeta}>
        <Text variant="caption" weight="medium" style={styles.breakdownLabel}>{label}</Text>
        <Text variant="caption" style={styles.breakdownValue}>{value}</Text>
      </View>
      <View style={styles.breakdownTrack}>
        <View style={[styles.breakdownFill, { width: `${clampedPercent}%`, backgroundColor: color }]} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
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
  },
  scoreNumber: {
    fontSize: 36,
    lineHeight: 40,
  },
  scoreLabel: {
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  breakdown: {
    flex: 1,
    gap: spacing.sm,
  },
  breakdownTitle: {
    color: BRAND_COLORS.textSecondary,
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    gap: 3,
  },
  breakdownMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  breakdownValue: {
    color: BRAND_COLORS.textMuted,
    fontSize: 11,
  },
  breakdownTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default DailyScoreCard;
