/**
 * MiniSparkline — Apple Health inspired 7-day trend line
 *
 * Inspired by: Apple Health weekly trend charts
 * Why this pattern: A compact sparkline communicates 7-day direction at a
 * glance without forcing the user to parse individual numbers. The auto-
 * detected color (green = improving, red = declining, orange = steady)
 * provides instant emotional signal.
 *
 * Uses react-native-svg Polyline for a lightweight, resolution-independent
 * path that scales cleanly on any device.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { Text } from '@/components/Text';
import { BRAND_COLORS } from '@/utils';

// ============================================================================
// TYPES
// ============================================================================

interface MiniSparklineProps {
  /** Array of 7 values representing the last 7 days */
  data: number[];
  /** Width of the sparkline (default: 50) */
  width?: number;
  /** Height of the sparkline (default: 20) */
  height?: number;
  /** Override color. If not provided, auto-detect: green (up), orange (flat), red (down) */
  color?: string;
  /** Show a small trend arrow next to the sparkline */
  showArrow?: boolean;
}

// ============================================================================
// TREND DETECTION
// ============================================================================

type TrendDirection = 'up' | 'down' | 'flat';

const TREND_COLORS: Record<TrendDirection, string> = {
  up: '#10B981',
  down: '#EF4444',
  flat: BRAND_COLORS.primary,
};

const TREND_ARROWS: Record<TrendDirection, string> = {
  up: '\u2191',   // ↑
  down: '\u2193', // ↓
  flat: '\u2192', // →
};

/**
 * Detect trend direction by comparing average of first 3 values
 * against average of last 3 values.
 */
function detectTrend(data: number[]): TrendDirection {
  if (data.length < 6) return 'flat';

  const firstAvg = (data[0] + data[1] + data[2]) / 3;
  const lastAvg = (data[data.length - 3] + data[data.length - 2] + data[data.length - 1]) / 3;

  // Use a 5% threshold to avoid labelling noise as a trend
  const delta = lastAvg - firstAvg;
  const threshold = Math.max(Math.abs(firstAvg) * 0.05, 0.01);

  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'flat';
}

// ============================================================================
// POINT CALCULATION
// ============================================================================

/**
 * Normalise an array of values into SVG-coordinate points
 * that fit within the given width x height.
 */
function buildPoints(data: number[], width: number, height: number): string {
  if (data.length === 0) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero for flat data

  // Horizontal padding so first/last points don't sit on the edge
  const hPad = 2;
  const vPad = 2;
  const drawWidth = width - hPad * 2;
  const drawHeight = height - vPad * 2;

  return data
    .map((value, index) => {
      const x = hPad + (index / Math.max(data.length - 1, 1)) * drawWidth;
      // SVG Y axis is inverted (0 = top), so higher values should be higher up
      const y = vPad + drawHeight - ((value - min) / range) * drawHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MiniSparkline({
  data,
  width = 50,
  height = 20,
  color,
  showArrow = false,
}: MiniSparklineProps) {
  const trend = useMemo(() => detectTrend(data), [data]);
  const resolvedColor = color ?? TREND_COLORS[trend];
  const points = useMemo(() => buildPoints(data, width, height), [data, width, height]);

  if (data.length < 2) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline
          points={points}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {showArrow && (
        <Text
          style={[styles.arrow, { color: resolvedColor }]}
        >
          {TREND_ARROWS[trend]}
        </Text>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  arrow: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});

export default MiniSparkline;
