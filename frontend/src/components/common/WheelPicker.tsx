import React, { useRef, useCallback, useEffect } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  View,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Text } from '@/components';
import { BRAND_COLORS, spacing } from '@/utils';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

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
}) => {
  const flatListRef = useRef<FlatList>(null);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const lastHapticIndex = useRef(-1);

  // Find initial index
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
      // Calculate opacity based on distance from center
      const inputRange = [
        (index - 2) * ITEM_HEIGHT,
        (index - 1) * ITEM_HEIGHT,
        index * ITEM_HEIGHT,
        (index + 1) * ITEM_HEIGHT,
        (index + 2) * ITEM_HEIGHT,
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
          <Text variant="heading2" weight="bold" style={styles.itemText}>
            {item.label}
          </Text>
        </Animated.View>
      );
    },
    [scrollOffset]
  );

  const keyExtractor = useCallback(
    (item: { value: number | string; label: string }) => String(item.value),
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

  // Add padding items for centering
  const paddedData = [
    { value: 'pad-top-1', label: '' },
    { value: 'pad-top-2', label: '' },
    ...data,
    { value: 'pad-bottom-1', label: '' },
    { value: 'pad-bottom-2', label: '' },
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="body" weight="semibold" style={styles.label}>
          {label}
        </Text>
      )}

      <View style={styles.pickerWrapper}>
        {/* Selection highlight */}
        <View style={styles.selectionHighlight} pointerEvents="none" />

        <Animated.FlatList
          ref={flatListRef}
          data={paddedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
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
          contentContainerStyle={styles.contentContainer}
        />

        {unit && (
          <View style={styles.unitContainer}>
            <Text variant="body" style={styles.unitText}>
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
    paddingVertical: 0,
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
    top: ITEM_HEIGHT * 2,
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
    right: -40,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
  },
  unitText: {
    color: BRAND_COLORS.textSecondary,
    fontSize: 16,
  },
});

export default WheelPicker;
