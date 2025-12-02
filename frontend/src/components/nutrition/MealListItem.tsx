import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';

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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>🍽️</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </View>

      <Text style={styles.calories}>{Math.round(meal.calories)} kcal</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    backgroundColor: '#F5F5F5',
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: '#999',
  },
  calories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9C27B0',
  },
});
