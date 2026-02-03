import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Text, Card } from '@/components';
import { spacing, radii } from '@/utils';
import { getWeightStats, weightQueryKeys, type WeightStatsResponse } from '@/services/weightApi';

// Recharts - Web only
let AreaChart: any;
let Area: any;
let XAxis: any;
let YAxis: any;
let CartesianGrid: any;
let Tooltip: any;
let ResponsiveContainer: any;
let ReferenceLine: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  AreaChart = recharts.AreaChart;
  Area = recharts.Area;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  ResponsiveContainer = recharts.ResponsiveContainer;
  ReferenceLine = recharts.ReferenceLine;
}

// ============================================================================
// Types
// ============================================================================

interface WeightTrendChartProps {
  days?: number;
  targetWeight?: number;
  height?: number;
  showStats?: boolean;
}

interface ChartDataPoint {
  date: string;
  weight: number;
  bodyFat?: number;
}

// ============================================================================
// Component
// ============================================================================

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  days = 30,
  targetWeight,
  height = 200,
  showStats = true,
}) => {
  // Fetch weight stats
  const { data: stats, isLoading, error } = useQuery({
    queryKey: weightQueryKeys.stats(days),
    queryFn: () => getWeightStats(days),
  });

  // Transform data for Recharts
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!stats?.history) return [];

    // Reverse to show oldest first (left to right)
    return [...stats.history].reverse().map((log) => ({
      date: new Date(log.logDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      weight: log.weightKg,
      bodyFat: log.bodyFatPercentage,
    }));
  }, [stats?.history]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [60, 80];

    const weights = chartData.map((d) => d.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.2 || 5;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  // Trend color
  const trendColor = useMemo(() => {
    if (!stats) return '#10B981';
    switch (stats.trend) {
      case 'losing':
        return '#10B981'; // Green - good for weight loss goals
      case 'gaining':
        return '#F59E0B'; // Orange - could be good or bad
      default:
        return '#6366F1'; // Purple - stable
    }
  }, [stats?.trend]);

  // Loading state
  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={[styles.chartPlaceholder, { height }]}>
          <Text variant="caption" style={styles.placeholderText}>
            Loading weight data...
          </Text>
        </View>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card style={styles.container}>
        <View style={[styles.chartPlaceholder, { height }]}>
          <Text variant="caption" style={styles.errorText}>
            Failed to load weight data
          </Text>
        </View>
      </Card>
    );
  }

  // Empty state
  if (!chartData.length) {
    return (
      <Card style={styles.container}>
        <View style={[styles.chartPlaceholder, { height }]}>
          <Text variant="body" style={styles.emptyTitle}>
            No weight data yet
          </Text>
          <Text variant="caption" style={styles.placeholderText}>
            Start logging your weight to see trends
          </Text>
        </View>
      </Card>
    );
  }

  // Web-only chart (Recharts doesn't support React Native)
  if (Platform.OS !== 'web') {
    return (
      <Card style={styles.container}>
        {showStats && stats && <StatsHeader stats={stats} />}
        <View style={[styles.chartPlaceholder, { height }]}>
          <Text variant="caption" style={styles.placeholderText}>
            Chart available on web
          </Text>
          {stats && (
            <Text variant="heading2" style={[styles.currentWeight, { color: trendColor }]}>
              {stats.currentWeight?.toFixed(1)} kg
            </Text>
          )}
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.container}>
      {showStats && stats && <StatsHeader stats={stats} />}

      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />

            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weight']}
            />

            {/* Target weight reference line */}
            {(targetWeight || stats?.targetWeight) && (
              <ReferenceLine
                y={targetWeight || stats?.targetWeight}
                stroke="#10B981"
                strokeDasharray="5 5"
                label={{
                  value: 'Target',
                  position: 'right',
                  fill: '#10B981',
                  fontSize: 11,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="weight"
              stroke={trendColor}
              strokeWidth={2}
              fill="url(#weightGradient)"
              dot={{ fill: trendColor, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: trendColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </View>

      {stats?.progressMessage && (
        <View style={styles.messageContainer}>
          <Text variant="caption" style={styles.progressMessage}>
            {stats.progressMessage}
          </Text>
        </View>
      )}
    </Card>
  );
};

// ============================================================================
// Stats Header Sub-component
// ============================================================================

const StatsHeader = ({ stats }: { stats: WeightStatsResponse }) => {
  const changeColor = stats.weightChange
    ? stats.weightChange > 0
      ? '#F59E0B'
      : '#10B981'
    : '#6B7280';

  const changeIcon = stats.weightChange
    ? stats.weightChange > 0
      ? '↑'
      : '↓'
    : '→';

  return (
    <View style={styles.statsHeader}>
      <View style={styles.statItem}>
        <Text variant="caption" style={styles.statLabel}>
          Current
        </Text>
        <Text variant="heading3" weight="bold">
          {stats.currentWeight?.toFixed(1) || '--'} kg
        </Text>
      </View>

      <View style={styles.statItem}>
        <Text variant="caption" style={styles.statLabel}>
          Change
        </Text>
        <Text variant="body" weight="bold" style={{ color: changeColor }}>
          {changeIcon} {Math.abs(stats.weightChange || 0).toFixed(1)} kg
        </Text>
      </View>

      {stats.bmi && (
        <View style={styles.statItem}>
          <Text variant="caption" style={styles.statLabel}>
            BMI
          </Text>
          <Text variant="body" weight="bold">
            {stats.bmi.toFixed(1)}
          </Text>
        </View>
      )}

      <View style={styles.statItem}>
        <Text variant="caption" style={styles.statLabel}>
          Entries
        </Text>
        <Text variant="body" weight="bold">
          {stats.totalLogs}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#6B7280',
    marginBottom: spacing.xs,
  },
  chartContainer: {
    marginHorizontal: -spacing.sm,
  },
  chartPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  emptyTitle: {
    marginBottom: spacing.xs,
  },
  errorText: {
    color: '#EF4444',
  },
  currentWeight: {
    marginTop: spacing.sm,
  },
  messageContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressMessage: {
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WeightTrendChart;
