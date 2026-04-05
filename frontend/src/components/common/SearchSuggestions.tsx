/**
 * SearchSuggestions - Search suggestion chips with subtle animations
 *
 * Features:
 * - Staggered fade-in entrance animation
 * - Fun icons for each suggestion category
 * - Press feedback with scale animation
 * - Haptic feedback on tap
 */

import {
  Barbell,
  BowlFood,
  CookingPot,
  Egg,
  Fire,
  Fish,
  IconProps,
  Leaf,
  Person,
  PersonArmsSpread,
  PersonSimpleRun,
  PersonSimpleWalk,
} from 'phosphor-react-native';
import type { ComponentType } from 'react';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';
import {
    BRAND_COLORS,
    MaterialDuration,
    MaterialEasing,
    radii,
    spacing,
} from '@/utils';

/** Map of MaterialCommunityIcons names to Phosphor components */
const ICON_MAP: Record<string, ComponentType<IconProps>> = {
  // Workout suggestions
  'fire': Fire,
  'yoga': PersonArmsSpread,
  'dumbbell': Barbell,
  'run-fast': PersonSimpleRun,
  'human': Person,
  'human-handsup': PersonArmsSpread,
  'walk': PersonSimpleWalk,
  'arm-flex': Barbell,
  // Recipe suggestions
  'food-apple': Leaf,
  'food-drumstick': CookingPot,
  'cup-water': CookingPot,
  'pasta': BowlFood,
  'egg-fried': Egg,
  'bowl-mix': BowlFood,
  'fish': Fish,
  'leaf': Leaf,
};

export type SuggestionItem = {
  id: string;
  label: string;
  icon: string;
  color?: string;
};

type Props = {
  suggestions: SuggestionItem[];
  onSelect: (suggestion: SuggestionItem) => void;
  title?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Individual chip component with entrance animation
const SuggestionChip = ({
  item,
  index,
  onSelect,
}: {
  item: SuggestionItem;
  index: number;
  onSelect: (item: SuggestionItem) => void;
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animation (no continuous drifting)
    const delay = index * 50;

    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: MaterialDuration.medium2,
        easing: MaterialEasing.emphasizedDecelerate,
      })
    );

    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration: MaterialDuration.medium2,
        easing: MaterialEasing.emphasizedDecelerate,
      })
    );
  }, [index, opacity, translateY]);

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(item);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const chipColor = item.color || BRAND_COLORS.primary;

  return (
    <AnimatedPressable
      style={[styles.chip, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${item.label}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${chipColor}20` }]}>
        {(() => {
          const IconComponent = ICON_MAP[item.icon] || Fire;
          return <IconComponent size={16} color={chipColor} />;
        })()}
      </View>
      <Text variant="caption" weight="medium" style={styles.chipLabel}>
        {item.label}
      </Text>
    </AnimatedPressable>
  );
};

export const SearchSuggestions: React.FC<Props> = ({
  suggestions,
  onSelect,
  title = 'Try searching for',
}) => {
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, {
      duration: MaterialDuration.medium1,
      easing: MaterialEasing.emphasizedDecelerate,
    });
  }, [titleOpacity]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {!!title && (
        <Animated.View style={titleAnimatedStyle}>
          <Text variant="caption" style={styles.title}>
            {title}
          </Text>
        </Animated.View>
      )}
      <View style={styles.chipsContainer}>
        {suggestions.map((item, index) => (
          <SuggestionChip
            key={item.id}
            item={item}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: BRAND_COLORS.textSecondary,
    textAlign: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.glassFillSubtle,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.glassStroke,
    gap: spacing.sm,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'all 0.15s ease-out',
    } as any),
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: {
    color: BRAND_COLORS.textPrimary,
  },
});
