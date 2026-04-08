import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/utils';

/**
 * BentoCard — Apple Fitness / M3 card foundation.
 *
 * Rules:
 * - NO borders. Use micro-shadow only.
 * - Radius 14px (professional, not toy-like).
 * - Pure white on light gray background.
 */

export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: spacing.xl,
  borderWidth: 0,
};

export const MOBILE_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: spacing.xl,
  borderWidth: 0,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 12,
  shadowOpacity: 0.04,
  elevation: 3,
};

export const BENTO_CARD_WEB_STYLES =
  Platform.OS === 'web'
    ? ({
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
      } as any)
    : {};

interface BentoCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

export function BentoCard({ children, style, noPadding }: BentoCardProps) {
  return (
    <View style={[styles.card, BENTO_CARD_WEB_STYLES as ViewStyle, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...BENTO_CARD_STYLES,
  },
  noPadding: {
    padding: 0,
  },
});

export default BentoCard;
