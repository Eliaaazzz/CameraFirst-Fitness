import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii, saasShadows, spacing } from '@/utils';

export const BENTO_CARD_STYLES: ViewStyle = {
  backgroundColor: colors.light.surfaceElevated,
  borderRadius: radii['2xl'],
  padding: spacing.xl,
  borderWidth: 1,
  borderColor: colors.light.borderSubtle,
  ...saasShadows.card,
};

export const BENTO_CARD_WEB_STYLES =
  Platform.OS === 'web'
    ? ({
        boxShadow: '0 18px 36px rgba(23, 21, 17, 0.06)',
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

