import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, saasShadows, spacing } from '@/utils';

export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: colors.light.surfaceElevated,
  borderRadius: radii['2xl'],
  padding: spacing.xl,
  borderWidth: 1,
  borderColor: colors.light.border,
  ...saasShadows.card,
};

/** Flat Uber-style card for mobile — no border, lighter shadow, 16px radius */
export const MOBILE_CARD_STYLES: ViewStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: spacing.xl,    // 24
  borderWidth: 1,
  borderColor: 'rgba(17,17,17,0.08)',
  shadowColor: '#111111',
  shadowOffset: { width: 0, height: 10 },
  shadowRadius: 24,
  shadowOpacity: 0.06,
  elevation: 6,
};

export const BENTO_CARD_WEB_STYLES =
  Platform.OS === 'web'
    ? ({
        backgroundColor: '#FFFFFF',
        borderColor: '#E7E7E7',
        borderRadius: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)',
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
