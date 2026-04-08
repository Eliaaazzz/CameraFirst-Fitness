/**
 * NutritionRingsCard — Replicated from reference screenshot.
 *
 * Layout:
 * - Dark card (#1C1C1E) background
 * - 270° arc rings (open at bottom) with neon colors
 * - Calories centered inside rings (large bold white number)
 * - P/F/C labels at ring endpoints
 * - 3-column macro stats below with colored dots
 * - 3 progress bars with matching neon colors + percentage
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

import { Text } from '@/components/Text';
import { NUTRITION_REFERENCES, openExternalUrl } from '@/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// TYPES
// ============================================================================

interface MacroData { current: number; target: number; }

export interface NutritionRingsData {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat?: MacroData;
  bloodSugarRise?: number;
}

interface NutritionRingsCardProps {
  data: NutritionRingsData;
  showFat?: boolean;
  animated?: boolean;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  onSourcesPress?: () => void;
}

// ============================================================================
// NEON COLORS — from reference screenshot
// ============================================================================

const NEON = {
  pink:   '#FA114F',  // Protein (outer)
  green:  '#34C759',  // Fat (middle)
  orange: '#FF9F0A',  // Carbs (inner)
};

const TRACK_OPACITY = 0.3;

// Ring config: 270° arcs, thick stroke, tight packing
const STROKE = 20;
const ARC_SWEEP = 0.75; // 270° of 360°

interface RingDef {
  key: 'protein' | 'fat' | 'carbs';
  letter: string;
  label: string;
  unit: string;
  color: string;
  trackColor: string;
  radius: number;
}

const RINGS: RingDef[] = [
  { key: 'protein', letter: 'P', label: 'Protein', unit: 'g', color: NEON.pink, trackColor: `rgba(250,17,79,${TRACK_OPACITY})`, radius: 82 },
  { key: 'fat',     letter: 'F', label: 'Fat',     unit: 'g', color: NEON.green, trackColor: `rgba(52,199,89,${TRACK_OPACITY})`, radius: 60 },
  { key: 'carbs',   letter: 'C', label: 'Carbs',   unit: 'g', color: NEON.orange, trackColor: `rgba(255,159,10,${TRACK_OPACITY})`, radius: 38 },
];

// ============================================================================
// ANIMATED 270° ARC RING
// ============================================================================

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
      {/* Track — 270° arc */}
      <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={STROKE}
        fill="none" strokeLinecap="round" strokeDasharray={[arcLen, circ]} />
      {/* Progress — fills from start */}
      <AnimatedCircle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={STROKE}
        fill="none" strokeLinecap="round" strokeDasharray={[arcLen, circ]} animatedProps={animatedProps} />
    </G>
  );
}

// ============================================================================
// PROGRESS BAR — matching neon color
// ============================================================================

function MacroBar({ color, label, percentage }: { color: string; label: string; percentage: number }) {
  const pct = Math.min(100, Math.max(0, percentage));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        <View style={[styles.barThumb, { left: `${pct}%` }]} />
      </View>
      <Text style={[styles.barPct, { color }]}>{Math.round(pct)}%</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionRingsCard({
  data,
  showFat = true,
  animated = true,
  onMacroPress,
}: NutritionRingsCardProps) {
  const rings = showFat ? RINGS : RINGS.filter(r => r.key !== 'fat');

  const pcts: Record<string, number> = {
    protein: data.protein.target > 0 ? (data.protein.current / data.protein.target) * 100 : 0,
    fat: data.fat && data.fat.target > 0 ? (data.fat.current / data.fat.target) * 100 : 0,
    carbs: data.carbs.target > 0 ? (data.carbs.current / data.carbs.target) * 100 : 0,
  };

  return (
    <View style={styles.card}>
      {/* Rings with calories center */}
      <View style={styles.ringsSection}>
        <View style={styles.ringsContainer} accessible accessibilityRole="summary">
          <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
            {rings.map((r, i) => (
              <ArcRing key={r.key} color={r.color} trackColor={r.trackColor} radius={r.radius}
                percentage={pcts[r.key]} cx={100} cy={100} animated={animated} delay={i * 120} />
            ))}
          </Svg>

          {/* Calories center overlay */}
          <View style={styles.centerOverlay}>
            <Text style={styles.centerCalories}>
              {Math.round(data.calories.current).toLocaleString()}
            </Text>
            <Text style={styles.centerTarget}>
              / {data.calories.target.toLocaleString()} kcal
            </Text>
          </View>
        </View>

        {/* P / F / C ring labels */}
        <View style={styles.ringLabels}>
          {rings.map(r => (
            <Text key={r.key} style={[styles.ringLetter, { color: r.color }]}>{r.letter}</Text>
          ))}
        </View>
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
              <Text style={styles.statValue}>
                {Math.round(d?.current || 0)}{r.unit}
              </Text>
              <Text style={styles.statTarget}>/{d?.target || 0}{r.unit}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Progress bars */}
      <View style={styles.barsSection}>
        {rings.map(r => (
          <MacroBar key={r.key} color={r.color} label={r.label} percentage={pcts[r.key]} />
        ))}
      </View>

      {/* Citation */}
      <Pressable style={styles.citation}
        onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open', 'Open FDA reference.')}
        accessibilityRole="link" accessibilityLabel={NUTRITION_REFERENCES.fdaDailyValues.title}>
        <BookOpen size={11} color="rgba(255,255,255,0.35)" />
        <Text style={styles.citationText}>Source: FDA Daily Values (2,000 kcal · 50g P · 275g C · 78g F)</Text>
        <ArrowSquareOut size={10} color="rgba(255,255,255,0.35)" />
      </Pressable>
    </View>
  );
}

export function getCalorieSubtitle(current: number, target: number): string {
  return `${Math.round(current)} / ${target} kcal`;
}

// ============================================================================
// STYLES — dark card, neon data
// ============================================================================

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 16px rgba(0,0,0,0.12)' } as any)
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, shadowOpacity: 0.15, elevation: 6 }),
  },

  // Rings
  ringsSection: {
    alignItems: 'center',
    width: '100%',
  },
  ringsContainer: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    position: 'relative',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  centerCalories: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  centerTarget: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  ringLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: -8,
  },
  ringLetter: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statTarget: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '400',
  },

  // Progress bars
  barsSection: {
    width: '100%',
    gap: 14,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    width: 60,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    overflow: 'visible',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginLeft: -8,
  },
  barPct: {
    fontSize: 14,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
  },

  // Citation
  citation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }),
  },
  citationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.35)',
  },
});

export default NutritionRingsCard;
