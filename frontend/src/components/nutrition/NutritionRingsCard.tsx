/**
 * NutritionRingsCard — Light mode, 270° arc rings, neon colors.
 *
 * Layout (vertical):
 * - White card, subtle shadow
 * - 270° arc rings with calories centered inside
 * - P/F/C letters below ring endpoints
 * - 3-column macro stats (dot + label + big number + target)
 * - 3 progress bars with MATCHING neon colors (not gray) + slider thumb + %
 * - FDA citation footnote
 */
import { BookOpen, ArrowSquareOut } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { NUTRITION_REFERENCES, openExternalUrl } from '@/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Types
interface MacroData { current: number; target: number; }
export interface NutritionRingsData {
  calories: MacroData; protein: MacroData; carbs: MacroData;
  fat?: MacroData; bloodSugarRise?: number;
}
interface NutritionRingsCardProps {
  data: NutritionRingsData; showFat?: boolean; animated?: boolean;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  onSourcesPress?: () => void;
}

// Neon colors
const NEON = {
  pink:   '#FA114F',
  green:  '#34C759',
  orange: '#FF9F0A',
};

const STROKE = 20;
const ARC_SWEEP = 0.75;

interface RingDef {
  key: 'protein' | 'fat' | 'carbs'; letter: string; label: string; unit: string;
  color: string; trackColor: string; radius: number;
}

const RINGS: RingDef[] = [
  { key: 'protein', letter: 'P', label: 'Protein', unit: 'g', color: NEON.pink, trackColor: 'rgba(250,17,79,0.15)', radius: 82 },
  { key: 'fat',     letter: 'F', label: 'Fat',     unit: 'g', color: NEON.green, trackColor: 'rgba(52,199,89,0.15)', radius: 60 },
  { key: 'carbs',   letter: 'C', label: 'Carbs',   unit: 'g', color: NEON.orange, trackColor: 'rgba(255,159,10,0.15)', radius: 38 },
];

// 270° Arc Ring
function ArcRing({ color, trackColor, radius, percentage, cx, cy, animated, delay }: {
  color: string; trackColor: string; radius: number; percentage: number;
  cx: number; cy: number; animated: boolean; delay: number;
}) {
  const circ = 2 * Math.PI * radius;
  const arcLen = circ * ARC_SWEEP;
  const target = Math.min(percentage, 100) / 100;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = animated
      ? withDelay(delay, withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }))
      : target;
  }, [target, animated, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLen * (1 - progress.value),
  }));

  return (
    <G transform={`rotate(135, ${cx}, ${cy})`}>
      <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={[arcLen, circ]} />
      <AnimatedCircle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={[arcLen, circ]} animatedProps={animatedProps} />
    </G>
  );
}

// Progress Bar — COLORED fill, not gray
function MacroBar({ color, label, percentage }: { color: string; label: string; percentage: number }) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barPct, { color }]}>{Math.round(pct)}%</Text>
    </View>
  );
}

// Main Component
export function NutritionRingsCard({ data, showFat = true, animated = true, onMacroPress }: NutritionRingsCardProps) {
  const rings = showFat ? RINGS : RINGS.filter(r => r.key !== 'fat');
  const pcts: Record<string, number> = {
    protein: data.protein.target > 0 ? (data.protein.current / data.protein.target) * 100 : 0,
    fat: data.fat && data.fat.target > 0 ? (data.fat.current / data.fat.target) * 100 : 0,
    carbs: data.carbs.target > 0 ? (data.carbs.current / data.carbs.target) * 100 : 0,
  };

  return (
    <View style={styles.card}>
      {/* Rings with calories center */}
      <View style={styles.ringsContainer} accessible accessibilityRole="summary">
        <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
          {rings.map((r, i) => (
            <ArcRing key={r.key} color={r.color} trackColor={r.trackColor} radius={r.radius}
              percentage={pcts[r.key]} cx={100} cy={100} animated={animated} delay={i * 120} />
          ))}
        </Svg>
        <View style={styles.centerOverlay}>
          <Text style={styles.centerCal}>{Math.round(data.calories.current).toLocaleString()}</Text>
          <Text style={styles.centerTarget}>/ {data.calories.target.toLocaleString()} kcal</Text>
        </View>
      </View>

      {/* P / F / C ring labels */}
      <View style={styles.ringLabels}>
        {rings.map(r => <Text key={r.key} style={[styles.ringLetter, { color: r.color }]}>{r.letter}</Text>)}
      </View>

      {/* Macro stat columns */}
      <View style={styles.statsRow}>
        {rings.map(r => {
          const d = r.key === 'fat' ? data.fat : data[r.key];
          return (
            <Pressable key={r.key} style={({ pressed }) => [styles.statCol, pressed && { opacity: 0.7 }]}
              onPress={() => onMacroPress?.(r.key)}>
              <View style={styles.statHeader}>
                <View style={[styles.statDot, { backgroundColor: r.color }]} />
                <Text style={styles.statName}>{r.label}</Text>
              </View>
              <Text style={styles.statValue}>{Math.round(d?.current || 0)}{r.unit}</Text>
              <Text style={styles.statTarget}>/{d?.target || 0}{r.unit}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Progress bars — each with its own neon color */}
      <View style={styles.barsSection}>
        {rings.map(r => <MacroBar key={r.key} color={r.color} label={r.label} percentage={pcts[r.key]} />)}
      </View>

      {/* Citation */}
      <Pressable style={styles.citation}
        onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open', 'Open FDA reference.')}
        accessibilityRole="link" accessibilityLabel={NUTRITION_REFERENCES.fdaDailyValues.title}>
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

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    alignItems: 'center',
  },

  ringsContainer: { width: '100%', maxWidth: 240, aspectRatio: 1, position: 'relative' },
  centerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
  centerCal: { color: '#111111', fontSize: 38, fontWeight: '800', letterSpacing: -1.5 },
  centerTarget: { color: '#9CA3AF', fontSize: 14, fontWeight: '500', marginTop: 2 },

  ringLabels: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: -4, marginBottom: 16 },
  ringLetter: { fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 20 },
  statCol: { flex: 1, alignItems: 'center', gap: 2 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statName: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  statValue: { color: '#111111', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statTarget: { color: '#9CA3AF', fontSize: 13, fontWeight: '400' },

  barsSection: { width: '100%', gap: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barLabel: { color: '#6B7280', fontSize: 13, fontWeight: '500', width: 56 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barPct: { fontSize: 14, fontWeight: '700', width: 42, textAlign: 'right' },

  citation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 14,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }) },
  citationText: { flex: 1, fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
});

export default NutritionRingsCard;
