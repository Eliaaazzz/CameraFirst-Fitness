import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DetectedFood } from '@/services/nutritionApi';

interface DetectedItemRowProps {
  item: DetectedFood;
  onIncrease: () => void;
  onDecrease: () => void;
}

export function DetectedItemRow({ item, onIncrease, onDecrease }: DetectedItemRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.nutrition}>
          {Math.round(item.calories)} kcal · {Math.round(item.protein)}g protein
        </Text>
      </View>

      <View style={styles.amountControl}>
        <Pressable onPress={onDecrease} style={styles.button}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.amount}>
          {item.amount} {item.unit}
        </Text>
        <Pressable onPress={onIncrease} style={styles.button}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  nutrition: {
    fontSize: 13,
    color: '#999',
  },
  amountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9C27B0',
  },
  amount: {
    fontSize: 15,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'center',
  },
});
