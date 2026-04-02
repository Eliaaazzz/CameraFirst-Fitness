/**
 * NutritionTrendChart - 7-day calorie intake trend chart
 *
 * Uses Recharts (web only) to display a stacked bar chart
 * showing daily calorie intake vs target with macro breakdown.
 */
import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

import { BENTO_CARD_STYLES, BENTO_CARD_WEB_STYLES } from '@/components/common/BentoCard';
import { Text } from '@/components/Text';
import { BRAND_COLORS, spacing } from '@/utils';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Recharts - Web only (follows WeightTrendChart lazy-load pattern)
let BarChart: any;
let Bar: any;
let XAxis: any;
let YAxis: any;
let CartesianGrid: any;
let Tooltip: any;
let ResponsiveContainer: any;
let ReferenceLine: any;
let RadarChart: any;
let PolarGrid: any;
let PolarAngleAxis: any;
let Radar: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  ResponsiveContainer = recharts.ResponsiveContainer;
  ReferenceLine = recharts.ReferenceLine;
  RadarChart = recharts.RadarChart;
  PolarGrid = recharts.PolarGrid;
  PolarAngleAxis = recharts.PolarAngleAxis;
  Radar = recharts.Radar;
}

// ============================================================================
// TYPES
// ============================================================================

interface DayData {
  /** Day label e.g. "Mon", "Tue" */
  day: string;
  /** Total calories */
  calories: number;
  /** Protein grams */
  protein: number;
  /** Carbs grams */
  carbs: number;
  /** Fat grams */
  fat: number;
}

interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionTrendChartProps {
  /** 7 days of nutrition data (oldest first) */
  data: DayData[];
  /** Daily targets */
  target: MacroTarget;
  /** Height of the chart */
  height?: number;
}

interface MacroRadarProps {
  /** Today's macros */
  current: { protein: number; carbs: number; fat: number };
  /** Target macros */
  target: { protein: number; carbs: number; fat: number };
  /** Height of the chart */
  height?: number;
}

// ============================================================================
// TAB SELECTOR
// ============================================================================

type TabKey = 'trend' | 'balance';

function TabSelector({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <View style={tabStyles.container}>
      <Pressable
        style={[tabStyles.tab, active === 'trend' && tabStyles.tabActive]}
        onPress={() => onChange('trend')}
      >
        <Text
          variant="caption"
          weight={active === 'trend' ? 'bold' : 'regular'}
          style={active === 'trend' ? tabStyles.tabTextActive : tabStyles.tabText}
        >
          Trend
        </Text>
      </Pressable>
      <Pressable
        style={[tabStyles.tab, active === 'balance' && tabStyles.tabActive]}
        onPress={() => onChange('balance')}
      >
        <Text
          variant="caption"
          weight={active === 'balance' ? 'bold' : 'regular'}
          style={active === 'balance' ? tabStyles.tabTextActive : tabStyles.tabText}
        >
          Balance
        </Text>
      </Pressable>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    padding: 2,
    alignSelf: 'flex-start',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' && ({
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    } as any)),
  },
  tabText: {
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#111827',
  },
});

// ============================================================================
// TREND CHART
// ============================================================================

/**
 * NativeBarChart - Simple 7-day SVG bar chart for mobile
 * Uses react-native-svg + Reanimated for animated bar entrance
 */
function AnimatedBar({ x, targetY, targetHeight, width, color, delay: barDelay }: {
  x: number; targetY: number; targetHeight: number; width: number; color: string; delay: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      barDelay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, [barDelay, progress]);

  const animatedProps = useAnimatedProps(() => {
    const h = targetHeight * progress.value;
    return {
      y: targetY + targetHeight - h,
      height: Math.max(0, h),
    };
  });

  return (
    <AnimatedRect
      x={x}
      rx={3}
      width={width}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

function NativeBarChart({ data, target, height = 160 }: NutritionTrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text variant="caption" style={styles.placeholderText}>No nutrition data yet</Text>
      </View>
    );
  }

  const chartWidth = 300; // Will be scaled by viewBox
  const chartHeight = height;
  const padding = { top: 10, bottom: 24, left: 4, right: 4 };
  const barAreaHeight = chartHeight - padding.top - padding.bottom;
  const maxVal = Math.max(target.calories * 1.2, ...data.map(d => d.calories));
  const barCount = data.length;
  const barGap = 8;
  const barWidth = (chartWidth - padding.left - padding.right - barGap * (barCount - 1)) / barCount;

  const targetLineY = padding.top + barAreaHeight * (1 - target.calories / maxVal);

  return (
    <View style={{ height }}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Target line */}
        <Line
          x1={padding.left}
          y1={targetLineY}
          x2={chartWidth - padding.right}
          y2={targetLineY}
          stroke={BRAND_COLORS.primary}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />
        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.calories / maxVal) * barAreaHeight;
          const barX = padding.left + i * (barWidth + barGap);
          const barY = padding.top;
          const barColor = d.calories > target.calories ? '#EF4444' : BRAND_COLORS.primary;
          return (
            <React.Fragment key={i}>
              <AnimatedBar
                x={barX}
                targetY={barY}
                targetHeight={barH}
                width={barWidth}
                color={barColor}
                delay={i * 60}
              />
              <SvgText
                x={barX + barWidth / 2}
                y={chartHeight - 6}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {d.day}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function TrendChart({ data, target, height = 180 }: NutritionTrendChartProps) {
  if (Platform.OS !== 'web') {
    return <NativeBarChart data={data} target={target} height={height} />;
  }

  if (data.length === 0) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text variant="caption" style={styles.placeholderText}>No nutrition data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barCategoryGap="20%">
          <defs>
            <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_COLORS.macros.protein} stopOpacity={0.9} />
              <stop offset="100%" stopColor={BRAND_COLORS.macros.protein} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="carbsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_COLORS.macros.carbs} stopOpacity={0.9} />
              <stop offset="100%" stopColor={BRAND_COLORS.macros.carbs} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND_COLORS.macros.fat} stopOpacity={0.9} />
              <stop offset="100%" stopColor={BRAND_COLORS.macros.fat} stopOpacity={0.6} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />

          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(8px)',
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                proteinCal: 'Protein',
                carbsCal: 'Carbs',
                fatCal: 'Fat',
              };
              return [`${value} kcal`, labels[name] || name];
            }}
          />

          {/* Target line */}
          <ReferenceLine
            y={target.calories}
            stroke={BRAND_COLORS.primary}
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{
              value: `Target: ${target.calories}`,
              position: 'right',
              fill: BRAND_COLORS.primary,
              fontSize: 10,
            }}
          />

          {/* Stacked bars: protein (bottom), carbs (middle), fat (top) */}
          <Bar dataKey="proteinCal" stackId="macros" fill="url(#proteinGrad)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="carbsCal" stackId="macros" fill="url(#carbsGrad)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="fatCal" stackId="macros" fill="url(#fatGrad)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </View>
  );
}

