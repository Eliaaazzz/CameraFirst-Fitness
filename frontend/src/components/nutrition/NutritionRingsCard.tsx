/**
 * NutritionRingsCard — Apple Fitness Activity Rings grade.
 *
 * Changes from research:
 * - Ring colors: vivid-500 level (not muted-600)
 * - Track opacity: 12% (not 7%)
 * - Ring max-width: 200px desktop (not 260)
 * - No white center fill — background shows through
 * - Legend: 8px dots, data-first typography, colored % text
 * - 20px padding (consistent with card system)
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
import { BRAND_COLORS, NUTRITION_REFERENCES, openExternalUrl, spacing } from '@/utils';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Types
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
  title?: string;
  showFat?: boolean;
  animated?: boolean;
  onMacroPress?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  onSourcesPress?: () => void;
}

// Vivid-500 colors (Apple Fitness saturation level)
const RING_COLORS = {
  protein: '#14B8A6',  // teal-500
  fat: '#F97316',      // orange-500
  carbs: '#84CC16',    // lime-500
};

const STROKE_WIDTH = 12;

interface RingConfig {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  color: string;
  trackColor: string;
  radius: number;
}

const RING_CONFIGS: RingConfig[] = [
  { key: 'protein', label: 'Protein', color: RING_COLORS.protein, trackColor: 'rgba(20, 184, 166, 0.12)', radius: 85 },
  { key: 'fat', label: 'Fat', color: RING_COLORS.fat, trackColor: 'rgba(249, 115, 22, 0.12)', radius: 66 },
  { key: 'carbs', label: 'Carbs', color: RING_COLORS.carbs, trackColor: 'rgba(132, 204, 22, 0.12)', radius: 47 },
];

// Animated Ring
function AnimatedRing({ color, trackColor, radius, percentage, centerX, centerY, animated, delay }: {
  color: string; trackColor: string; radius: number; percentage: number;
  centerX: number; centerY: number; animated: boolean; delay: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const targetProgress = Math.min(percentage, 100) / 100;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = animated
      ? withDelay(delay, withTiming(targetProgress, { duration: 800, easing: Easing.out(Easing.cubic) }))
      : targetProgress;
  }, [targetProgress, animated, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <>
      <Circle cx={centerX} cy={centerY} r={radius} stroke={trackColor} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" />
      <G transform={`rotate(-90, ${centerX}, ${centerY})`}>
        <AnimatedCircle cx={centerX} cy={centerY} r={radius} stroke={color} strokeWidth={STROKE_WIDTH} fill="none" strokeLinecap="round" strokeDasharray={[circumference, circumference]} animatedProps={animatedProps} />
      </G>
    </>
  );
}

// Legend Item
function LegendItem({ color, label, current, target, unit, onPress }: {
  color: string; label: string; current: number; target: number; unit: string; onPress?: () => void;
}) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  return (
    <Pressable style={({ pressed }) => [styles.legendItem, pressed && { opacity: 0.7 }]} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${label}: ${Math.round(current)} of ${target}${unit}`}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendContent}>
        <Text style={styles.legendLabel}>{label}</Text>
        <View style={styles.legendValues}>
          <Text style={styles.legendCurrent}>{Math.round(current)}</Text>
          <Text style={styles.legendTarget}>/ {target}{unit}</Text>
        </View>
      </View>
      <Text style={[styles.legendPercent, { color }]}>{pct}%</Text>
    </Pressable>
  );
}

// Main Component
export function NutritionRingsCard({ data, title, showFat = true, animated = true, onMacroPress, onSourcesPress }: NutritionRingsCardProps) {
  const { t } = useLanguageStore();
  const displayTitle = title || t.todaysNutrition;
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isTablet = !isMobile && Platform.OS !== 'web' && width >= 700;

  const ringConfigs = showFat ? RING_CONFIGS : RING_CONFIGS.filter(c => c.key !== 'fat');
  const pcts: Record<string, number> = {
    protein: data.protein.target > 0 ? (data.protein.current / data.protein.target) * 100 : 0,
    fat: data.fat && data.fat.target > 0 ? (data.fat.current / data.fat.target) * 100 : 0,
    carbs: data.carbs.target > 0 ? (data.carbs.current / data.carbs.target) * 100 : 0,
  };

  return (
    <View style={[styles.card, isTablet && styles.cardTablet]}>
      <Text style={styles.title}>{displayTitle}</Text>

      <View style={[styles.content, isMobile ? styles.contentMobile : styles.contentDesktop]}>
        {/* Rings */}
        <View style={[styles.ringsWrapper, isMobile ? styles.ringsWrapperMobile : styles.ringsWrapperDesktop]}
          accessible accessibilityRole="summary">
          <View style={styles.ringsAspectBox}>
            <Svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
              {ringConfigs.map((c, i) => (
                <AnimatedRing key={c.key} color={c.color} trackColor={c.trackColor} radius={c.radius}
                  percentage={pcts[c.key]} centerX={100} centerY={100} animated={animated} delay={i * 100} />
              ))}
            </Svg>
            {/* Center calories — no white fill, just floating text */}
            <Pressable style={({ pressed }) => [styles.centerContent, pressed && { opacity: 0.7 }]}
              onPress={() => onMacroPress?.('calories')} accessibilityRole="button">
              <Flame size={isMobile ? 18 : 20} weight="fill" color="#111111" />
              <Text style={isMobile ? [styles.centerCal, styles.centerCalMobile] : styles.centerCal}>
                {Math.round(data.calories.current)}
              </Text>
              <Text style={styles.centerUnit}>kcal</Text>
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

      {/* Citation */}
      <Pressable style={styles.citation} onPress={() => openExternalUrl(NUTRITION_REFERENCES.fdaDailyValues.url, 'Unable to open source', 'Open FDA reference.')}
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
    overflow: 'hidden' as const,
  },
  cardTablet: { maxWidth: 700, alignSelf: 'center' as const, width: '100%' as any },
  title: { color: '#6B7280', fontSize: 14, fontWeight: '600', letterSpacing: 0.2, marginBottom: 16 },

  content: { alignItems: 'center', justifyContent: 'center' },
  contentDesktop: { flexDirection: 'row', gap: 32 },
  contentMobile: { flexDirection: 'column', gap: spacing.lg },

  ringsWrapper: { alignItems: 'center', justifyContent: 'center' },
  ringsWrapperDesktop: { flex: 1, maxWidth: 200, minWidth: 160 },
  ringsWrapperMobile: { width: '100%', maxWidth: 200 },
  ringsAspectBox: { width: '100%', aspectRatio: 1, position: 'relative' },

  centerContent: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  centerCal: { color: '#111111', fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -1 },
  centerCalMobile: { fontSize: 26, lineHeight: 30 },
  centerUnit: { color: '#9CA3AF', fontSize: 11, fontWeight: '500', textTransform: 'uppercase' as const, letterSpacing: 1.2, marginTop: 1 },

  legend: { justifyContent: 'center' },
  legendDesktop: { flex: 1, minWidth: 180, maxWidth: 260, gap: 20 },
  legendMobile: { width: '100%', gap: 16 },

  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendContent: { flex: 1, minWidth: 0 },
  legendLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginBottom: 1 },
  legendValues: { flexDirection: 'row', alignItems: 'baseline' },
  legendCurrent: { color: '#111111', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  legendTarget: { color: '#9CA3AF', fontSize: 13, fontWeight: '400', marginLeft: 3 },
  legendPercent: { fontSize: 13, fontWeight: '700', flexShrink: 0 },

  citation: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 14,
    ...(Platform.OS === 'web' && { cursor: 'pointer' as any }) },
  citationText: { flex: 1, fontSize: 11, fontWeight: '400', color: '#9CA3AF' },
});

export default NutritionRingsCard;
