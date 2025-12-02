import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface Total {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionSummaryCardProps {
  total: Total;
}

export function NutritionSummaryCard({ total }: NutritionSummaryCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(100, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.title}>Total for this meal</Text>
      <Text style={styles.calories}>{Math.round(total.calories)} kcal</Text>
      <Text style={styles.macros}>
        Protein {Math.round(total.protein)}g · Carbs {Math.round(total.carbs)}g · Fat{' '}
        {Math.round(total.fat)}g
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  calories: {
    fontSize: 36,
    fontWeight: '700',
    color: '#9C27B0',
    marginBottom: 8,
  },
  macros: {
    fontSize: 14,
    color: '#999',
  },
});
