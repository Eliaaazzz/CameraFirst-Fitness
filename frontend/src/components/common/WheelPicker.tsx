import { Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';
import { getTheme } from '@/utils/theme';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle
} from 'react-native';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
// Number of padding items at top/bottom to allow first/last items to be centered
const PADDING_ITEMS = 2;

interface WheelPickerProps {
  data: Array<{ value: number | string; label: string }>;
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  label?: string;
  unit?: string;
  style?: ViewStyle;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  data,
  selectedValue,
  onValueChange,
  label,
  unit,
  style,
}) => {  // Always use light mode
  const theme = getTheme('light');  const flatListRef = useRef<FlatList>(null);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const lastHapticIndex = useRef(-1);

  // Find initial index in the original data
  const initialIndex = data.findIndex((item) => item.value === selectedValue);
  const validInitialIndex = initialIndex >= 0 ? initialIndex : 0;

  // Scroll to selected value on mount
  useEffect(() => {
    const index = data.findIndex((item) => item.value === selectedValue);
    if (index >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: index * ITEM_HEIGHT,
          animated: false,
        });
      }, 100);
    }
  }, [selectedValue, data]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);

      // Trigger haptic on index change
      if (index !== lastHapticIndex.current && index >= 0 && index < data.length) {
        lastHapticIndex.current = index;
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
      }
    },
    [data.length]
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

      if (data[clampedIndex]) {
        onValueChange(data[clampedIndex].value);
      }
    },
    [data, onValueChange]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: { value: number | string; label: string }; index: number }) => {
      // Adjust index for padding items (first PADDING_ITEMS are empty)
      const dataIndex = index - PADDING_ITEMS;

      // For padding items, just render empty space
      if (dataIndex < 0 || dataIndex >= data.length) {
        return <View style={styles.item} />;
      }

      // Calculate opacity/scale based on scroll position
      // When scrollOffset = dataIndex * ITEM_HEIGHT, this item is centered
      const inputRange = [
        (dataIndex - 2) * ITEM_HEIGHT,
        (dataIndex - 1) * ITEM_HEIGHT,
        dataIndex * ITEM_HEIGHT,
        (dataIndex + 1) * ITEM_HEIGHT,
        (dataIndex + 2) * ITEM_HEIGHT,
      ];

      const opacity = scrollOffset.interpolate({
        inputRange,
        outputRange: [0.2, 0.5, 1, 0.5, 0.2],
        extrapolate: 'clamp',
      });

      const scale = scrollOffset.interpolate({
        inputRange,
        outputRange: [0.8, 0.9, 1.1, 0.9, 0.8],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.item,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Text 
            variant="heading2" 
            weight="bold" 
            style={[styles.itemText, { color: theme.colors.textPrimary }]}
          >
            {item.label}
          </Text>
        </Animated.View>
      );
    },
    [scrollOffset, data.length, theme.colors.textPrimary]
  );

  const keyExtractor = useCallback(
    (item: { value: number | string; label: string }, index: number) => `${item.value}-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Create padded data array with empty items for centering
  const paddedData = [
    ...Array(PADDING_ITEMS).fill(null).map((_, i) => ({ value: `pad-top-${i}`, label: '' })),
    ...data,
    ...Array(PADDING_ITEMS).fill(null).map((_, i) => ({ value: `pad-bottom-${i}`, label: '' })),
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text 
          variant="body" 
          weight="semibold" 
          style={[styles.label, { color: theme.colors.textSecondary }]}
        >
          {label}
        </Text>
      )}

      <View style={styles.pickerWrapper}>
        {/* Selection highlight - positioned at center of visible area */}
        <View 
          style={[
            styles.selectionHighlight, 
            { 
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.primary + '26' // ~15% opacity
            }
          ]} 
          pointerEvents="none" 
        />

        <Animated.FlatList
          ref={flatListRef}
          data={paddedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          // Start at the valid index, accounting for padding
          initialScrollIndex={validInitialIndex}
          getItemLayout={getItemLayout}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
            {
              useNativeDriver: true,
              listener: handleScroll,
            }
          )}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          style={styles.flatList}
          // Add padding to content so first/last real items can be centered
          contentContainerStyle={styles.contentContainer}
        />

        {unit && (
          <View style={styles.unitContainer}>
            <Text variant="body" style={[styles.unitText, { color: theme.colors.textSecondary }]}>
              {unit}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: spacing.sm,
    color: BRAND_COLORS.textSecondary,
  },
  pickerWrapper: {
    height: PICKER_HEIGHT,
    width: 120,
    position: 'relative',
  },
  flatList: {
    height: PICKER_HEIGHT,
  },
  contentContainer: {
    // No extra padding needed since we have padding items
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 28,
    color: BRAND_COLORS.textPrimary,
  },
  selectionHighlight: {
    position: 'absolute',
    // Center of 5 visible items = position 2 (0-indexed)
    // With PADDING_ITEMS at top, when scroll is at 0, first data item is at visual position 2
    top: PADDING_ITEMS * ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
    zIndex: 1,
  },
  unitContainer: {
    position: 'absolute',
    right: -44,
    top: PADDING_ITEMS * ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    zIndex: 10,
  },
  unitText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
  },
});

export default WheelPicker;
