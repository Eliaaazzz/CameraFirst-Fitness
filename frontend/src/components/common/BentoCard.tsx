import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/utils';

/**
 * BentoCard — Unified card system.
 *
 * Rules (Apple Health + Strava):
 * - 14px radius
 * - 1px border at 4% opacity (Apple's crisp edge trick)
 * - Perceptible shadow (not invisible)
 * - 20px padding everywhere (consistent)
 * - Pure white #FFFFFF
 */

const CARD_PADDING = 20;

export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: CARD_PADDING,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.04)',
};

export const MOBILE_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  padding: CARD_PADDING,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.04)',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  shadowOpacity: 0.06,
  elevation: 4,
};

export const BENTO_CARD_WEB_STYLES =
  Platform.OS === 'web'
    ? ({
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.05)',
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
