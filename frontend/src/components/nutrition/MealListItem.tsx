import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BRAND_COLORS, radii, spacing } from '@/utils';

import { Text } from '@/components/Text';

import { MealImage } from './MealImage';

interface Meal {
  id: string;
  name: string;
  calories: number;
  imageUrl?: string;
  consumedAt: string;
}

interface MealListItemProps {
  meal: Meal;
  onPress?: () => void;
}

export function MealListItem({ meal, onPress }: MealListItemProps) {
  const time = new Date(meal.consumedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <MealImage
        imageUrl={meal.imageUrl}
        size={56}
        borderRadius={12}
        fallbackIcon="silverware-fork-knife"
        fallbackIconSize={24}
        style={{ marginRight: 12 }}
      />

      <View style={styles.content}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {meal.name}
        </Text>
        <Text variant="caption" color={BRAND_COLORS.textSecondary}>
          {time}
        </Text>
      </View>

      <Text variant="body" weight="bold" color={BRAND_COLORS.primaryDark}>
        {Math.round(meal.calories)} kcal
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: BRAND_COLORS.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: BRAND_COLORS.borderSubtle,
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: BRAND_COLORS.surfaceVariant,
    transform: [{ scale: 0.995 }],
  },
  content: {
    flex: 1,
    gap: 2,
  },
});

