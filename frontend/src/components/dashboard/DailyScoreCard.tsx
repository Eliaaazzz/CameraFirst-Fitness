/**
 * DailyScoreCard — 270° gauge + metric breakdown.
 *
 * Research-driven changes:
 * - Gauge: 152px (from 120), stroke 12px (matches rings)
 * - Score number: 44px bold (commanding focal point)
 * - Track opacity: 8% (visible baseline)
 * - Metric bar height: 6px, track 10% opacity
 * - Row gap: 16px (breathing room)
 * - 20px padding (card system standard)
 */
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES, MOBILE_CARD_STYLES } from '@/components/common/BentoCard';
import { Text } from '@/components/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DailyScoreData {
  calories: number; calorieGoal: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  hydrationCups: number; hydrationGoal: number;
  streak: number;
}
interface DailyScoreCardProps { data: DailyScoreData; animated?: boolean; }

function computeDailyScore(d: DailyScoreData): number {
  const ca = d.calorieGoal > 0 ? 1 - Math.min(1, Math.abs(d.calories - d.calorieGoal) / d.calorieGoal) : 0;
  const ma = (m: { current: number; goal: number }) => m.goal > 0 ? 1 - Math.min(1, Math.abs(m.current - m.goal) / m.goal) : 0;
  const ms = (ma(d.protein) + ma(d.carbs) + ma(d.fat)) / 3;
  const hs = d.hydrationGoal > 0 ? Math.min(1, d.hydrationCups / d.hydrationGoal) : 0;
  const ss = Math.min(1, d.streak / 30);
  return Math.round((ca * 0.4 + ms * 0.3 + hs * 0.15 + ss * 0.15) * 100);
}

function getScoreLabel(s: number) { return s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Getting Started'; }
function getScoreColor(s: number) { return s >= 80 ? '#10B981' : s >= 60 ? '#0EA5E9' : s >= 40 ? '#F97316' : '#EF4444'; }

const METRIC = {
  calories:  { color: '#F97316', track: 'rgba(249,115,22,0.10)' },
  macros:    { color: '#14B8A6', track: 'rgba(20,184,166,0.10)' },
  hydration: { color: '#3B82F6', track: 'rgba(59,130,246,0.10)' },
  streak:    { color: '#F59E0B', track: 'rgba(245,158,11,0.10)' },
};

const DIAL_SIZE = 152;
const STROKE_WIDTH = 12;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75;

export function DailyScoreCard({ data, animated = true }: DailyScoreCardProps) {
  const score = useMemo(() => computeDailyScore(data), [data]);
  const label = getScoreLabel(score);
  const color = getScoreColor(score);
  const progress = useSharedValue(0);
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  useEffect(() => {
    const t = score / 100;
    progress.value = animated ? withDelay(200, withTiming(t, { duration: 1000, easing: Easing.out(Easing.cubic) })) : t;
  }, [score, animated]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: ARC_LENGTH * (1 - progress.value) }));
  const cx = DIAL_SIZE / 2, cy = DIAL_SIZE / 2;

  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as any]} accessible accessibilityRole="summary"
      accessibilityLabel={`Daily score: ${score}, ${label}`}>

      <View style={[styles.row, isNarrow && styles.rowVertical]}>
        <View style={styles.dialContainer}>
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
            <G transform={`rotate(135, ${cx}, ${cy})`}>
              <Circle cx={cx} cy={cy} r={RADIUS} stroke="rgba(0,0,0,0.08)" strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]} />
              <AnimatedCircle cx={cx} cy={cy} r={RADIUS} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeDasharray={[ARC_LENGTH, CIRCUMFERENCE]} animatedProps={animatedProps} />
            </G>
          </Svg>
          <View style={styles.dialCenter}>
            <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.breakdown}>
          <MetricRow label="Calories" value={data.calorieGoal > 0 ? `${data.calories}/${data.calorieGoal}` : '--'} percent={data.calorieGoal > 0 ? Math.round((data.calories / data.calorieGoal) * 100) : 0} m={METRIC.calories} />
          <MetricRow label="Macros" value="P/C/F" percent={Math.round(((mp(data.protein) + mp(data.carbs) + mp(data.fat)) / 3) * 100)} m={METRIC.macros} />
          <MetricRow label="Hydration" value={`${data.hydrationCups}/${data.hydrationGoal}`} percent={data.hydrationGoal > 0 ? Math.round((data.hydrationCups / data.hydrationGoal) * 100) : 0} m={METRIC.hydration} />
          <MetricRow label="Streak" value={`${data.streak}d`} percent={Math.min(100, Math.round((data.streak / 30) * 100))} m={METRIC.streak} />
        </View>
      </View>
    </View>
  );
}

function mp(m: { current: number; goal: number }) { return m.goal > 0 ? Math.min(1, m.current / m.goal) : 0; }

function MetricRow({ label, value, percent, m }: { label: string; value: string; percent: number; m: { color: string; track: string }; }) {
  const c = Math.min(100, Math.max(0, percent));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <View style={styles.metricLabelRow}>
          <View style={[styles.metricDot, { backgroundColor: m.color }]} />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValue}>{value}</Text>
          <Text style={[styles.metricPercent, { color: m.color }]}>{c}%</Text>
        </View>
      </View>
      <View style={[styles.metricTrack, { backgroundColor: m.track }]}>
        <View style={[styles.metricFill, { width: `${c}%`, backgroundColor: m.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...(Platform.OS === 'web' ? BENTO_CARD_STYLES : MOBILE_CARD_STYLES) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  rowVertical: { flexDirection: 'column', alignItems: 'center', gap: 20 },

  dialContainer: { width: DIAL_SIZE, height: DIAL_SIZE, justifyContent: 'center', alignItems: 'center' },
  dialCenter: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', paddingBottom: 8 },
  scoreNumber: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1.5 },
  scoreLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  breakdown: { flex: 1, gap: 16 },
  metricRow: { gap: 6 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricDot: { width: 8, height: 8, borderRadius: 4 },
  metricLabel: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricValue: { color: '#9CA3AF', fontSize: 12, fontWeight: '400' },
  metricPercent: { fontSize: 13, fontWeight: '700' },
  metricTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 3 },
});

export default DailyScoreCard;
