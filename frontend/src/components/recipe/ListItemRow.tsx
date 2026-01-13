import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '../Text';

// Design tokens
const BULLET_SIZE = 8;
const STEP_NUMBER_SIZE = 28;
const ROW_GAP = 12;
const PRIMARY_COLOR = '#7C3AED';

interface BulletListItemProps {
  text: string;
  bulletColor?: string;
  style?: ViewStyle;
}

/**
 * BulletListItem - Ingredient list item with bullet point
 * - minWidth: 0 on text container to prevent overflow
 * - Proper alignment with text baseline
 */
export const BulletListItem: React.FC<BulletListItemProps> = ({
  text,
  bulletColor = PRIMARY_COLOR,
  style,
}) => {
  return (
    <View style={[styles.bulletRow, style]}>
      <View style={[styles.bullet, { backgroundColor: bulletColor }]} />
      <View style={styles.textContainer}>
        <Text style={styles.itemText} numberOfLines={3}>
          {text}
        </Text>
      </View>
    </View>
  );
};

interface NumberedListItemProps {
  number: number;
  text: string;
  numberColor?: string;
  style?: ViewStyle;
}

/**
 * NumberedListItem - Instruction step with number badge
 * - minWidth: 0 on text container to prevent overflow
 * - Fixed-size number badge that doesn't shrink
 */
export const NumberedListItem: React.FC<NumberedListItemProps> = ({
  number,
  text,
  numberColor = PRIMARY_COLOR,
  style,
}) => {
  return (
    <View style={[styles.numberedRow, style]}>
      <View style={[styles.numberBadge, { backgroundColor: numberColor }]}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Bullet list item styles
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ROW_GAP,
  },
  bullet: {
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    borderRadius: BULLET_SIZE / 2,
    marginTop: 7, // Align with text baseline
    flexShrink: 0, // Never shrink
  },
  
  // Numbered list item styles
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ROW_GAP,
  },
  numberBadge: {
    width: STEP_NUMBER_SIZE,
    height: STEP_NUMBER_SIZE,
    borderRadius: STEP_NUMBER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Never shrink
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Shared text container - CRITICAL for preventing overflow
  textContainer: {
    flex: 1,
    minWidth: 0, // Critical for text wrapping in flex row on web
  },
  itemText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1A1A2E',
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1A1A2E',
  },
});