import React, { PropsWithChildren, useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/utils';
import { useResponsiveColumns } from '@/utils/responsive';

interface ResponsiveGridProps {
  /**
   * Upper-bound number of columns per breakpoint.
   * The grid will use fewer columns if the container is too narrow.
   */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
  /**
   * Minimum width for each grid item before the grid drops a column.
   * @default 280
   */
  minItemWidth?: number;
  /**
   * Gap between grid items
   * @default spacing.md
   */
  gap?: number;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Additional styles for each grid item wrapper */
  itemStyle?: ViewStyle;
}

/**
 * Responsive grid that measures its own container width (not the viewport)
 * and computes column count from available space.
 *
 * `columns` acts as an upper bound; actual columns = min(requestedColumns,
 * floor((containerWidth + gap) / (minItemWidth + gap))), clamped >= 1.
 */
export const ResponsiveGrid = ({
  children,
  columns,
  minItemWidth = 280,
  gap = spacing.md,
  style,
  itemStyle,
}: PropsWithChildren<ResponsiveGridProps>) => {
  const requestedColumns = useResponsiveColumns(columns);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setContainerWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  // Compute actual columns from measured container width
  const fittableColumns = containerWidth > 0
    ? Math.max(1, Math.floor((containerWidth + gap) / (minItemWidth + gap)))
    : requestedColumns;
  const numColumns = Math.max(1, Math.min(requestedColumns, fittableColumns));

  // Calculate item width from measured container, not viewport
  const totalGap = gap * (numColumns - 1);
  const itemWidth = containerWidth > 0
    ? (containerWidth - totalGap) / numColumns
    : undefined; // undefined until measured — fallback to flex

  const childArray = React.Children.toArray(children);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View style={[styles.grid, { gap }]}>
        {childArray.map((child, index) => (
          <View
            key={index}
            style={[
              styles.gridItem,
              itemWidth != null
                ? { width: itemWidth, maxWidth: itemWidth }
                : { width: '100%' }, // full-width until measured
              itemStyle,
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  gridItem: {
    minWidth: 0,
  },
});
