/**
 * NutritionRingsCard — Clean rings, compact layout, vertical macro bars.
 *
 * Layout (vertical):
 * - White card, subtle shadow
 * - 270° arc rings (clean — no center text overlap)
 * - P/F/C letters below ring endpoints
 * - Calorie text centered below rings
 * - 3 vertical macro bar columns side by side
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

// Vertical macro bar column
function MacroColumn({ color, trackColor, label, current, target, unit, percentage, onPress }: {
  color: string; trackColor: string; label: string; current: number; target: number; unit: string;
  percentage: number; onPress?: () => void;
}) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <Pressable style={({ pressed }) => [styles.macroCol, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <View style={[styles.vertBarTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.vertBarFill, { height: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{Math.round(current)}/{target}{unit}</Text>
      <Text style={[styles.macroPct, { color }]}>{Math.round(pct)}%</Text>
    </Pressable>
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
      {/* Rings — clean, no overlapping center text */}
      <View style={styles.ringsContainer} accessible accessibilityRole="summary">
        <Svg width="100%" height="100%" viewBox="0 0 200 175" preserveAspectRatio="xMidYMid meet">
          {rings.map((r, i) => (
            <ArcRing key={r.key} color={r.color} trackColor={r.trackColor} radius={r.radius}
              percentage={pcts[r.key]} cx={100} cy={100} animated={animated} delay={i * 120} />
          ))}
        </Svg>
      </View>

      {/* P / F / C ring labels */}
      <View style={styles.ringLabels}>
        {rings.map(r => <Text key={r.key} style={[styles.ringLetter, { color: r.color }]}>{r.letter}</Text>)}
      </View>

      {/* Calorie text — below rings, no overlap */}
      <View style={styles.calorieSection}>
        <Text style={styles.calorieCurrent}>{Math.round(data.calories.current).toLocaleString()}</Text>
        <Text style={styles.calorieSlash}> / {data.calories.target.toLocaleString()} kcal</Text>
      </View>

      {/* Vertical macro bar columns */}
      <View style={styles.macroColumns}>
        {rings.map(r => {
          const d = r.key === 'fat' ? data.fat : data[r.key];
          return (
            <MacroColumn key={r.key} color={r.color} trackColor={r.trackColor} label={r.label}
              current={d?.current || 0} target={d?.target || 0} unit={r.unit}
              percentage={pcts[r.key]} onPress={() => onMacroPress?.(r.key)} />
          );
        })}
      </View>

      {/* Unified citation area */}
      <View style={styles.citationArea}>
        <Pressable style={styles.citationRow}
          onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open', 'Open FDA reference.')}
          accessibilityRole="link" accessibilityLabel={NUTRITION_REFERENCES.fdaDailyValues.title}>
          <BookOpen size={11} color="#9CA3AF" />
          <Text style={styles.citationText}>Defaults: FDA Daily Values (2,000 kcal · 50g P · 275g C · 78g F)</Text>
          <ArrowSquareOut size={10} color="#9CA3AF" />
        </Pressable>
        <Pressable style={styles.citationRow}
          onPress={() => openExternalUrl(NUTRITION_REFERENCES.mifflinStJeor.url, 'Unable to open', 'Open Mifflin-St Jeor reference.')}
          accessibilityRole="link" accessibilityLabel={NUTRITION_REFERENCES.mifflinStJeor.title}>
          <BookOpen size={11} color="#9CA3AF" />
          <Text style={styles.citationText}>Custom goals: Mifflin-St Jeor equation · USDA DRI</Text>
          <ArrowSquareOut size={10} color="#9CA3AF" />
        </Pressable>
        <Text style={styles.citationNote}>AI-generated data is approximate — verify with a healthcare professional.</Text>
      </View>
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

  ringsContainer: { width: '100%', maxWidth: 200, aspectRatio: 200 / 175 },

  ringLabels: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4, marginBottom: 8 },
  ringLetter: { fontSize: 13, fontWeight: '700' },

  calorieSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  calorieCurrent: { color: '#111111', fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  calorieSlash: { color: '#9CA3AF', fontSize: 15, fontWeight: '500' },

  macroColumns: { flexDirection: 'row', width: '100%', maxWidth: 320, gap: 20, justifyContent: 'center' },
  macroCol: { flex: 1, alignItems: 'center', gap: 6 },
  macroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  vertBarTrack: { width: 28, height: 80, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  vertBarFill: { width: '100%', borderRadius: 14, minHeight: 2 },
  macroValue: { color: '#374151', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  macroPct: { fontSize: 14, fontWeight: '800' },

  citationArea: { width: '100%', marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', gap: 8 },
  citationRow: { flexDirection: 'row', alignItems: 'center', gap: 6,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }) },
  citationText: { flex: 1, fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
  citationNote: { fontSize: 11, fontWeight: '400', color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
});

export default NutritionRingsCard;