// ============================================================================
// MACRO BALANCE RADAR
// ============================================================================

function NativeMacroView({ current, target, height = 180 }: MacroRadarProps) {
  const macros = [
    { label: 'Protein', current: current.protein, target: target.protein, color: BRAND_COLORS.macros.protein },
    { label: 'Carbs', current: current.carbs, target: target.carbs, color: BRAND_COLORS.macros.carbs },
    { label: 'Fat', current: current.fat, target: target.fat, color: BRAND_COLORS.macros.fat },
  ];

  return (
    <View style={styles.nativeMacroContainer}>
      {macros.map((m) => {
        const pct = m.target > 0 ? Math.min(1, m.current / m.target) : 0;
        return (
          <View key={m.label} style={styles.nativeMacroRow}>
            <View style={styles.nativeMacroLabelRow}>
              <View style={[styles.nativeMacroDot, { backgroundColor: m.color }]} />
              <Text variant="caption" weight="medium" style={styles.nativeMacroLabel}>{m.label}</Text>
              <Text variant="caption" weight="bold" style={styles.nativeMacroValue}>
                {Math.round(m.current)}/{m.target}g
              </Text>
            </View>
            <View style={styles.nativeMacroTrack}>
              <View style={[styles.nativeMacroFill, { width: `${pct * 100}%`, backgroundColor: m.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MacroRadar({ current, target, height = 180 }: MacroRadarProps) {
  if (Platform.OS !== 'web') {
    return <NativeMacroView current={current} target={target} height={height} />;
  }

  const radarData = [
    { macro: 'Protein', current: target.protein > 0 ? (current.protein / target.protein) * 100 : 0, target: 100 },
    { macro: 'Carbs', current: target.carbs > 0 ? (current.carbs / target.carbs) * 100 : 0, target: 100 },
    { macro: 'Fat', current: target.fat > 0 ? (current.fat / target.fat) * 100 : 0, target: 100 },
  ];

  return (
    <View style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis
            dataKey="macro"
            tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
          />
          <Radar
            name="Target"
            dataKey="target"
            stroke="#E5E7EB"
            fill="#E5E7EB"
            fillOpacity={0.2}
            strokeWidth={1}
          />
          <Radar
            name="Current"
            dataKey="current"
            stroke={BRAND_COLORS.primary}
            fill={BRAND_COLORS.primary}
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend below radar */}
      <View style={styles.radarLegend}>
        <MacroLegendItem label="Protein" current={current.protein} target={target.protein} color={BRAND_COLORS.macros.protein} />
        <MacroLegendItem label="Carbs" current={current.carbs} target={target.carbs} color={BRAND_COLORS.macros.carbs} />
        <MacroLegendItem label="Fat" current={current.fat} target={target.fat} color={BRAND_COLORS.macros.fat} />
      </View>
    </View>
  );
}

function MacroLegendItem({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" style={styles.legendLabel}>{label}</Text>
      <Text variant="caption" weight="bold" style={styles.legendValue}>
        {Math.round(current)}/{target}g
      </Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NutritionInsightsCard({
  trendData,
  target,
  currentMacros,
}: {
  trendData: DayData[];
  target: MacroTarget;
  currentMacros: { protein: number; carbs: number; fat: number };
}) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('trend');

  // Convert macro grams to calories for the stacked bar chart
  const chartData = useMemo(() =>
    trendData.map(d => ({
      ...d,
      proteinCal: Math.round(d.protein * 4),
      carbsCal: Math.round(d.carbs * 4),
      fatCal: Math.round(d.fat * 9),
    })),
    [trendData]
  );

  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as any]}>
      <View style={styles.header}>
        <Text variant="heading3" weight="bold" style={styles.title}>Insights</Text>
        <TabSelector active={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === 'trend' ? (
        <TrendChart data={chartData} target={target} />
      ) : (
        <MacroRadar
          current={currentMacros}
          target={{ protein: target.protein, carbs: target.carbs, fat: target.fat }}
        />
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    ...BENTO_CARD_STYLES,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: BRAND_COLORS.textPrimary,
  },
  chartContainer: {
    marginHorizontal: -spacing.xs,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  radarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  legendValue: {
    color: '#374151',
    fontSize: 11,
  },
  // Native macro view styles
  nativeMacroContainer: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  nativeMacroRow: {
    gap: 6,
  },
  nativeMacroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nativeMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nativeMacroLabel: {
    color: '#6B7280',
    flex: 1,
  },
  nativeMacroValue: {
    color: '#374151',
  },
  nativeMacroTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  nativeMacroFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default NutritionInsightsCard;
