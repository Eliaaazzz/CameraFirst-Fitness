import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DetectedFood } from '@/services/nutritionApi';
import { BRAND_COLORS } from '@/utils';

interface DetectedItemRowProps {
  item: DetectedFood;
  onIncrease: () => void;
  onDecrease: () => void;
}

/**
 * Displays a detected food item with +/- controls for adjusting portion size.
 * Uses intuitive units (piece, bowl, serving) from Smart Splitting AI.
 */
export function DetectedItemRow({ item, onIncrease, onDecrease }: DetectedItemRowProps) {
  // Format display based on unit type
  const getAmountDisplay = () => {
    // For grams, show "100g" format
    if (item.unit === 'g') {
      return `${item.amount}g`;
    }
    // For countable units, show "2 piece" or just "1" if quantity is 1
    return item.amount === 1 
      ? `1 ${item.unit}` 
      : `${item.amount} ${item.unit}s`;
  };

  const confidencePercent = typeof item.confidence === 'number'
    ? Math.round(item.confidence * 100)
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{item.name}</Text>
          {confidencePercent != null && (
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>{confidencePercent}% match</Text>
            </View>
          )}
        </View>

        <Text style={styles.serving}>
          {getAmountDisplay()}
          {item.unit && item.unit !== 'g' ? ' detected' : ''}
        </Text>

        <View style={styles.macroRow}>
          <View style={[styles.macroPill, styles.caloriePill]}>
            <Text style={styles.caloriePillText}>{Math.round(item.calories)} kcal</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={styles.macroText}>{Math.round(item.protein)}g protein</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={styles.macroText}>{Math.round(item.carbs)}g carbs</Text>
          </View>
        </View>
      </View>

      <View style={styles.amountControl}>
        <Pressable onPress={onDecrease} style={styles.button}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.amount}>{getAmountDisplay()}</Text>
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
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  info: {
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  confidencePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E7490',
  },
  serving: {
    fontSize: 13,
    color: '#6B7280',
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  caloriePill: {
    backgroundColor: BRAND_COLORS.primaryTint,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  caloriePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND_COLORS.primaryDark,
  },
  amountControl: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    gap: 8,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_COLORS.primaryDark,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
    color: '#111827',
  },
});
