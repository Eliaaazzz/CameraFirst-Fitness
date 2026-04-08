/**
 * NutritionRingsCard — Apple Fitness Activity Rings.
 *
 * EXACT replica of the reference image:
 * - Outer (Protein): #FA114F hot pink — track 25% opacity
 * - Middle (Fat): #92E82A electric lime — track 25% opacity
 * - Inner (Carbs): #00D4FD cyan — track 25% opacity
 * - Stroke: 22px CHUNKY
 * - Rings tightly packed (85, 62, 39)
 * - No center content — rings ARE the visual
 * - Stats below: 3 columns with colored dots + big numbers
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
// APPLE FITNESS NEON COLORS — exact from reference image
// ============================================================================

const NEON = {
  pink:  { fill: '#FA114F', track: 'rgba(250, 17, 79, 0.25)' },
  lime:  { fill: '#92E82A', track: 'rgba(146, 232, 42, 0.25)' },
  cyan:  { fill: '#00D4FD', track: 'rgba(0, 212, 253, 0.25)' },
};

// Ring mapping: Protein (outer/pink), Fat (middle/lime), Carbs (inner/cyan)
const STROKE = 22; // Chunky like Apple Fitness

interface RingDef {
  key: 'protein' | 'fat' | 'carbs';
  label: string;
  unit: string;
  color: string;
  trackColor: string;
  radius: number;
}

const RINGS: RingDef[] = [
  { key: 'protein', label: 'Protein', unit: 'g', color: NEON.pink.fill, trackColor: NEON.pink.track, radius: 85 },
  { key: 'fat',     label: 'Fat',     unit: 'g', color: NEON.lime.fill, trackColor: NEON.lime.track, radius: 62 },
  { key: 'carbs',   label: 'Carbs',   unit: 'g', color: NEON.cyan.fill, trackColor: NEON.cyan.track, radius: 39 },
];

// ============================================================================
// ANIMATED RING — chunky, round-capped
// ============================================================================

function Ring({ color, trackColor, radius, percentage, cx, cy, animated, delay }: {
  color: string; trackColor: string; radius: number; percentage: number;
  cx: number; cy: number; animated: boolean; delay: number;
}) {
  const circ = 2 * Math.PI * radius;
  const target = Math.min(percentage, 100) / 100;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = animated
      ? withDelay(delay, withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }))
      : target;
  }, [target, animated, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  return (
    <>
      <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
      <G transform={`rotate(-90, ${cx}, ${cy})`}>
        <AnimatedCircle cx={cx} cy={cy} r={radius} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={[circ, circ]} animatedProps={animatedProps} />
      </G>
    </>
  );
}

// ============================================================================
// STAT COLUMN — Apple Fitness style: colored dot, big number, label
// ============================================================================

function StatColumn({ color, label, current, target, unit, onPress }: {
  color: string; label: string; current: number; target: number; unit: string; onPress?: () => void;
}) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.statCol, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${Math.round(current)} of ${target}${unit}`}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
        <Text style={[styles.statLabel, { color }]}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{Math.round(current)}<Text style={styles.statUnit}>/{target}{unit}</Text></Text>
      <Text style={[styles.statPct, { color }]}>{pct}%</Text>
    </Pressable>
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
  onSourcesPress,
}: NutritionRingsCardProps) {
  const rings = showFat ? RINGS : RINGS.filter(r => r.key !== 'fat');

  const pcts: Record<string, number> = {
    protein: data.protein.target > 0 ? (data.protein.current / data.protein.target) * 100 : 0,
    fat: data.fat && data.fat.target > 0 ? (data.fat.current / data.fat.target) * 100 : 0,
    carbs: data.carbs.target > 0 ? (data.carbs.current / data.carbs.target) * 100 : 0,
  };

  return (
    <View style={styles.card}>
      {/* Rings — THE hero visual, no text overlay */}
      <View style={styles.ringsContainer} accessible accessibilityRole="summary"
        accessibilityLabel={`Nutrition rings. Protein ${Math.round(pcts.protein)}%, Fat ${Math.round(pcts.fat)}%, Carbs ${Math.round(pcts.carbs)}%`}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
          {rings.map((r, i) => (
            <Ring key={r.key} color={r.color} trackColor={r.trackColor} radius={r.radius}
              percentage={pcts[r.key]} cx={100} cy={100} animated={animated} delay={i * 120} />
          ))}
        </Svg>
      </View>

      {/* Calories — centered below rings */}
      <Pressable
        style={({ pressed }) => [styles.caloriesRow, pressed && { opacity: 0.7 }]}
        onPress={() => onMacroPress?.('calories')}
        accessibilityLabel={`Calories: ${Math.round(data.calories.current)} of ${data.calories.target}`}
      >
        <Text style={styles.caloriesValue}>{Math.round(data.calories.current)}</Text>
        <Text style={styles.caloriesLabel}> / {data.calories.target} kcal</Text>
      </Pressable>

      {/* Stats row — 3 columns */}
      <View style={styles.statsRow}>
        <StatColumn color={NEON.pink.fill} label="Protein" current={data.protein.current} target={data.protein.target} unit="g" onPress={() => onMacroPress?.('protein')} />
        {showFat && (
          <StatColumn color={NEON.lime.fill} label="Fat" current={data.fat?.current || 0} target={data.fat?.target || 0} unit="g" onPress={() => onMacroPress?.('fat')} />
        )}
        <StatColumn color={NEON.cyan.fill} label="Carbs" current={data.carbs.current} target={data.carbs.target} unit="g" onPress={() => onMacroPress?.('carbs')} />
      </View>

      {/* Citation — compact footnote */}
      <Pressable style={styles.citation}
        onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open source', 'Open FDA reference.')}
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

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...(Platform.OS === 'web' ? { ...BENTO_CARD_STYLES, ...(BENTO_CARD_WEB_STYLES as object) } : MOBILE_CARD_STYLES),
    alignItems: 'center',
    overflow: 'hidden' as const,
  },

  // Rings — centered, square aspect ratio
  ringsContainer: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1,
  },

  // Calories — below rings
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  caloriesValue: {
    color: '#111111',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  caloriesLabel: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '400',
  },

  // Stats — 3 equal columns
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statUnit: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '400',
  },
  statPct: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Citation
  citation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
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
